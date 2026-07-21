"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validations/foundation";
import { checkOverduePayments } from "@/lib/alerts/check-overdue-payments";

export async function reversePaymentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "pagamentos.registrar")) redirect("/recebimentos?erro=permissao");
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!paymentId || reason.length < 3) redirect("/recebimentos?erro=estorno");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/recebimentos?erro=ambiente");

  // Read payment for audit metadata
  const { data: paymentData } = await supabase
    .from("payments")
    .select("id, amount_cents, installment_id, paid_at, reversed_at")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", paymentId)
    .maybeSingle() as { data: { id: string; amount_cents: number; installment_id: string | null; paid_at: string; reversed_at: string | null } | null; error: Error | null };

  if (!paymentData || paymentData.reversed_at) redirect("/recebimentos?erro=estorno");

  // Read installment before reversal for audit metadata
  const { data: installmentData } = await supabase
    .from("installments")
    .select("id, final_amount_cents, paid_amount_cents, status")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", paymentData.installment_id ?? "")
    .single() as { data: { id: string; final_amount_cents: number; paid_amount_cents: number; status: string } | null; error: Error | null };

  // Call reverse_payment RPC – atomic: marks payment reversed, recalculates installment + contract balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("reverse_payment", {
    p_law_firm_id: context.lawFirm.id,
    p_payment_id: paymentId,
    p_reason: reason,
  });

  if (error) {
    if (error.message?.includes("não encontrado")) redirect("/recebimentos?erro=estorno");
    redirect("/recebimentos?erro=estorno");
  }

  const rpcResult = data as { installment_status?: string } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "estornou_recebimento",
    entity_type: "payment",
    entity_id: paymentId,
    metadata: {
      reason,
      payment_amount_cents: paymentData.amount_cents,
      payment_paid_at: paymentData.paid_at,
      installment_id: paymentData.installment_id,
      installment_before: installmentData
        ? { paid_amount_cents: installmentData.paid_amount_cents, status: installmentData.status }
        : null,
      installment_after: installmentData
        ? { paid_amount_cents: Math.max(0, installmentData.paid_amount_cents - paymentData.amount_cents), status: rpcResult?.installment_status ?? "pendente" }
        : null,
    },
  });

  revalidatePath("/recebimentos");
  revalidatePath("/dashboard");
  revalidatePath("/processos");
  checkOverduePayments().catch((err) => console.error("[background] checkOverduePayments:", err));
  redirect("/recebimentos?estornado=1");
}

function parseCurrencyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

/**
 * Transactional payment registration via database RPC.
 *
 * The register_payment RPC atomically:
 *  1. Inserts the payment record
 *  2. Updates the installment (paid_amount_cents, status, etc.)
 *  3. Recalculates the contract balance_cents
 */
