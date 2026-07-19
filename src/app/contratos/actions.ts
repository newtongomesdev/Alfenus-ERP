"use server";

import { addMonths } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { calculateInstallmentPlan } from "@/lib/finance/installments";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { contractSchema } from "@/lib/validations/foundation";

type InsertContractClient = {
  from(table: "contracts"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  from(table: "installments"): {
    insert(values: Array<Record<string, unknown>>): PromiseLike<{ error: Error | null }>;
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

function parseCurrencyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  return Math.round(Number(normalized || "0") * 100);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addFrequency(date: Date, frequency: string, index: number) {
  if (frequency === "quinzenal") {
    const next = new Date(date);
    next.setDate(next.getDate() + index * 15);
    return next;
  }

  if (frequency === "unica") {
    return date;
  }

  return addMonths(date, index);
}

export async function createContractAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/contratos/novo?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "contratos.gerenciar")) {
    redirect("/contratos/novo?erro=permissao");
  }

  const lawFirm = context.lawFirm;
  const member = context.member;

  const parsed = contractSchema.safeParse({
    clientId: String(formData.get("clientId") ?? ""),
    legalCaseId: String(formData.get("legalCaseId") ?? ""),
    serviceDescription: String(formData.get("serviceDescription") ?? "").trim(),
    totalAmountCents: parseCurrencyToCents(formData.get("totalAmount")),
    upfrontAmountCents: parseCurrencyToCents(formData.get("upfrontAmount")),
    installmentsCount: String(formData.get("installmentsCount") ?? "1"),
    firstDueDate: String(formData.get("firstDueDate") ?? ""),
    frequency: String(formData.get("frequency") ?? "mensal"),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    status: String(formData.get("status") ?? "ativo"),
    successFee: String(formData.get("successFee") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/contratos/novo?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/contratos/novo?erro=ambiente");
  }

  const balanceCents = parsed.data.totalAmountCents - parsed.data.upfrontAmountCents;
  const insertClient = supabase as unknown as InsertContractClient;
  const { data: contract, error } = await insertClient
    .from("contracts")
    .insert({
      law_firm_id: lawFirm.id,
      client_id: parsed.data.clientId,
      legal_case_id: parsed.data.legalCaseId || null,
      service_description: parsed.data.serviceDescription,
      total_amount_cents: parsed.data.totalAmountCents,
      upfront_amount_cents: parsed.data.upfrontAmountCents,
      balance_cents: balanceCents,
      has_installments: parsed.data.installmentsCount > 1,
      installments_count: parsed.data.installmentsCount,
      first_due_date: parsed.data.firstDueDate,
      frequency: parsed.data.frequency,
      payment_method: parsed.data.paymentMethod,
      success_fee: parsed.data.successFee || null,
      responsible_member_id: member.id,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/contratos/novo?erro=criacao");
  }

  const contractId = (contract as { id: string }).id;
  const firstDueDate = new Date(`${parsed.data.firstDueDate}T00:00:00`);
  const plan = calculateInstallmentPlan({
    totalAmountCents: parsed.data.totalAmountCents,
    upfrontAmountCents: parsed.data.upfrontAmountCents,
    installments: parsed.data.installmentsCount,
  });

  const { error: installmentsError } = await insertClient.from("installments").insert(
    plan.map((installment, index) => ({
      law_firm_id: lawFirm.id,
      contract_id: contractId,
      client_id: parsed.data.clientId,
      number: installment.number,
      original_amount_cents: installment.amountCents,
      final_amount_cents: installment.amountCents,
      due_date: toDateOnly(addFrequency(firstDueDate, parsed.data.frequency, index)),
      payment_method: parsed.data.paymentMethod,
      status: installment.amountCents === 0 ? "pago" : "pendente",
    })),
  );

  if (installmentsError) {
    redirect("/contratos/novo?erro=parcelas");
  }

  await insertClient.from("audit_logs").insert({
    law_firm_id: lawFirm.id,
    actor_id: member.id,
    action: "criou_contrato",
    entity_type: "contract",
    entity_id: contractId,
    metadata: {
      client_id: parsed.data.clientId,
      total_amount_cents: parsed.data.totalAmountCents,
      installments_count: parsed.data.installmentsCount,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  redirect("/contratos?criado=1");
}

type ContractUpdateClient = {
  from(table: "contracts"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): PromiseLike<{ error: Error | null }>;
      } & PromiseLike<{ error: Error | null }>;
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

export async function updateContractAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  if (!can(context.member.role, "contratos.gerenciar")) {
    redirect("/contratos?erro=permissao");
  }

  const contractId = String(formData.get("contractId") ?? "");
  if (!contractId) {
    redirect("/contratos?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect(`/contratos/${contractId}/editar?erro=ambiente`);
  }

  const serviceDescription = String(formData.get("serviceDescription") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const status = String(formData.get("status") ?? "ativo");
  const notes = String(formData.get("notes") ?? "").trim();

  if (serviceDescription.length < 5 || paymentMethod.length < 2) {
    redirect(`/contratos/${contractId}/editar?erro=validacao`);
  }

  const mutationClient = supabase as unknown as ContractUpdateClient;
  const { error } = await mutationClient
    .from("contracts")
    .update({
      service_description: serviceDescription,
      payment_method: paymentMethod,
      status,
      notes: notes || null,
    } as Record<string, unknown>)
    .eq("id", contractId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) {
    redirect(`/contratos/${contractId}/editar?erro=atualizacao`);
  }

  await mutationClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "editou_contrato",
    entity_type: "contract",
    entity_id: contractId,
    metadata: {
      service_description: serviceDescription,
      payment_method: paymentMethod,
      status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contractId}`);
  redirect(`/contratos/${contractId}?editado=1`);
}

export async function cancelContractAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  if (!can(context.member.role, "contratos.gerenciar")) {
    redirect("/contratos?erro=permissao");
  }

  const contractId = String(formData.get("contractId") ?? "");
  if (!contractId) {
    redirect("/contratos?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/contratos?erro=ambiente");
  }

  const mutationClient = supabase as unknown as ContractUpdateClient;
  const { error } = await mutationClient
    .from("contracts")
    .update({ status: "cancelado" } as Record<string, unknown>)
    .eq("id", contractId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) {
    redirect("/contratos?erro=cancelamento");
  }

  await mutationClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_contrato",
    entity_type: "contract",
    entity_id: contractId,
    metadata: {},
  });

  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  redirect("/contratos?cancelado=1");
}
