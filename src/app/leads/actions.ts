"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/permissions";
import { getAppContext } from "@/lib/auth/context";
import { leadSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type InsertClient = {
  from(table: "leads"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

type LeadRpcClient = {
  rpc(functionName: "convert_lead_to_client", args: { target_lead_id: string }): Promise<{ error: Error | null }>;
};

function currencyToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/\D/g, "");
  return raw ? Number(raw) : 0;
}

export async function createLeadAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/leads/novo?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "clientes.criar")) {
    redirect("/leads/novo?erro=permissao");
  }

  const parsed = leadSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    interest: String(formData.get("interest") ?? "").trim(),
    funnelStage: String(formData.get("funnelStage") ?? "novo").trim(),
    probability: formData.get("probability"),
    estimatedValueCents: currencyToCents(formData.get("estimatedValue")),
    notes: String(formData.get("notes") ?? "").trim(),
    nextContactAt: String(formData.get("nextContactAt") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/leads/novo?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/leads/novo?erro=ambiente");
  }

  const insertClient = supabase as unknown as InsertClient;

  const { data: lead, error } = await insertClient
    .from("leads")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      source: parsed.data.source || null,
      interest: parsed.data.interest,
      funnel_stage: parsed.data.funnelStage,
      probability: parsed.data.probability,
      estimated_value_cents: parsed.data.estimatedValueCents,
      notes: parsed.data.notes || null,
      next_contact_at: parsed.data.nextContactAt ? new Date(parsed.data.nextContactAt).toISOString() : null,
      status: "novo",
      responsible_member_id: context.member.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/leads/novo?erro=criacao");
  }

  await insertClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_lead",
    entity_type: "lead",
    entity_id: (lead as { id: string }).id,
    metadata: { name: parsed.data.name, source: parsed.data.source ?? null },
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect("/leads?criado=1");
}

export async function convertLeadToClientAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/leads?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "clientes.criar")) {
    redirect("/leads?erro=permissao");
  }

  const leadId = String(formData.get("leadId") ?? "");

  if (!leadId) {
    redirect("/leads?erro=conversao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/leads?erro=ambiente");
  }

  const { error } = await (supabase as unknown as LeadRpcClient).rpc("convert_lead_to_client", {
    target_lead_id: leadId,
  });

  if (error) {
    redirect("/leads?erro=conversao");
  }

  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/clientes");
  redirect("/leads?convertido=1");
}