export async function registerPaymentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/recebimentos?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "pagamentos.registrar")) redirect("/recebimentos?erro=permissao");

  const parsed = paymentSchema.safeParse({
    installmentId: String(formData.get("installmentId") ?? ""),
    amountCents: parseCurrencyToCents(formData.get("amount")),
    paidAt: String(formData.get("paidAt") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    discountCents: parseCurrencyToCents(formData.get("discount")),
    fineCents: parseCurrencyToCents(formData.get("fine")),
    interestCents: parseCurrencyToCents(formData.get("interest")),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) redirect("/recebimentos?erro=validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/recebimentos?erro=ambiente");

  const paidAt = `${parsed.data.paidAt}T12:00:00.000Z`;

  // Call register_payment RPC – atomic: inserts payment, updates installment, recalculates contract balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("register_payment", {
    p_law_firm_id: context.lawFirm.id,
    p_installment_id: parsed.data.installmentId,
    p_amount_cents: parsed.data.amountCents,
    p_payment_method: parsed.data.paymentMethod,
    p_paid_at: paidAt,
    p_discount_cents: parsed.data.discountCents,
    p_fine_cents: parsed.data.fineCents,
    p_interest_cents: parsed.data.interestCents,
    p_notes: parsed.data.notes || null,
    p_registered_by: null,
  });

  if (error) {
    console.error("[recebimentos] RPC register_payment error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      lawFirmId: context.lawFirm.id,
      installmentId: parsed.data.installmentId,
      amountCents: parsed.data.amountCents,
    });
    // Handle duplicate detection
    if (error.message?.includes("duplicado")) {
      redirect("/recebimentos?duplicado=1");
    }
    // Pass specific error info when it's a permission or validation issue from the RPC
    if (error.message?.includes("Permissão") || error.message?.includes("não pertence")) {
      redirect("/recebimentos?erro=permissao_rpc");
    }
    if (error.message?.includes("não encontrada")) {
      redirect("/recebimentos?erro=parcela_nao_encontrada");
    }
    if (error.message?.includes("excede o saldo")) {
      redirect("/recebimentos?erro=saldo_insuficiente");
    }
    if (error.message?.includes("não autenticado")) {
      redirect("/recebimentos?erro=nao_autenticado");
    }
    // Generic RPC error — include the error message for debugging
    const encodedMsg = encodeURIComponent(error.message ?? "Erro desconhecido no RPC");
    redirect(`/recebimentos?erro=register&msg=${encodedMsg}`);
  }

  const rpcResult = data as { payment_id?: string; installment_status?: string } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "registrou_pagamento",
    entity_type: "payment",
    entity_id: rpcResult?.payment_id ?? null,
    metadata: { installment_id: parsed.data.installmentId, amount_cents: parsed.data.amountCents, status: rpcResult?.installment_status ?? "pendente" },
  });
  revalidatePath("/dashboard");
  revalidatePath("/recebimentos");
  revalidatePath("/contratos");
  revalidatePath("/processos");
  checkOverduePayments().catch((err) => console.error("[background] checkOverduePayments:", err));
  redirect("/recebimentos?registrado=1");
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function createQuickChargeAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/recebimentos/nova?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "contratos.gerenciar")) redirect("/recebimentos/nova?erro=permissao");

  const clientId = String(formData.get("clientId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const amountCents = parseCurrencyToCents(formData.get("amount"));

  const paymentType = String(formData.get("paymentType") ?? "avista");
  const installmentsCountRaw = Number(formData.get("installmentsCount") ?? "1");
  const installmentsCount = paymentType === "parcelado" ? Math.max(2, installmentsCountRaw) : 1;
  const notifyWhatsapp = formData.get("notifyWhatsapp") === "on";
  const notifyEmail = formData.get("notifyEmail") === "on";

  if (!clientId || description.length < 3 || !dueDate || paymentMethod.length < 2 || amountCents <= 0) {
    redirect("/recebimentos/nova?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/recebimentos/nova?erro=ambiente");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", clientId)
    .maybeSingle();

  if (!client) redirect("/recebimentos/nova?erro=cliente");

  const hasInstallments = paymentType === "parcelado";
  const frequency = hasInstallments ? "mensal" : "unica";
  
  const notesParts = [
    "Cobrança rápida criada em recebimentos.",
    notifyWhatsapp ? "Enviar via WhatsApp" : null,
    notifyEmail ? "Enviar via E-mail" : null
  ].filter(Boolean).join(" | ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const database = supabase as any;
  const { data: contract, error: contractError } = await database
    .from("contracts")
    .insert({
      law_firm_id: context.lawFirm.id,
      client_id: clientId,
      service_description: description,
      total_amount_cents: amountCents,
      upfront_amount_cents: 0,
      balance_cents: amountCents,
      has_installments: hasInstallments,
      installments_count: installmentsCount,
      first_due_date: dueDate,
      frequency: frequency,
      payment_method: paymentMethod,
      responsible_member_id: context.member.id,
      status: "ativo",
      notes: notesParts,
    })
    .select("id")
    .single();

  if (contractError || !contract) redirect("/recebimentos/nova?erro=criacao");

  // Calculate installment values
  const baseAmount = Math.floor(amountCents / installmentsCount);
  const remainder = amountCents - (baseAmount * installmentsCount);

  const installmentsData = [];
  for (let i = 1; i <= installmentsCount; i++) {
    const finalAmount = baseAmount + (i === 1 ? remainder : 0);
    const dueDateForInstallment = addMonths(dueDate, i - 1);
    
    installmentsData.push({
      law_firm_id: context.lawFirm.id,
      contract_id: contract.id,
      client_id: clientId,
      number: i,
      original_amount_cents: finalAmount,
      final_amount_cents: finalAmount,
      due_date: dueDateForInstallment,
      payment_method: paymentMethod,
      status: "pendente",
    });
  }

  const { error: installmentError } = await database.from("installments").insert(installmentsData);

  if (installmentError) {
    await database.from("contracts").delete().eq("law_firm_id", context.lawFirm.id).eq("id", contract.id);
    redirect("/recebimentos/nova?erro=criacao");
  }

  await database.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_cobranca_rapida",
    entity_type: "contract",
    entity_id: contract.id,
    metadata: { 
      client_id: clientId, 
      amount_cents: amountCents, 
      due_date: dueDate, 
      payment_method: paymentMethod,
      installments_count: installmentsCount,
      notify_whatsapp: notifyWhatsapp,
      notify_email: notifyEmail
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath("/recebimentos");
  redirect("/recebimentos?cobranca=1");
}

export async function reverseInstallmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "pagamentos.registrar")) redirect("/recebimentos?erro=permissao");

  const installmentId = String(formData.get("installmentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!installmentId || reason.length < 3) redirect("/recebimentos?erro=estorno");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/recebimentos?erro=ambiente");

  // Find the latest non-reversed payment for this installment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestPayments } = await (supabase as any)
    .from("payments")
    .select("id, amount_cents, installment_id, paid_at, reversed_at")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("installment_id", installmentId)
    .limit(10);

  const payments = (latestPayments ?? []) as Array<{
    id: string;
    amount_cents: number;
    installment_id: string;
    paid_at: string;
    reversed_at: string | null;
  }>;

  const current = payments.find((p) => !p.reversed_at);
  if (!current) redirect("/recebimentos?erro=estorno");

  // Read installment before reversal for audit metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: installmentData } = await (supabase as any)
    .from("installments")
    .select("id, final_amount_cents, paid_amount_cents, status")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", installmentId)
    .single() as { data: { id: string; final_amount_cents: number; paid_amount_cents: number; status: string } | null; error: Error | null };

  // Call reverse_payment RPC — atomic: marks payment reversed, recalculates installment + contract balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("reverse_payment", {
    p_law_firm_id: context.lawFirm.id,
    p_payment_id: current.id,
    p_reason: reason,
  });

  if (error) {
    if (error.message?.includes("não encontrado")) redirect("/recebimentos?erro=estorno");
    redirect("/recebimentos?erro=estorno");
  }

  const rpcResult = data as { installment_status?: string } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "estornou_recebimento",
    entity_type: "payment",
    entity_id: current.id,
    metadata: {
      reason,
      payment_amount_cents: current.amount_cents,
      payment_paid_at: current.paid_at,
      installment_id: installmentId,
      installment_before: installmentData
        ? { paid_amount_cents: installmentData.paid_amount_cents, status: installmentData.status }
        : null,
      installment_after: installmentData
        ? { paid_amount_cents: Math.max(0, installmentData.paid_amount_cents - current.amount_cents), status: rpcResult?.installment_status ?? "pendente" }
        : null,
    },
  });

  revalidatePath("/recebimentos");
  revalidatePath("/dashboard");
  revalidatePath("/processos");
  checkOverduePayments().catch((err) => console.error("[background] checkOverduePayments:", err));
  redirect("/recebimentos?estornado=1");
}
