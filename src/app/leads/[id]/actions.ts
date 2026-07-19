"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/permissions";
import { getAppContext } from "@/lib/auth/context";
import { leadSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type LeadReadClient = {
  from(table: "leads"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null; error: Error | null }> };
      };
    };
  };
};

type LeadUpdateClient = {
  from(table: "leads"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

function currencyToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/\D/g, "");
  return raw ? Number(raw) : 0;
}

export type LeadData = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  interest: string;
  funnel_stage: string;
  probability: number;
  estimated_value_cents: number;
  next_contact_at: string | null;
  notes: string | null;
  status: string;
  responsible_member_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getLeadById(lawFirmId: string, leadId: string): Promise<LeadData | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await (supabase as unknown as LeadReadClient)
    .from("leads")
    .select("id, name, phone, whatsapp, email, source, interest, funnel_stage, probability, estimated_value_cents, next_contact_at, notes, status, responsible_member_id, created_at, updated_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", leadId)
    .maybeSingle();
  return (data as LeadData | null) ?? null;
}

export async function updateLeadAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "clientes.editar")) redirect("/leads?erro=permissao");

  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) redirect("/leads?erro=validacao");

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

  if (!parsed.success) redirect(`/leads/${leadId}/editar?erro=validacao`);

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/leads/${leadId}/editar?erro=ambiente`);

  const client = supabase as unknown as LeadUpdateClient;
  const { error } = await client
    .from("leads")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", leadId);

  if (error) redirect(`/leads/${leadId}/editar?erro=atualizacao`);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "atualizou_lead",
    entity_type: "lead",
    entity_id: leadId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect("/leads?salvo=1");
}

export async function deleteLeadAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "clientes.editar")) redirect("/leads?erro=permissao");

  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) redirect("/leads?erro=validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/leads?erro=ambiente");

  const client = supabase as unknown as LeadUpdateClient;
  const { error } = await client
    .from("leads")
    .update({ status: "perdido", updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", leadId);

  if (error) redirect("/leads?erro=atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "arquivou_lead",
    entity_type: "lead",
    entity_id: leadId,
    metadata: {},
  });

  revalidatePath("/leads");
  redirect("/leads?arquivado=1");
}
