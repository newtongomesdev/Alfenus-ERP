/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import type { InterfaceMode, OperationProfile, ModuleKey } from "./types";
import { switchInterfaceMode as switchMode } from "./service";

// Helper: cast supabase table query builder to any for tables not yet in generated types.
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Switch interface mode ───────────────────────────────────

export async function switchInterfaceModeAction(newMode: InterfaceMode): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  try {
    await switchMode(ctx.lawFirm.id, newMode);
    revalidatePath("/dashboard");
    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Set operation profile ───────────────────────────────────

export async function setOperationProfileAction(profile: OperationProfile): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const isSolo = profile === "advogado_independente";
  const { error } = await tbl(supabase, "law_firms")
    .update({ operation_profile: profile, interface_mode: isSolo ? "simples" : "completa", updated_at: new Date().toISOString() })
    .eq("id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/configuracoes");
  return { ok: true };
}

// ── Enable/disable module ───────────────────────────────────

export async function toggleModuleAction(moduleKey: ModuleKey, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data } = await tbl(supabase, "law_firms").select("enabled_modules, hidden_modules").eq("id", ctx.lawFirm.id).single();
  if (!data) return { ok: false, error: "Escritório não encontrado" };

  const enabledSet = new Set<string>((data.enabled_modules as string[]) ?? []);
  const hiddenSet = new Set<string>((data.hidden_modules as string[]) ?? []);
  if (enabled) { enabledSet.add(moduleKey); hiddenSet.delete(moduleKey); }
  else { enabledSet.delete(moduleKey); hiddenSet.add(moduleKey); }

  const { error } = await tbl(supabase, "law_firms")
    .update({ enabled_modules: Array.from(enabledSet), hidden_modules: Array.from(hiddenSet), updated_at: new Date().toISOString() })
    .eq("id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/configuracoes");
  return { ok: true };
}

// ── Mark setup as completed ─────────────────────────────────

export async function completeSetupAction(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "law_firms")
    .update({ setup_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── Delete all demo data ────────────────────────────────────

export async function clearDemoDataAction(): Promise<{ ok: boolean; deletedCount?: number; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data: records } = await tbl(supabase, "demo_data_records")
    .select("entity_type, entity_id").eq("law_firm_id", ctx.lawFirm.id);

  if (!records || records.length === 0) return { ok: true, deletedCount: 0 };

  let deletedCount = 0;
  const tableMap: Record<string, string> = {
    client: "clients", legal_case: "legal_cases", contract: "contracts",
    installment: "installments", deadline: "deadlines", task: "tasks",
    document: "documents", follow_up: "follow_ups",
  };

  for (const rec of records) {
    const table = tableMap[(rec as any).entity_type];
    if (table) {
      await supabase.from(table).delete().eq("id", (rec as any).entity_id).eq("law_firm_id", ctx.lawFirm.id);
      deletedCount++;
    }
  }

  await tbl(supabase, "demo_data_records").delete().eq("law_firm_id", ctx.lawFirm.id);
  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  revalidatePath("/processos");
  return { ok: true, deletedCount };
}

// ── Register follow-up ──────────────────────────────────────

export async function createFollowUpAction(formData: {
  client_id: string; legal_case_id?: string; follow_up_type: string;
  title: string; description?: string; scheduled_date: string;
  scheduled_time?: string; priority?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data, error } = await tbl(supabase, "follow_ups").insert({
    law_firm_id: ctx.lawFirm.id, client_id: formData.client_id,
    legal_case_id: formData.legal_case_id || null, follow_up_type: formData.follow_up_type,
    title: formData.title, description: formData.description || null,
    scheduled_date: formData.scheduled_date, scheduled_time: formData.scheduled_time || null,
    responsible_member_id: ctx.member?.id, priority: formData.priority || "normal", status: "pendente",
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meu-dia"); revalidatePath("/agenda");
  return { ok: true, id: (data as any).id };
}

// ── Mark follow-up as completed ─────────────────────────────

export async function completeFollowUpAction(followUpId: string, result?: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "follow_ups")
    .update({ status: "realizado", result: result || null, updated_at: new Date().toISOString() })
    .eq("id", followUpId).eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meu-dia"); revalidatePath("/agenda");
  return { ok: true };
}

// ── Create intake form ──────────────────────────────────────

export async function createIntakeFormAction(formData: {
  consultation_reason: string; practice_area?: string; problem_summary?: string;
  urgency?: string; has_active_process?: boolean; process_number?: string;
  client_objective?: string; perceived_risks?: string; private_notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data, error } = await tbl(supabase, "intake_forms").insert({
    law_firm_id: ctx.lawFirm.id, consultation_reason: formData.consultation_reason,
    practice_area: formData.practice_area || null, problem_summary: formData.problem_summary || null,
    urgency: formData.urgency || "normal", has_active_process: formData.has_active_process || false,
    process_number: formData.process_number || null, client_objective: formData.client_objective || null,
    perceived_risks: formData.perceived_risks || null, private_notes: formData.private_notes || null,
    responsible_member_id: ctx.member?.id, status: "rascunho",
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/atendimentos");
  return { ok: true, id: (data as any).id };
}

// ── Create fee proposal ─────────────────────────────────────

export async function createFeeProposalAction(formData: {
  client_id: string; legal_case_id?: string; service_description: string;
  scope?: string; total_amount_cents: number; upfront_amount_cents?: number;
  installments_count?: number; success_fee_percentage?: number;
  included_expenses?: string; excluded_expenses?: string;
  validity_days?: number; charging_model?: string; observations?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const total = formData.total_amount_cents;
  const upfront = formData.upfront_amount_cents || 0;
  const balance = total - upfront;
  const installments = formData.installments_count || 1;
  const installmentValue = installments > 0 ? Math.floor(balance / installments) : balance;

  const { data, error } = await tbl(supabase, "fee_proposals").insert({
    law_firm_id: ctx.lawFirm.id, client_id: formData.client_id,
    legal_case_id: formData.legal_case_id || null, service_description: formData.service_description,
    scope: formData.scope || null, total_amount_cents: total, upfront_amount_cents: upfront,
    balance_cents: balance, installments_count: installments, installment_value_cents: installmentValue,
    success_fee_percentage: formData.success_fee_percentage || null,
    included_expenses: formData.included_expenses || null, excluded_expenses: formData.excluded_expenses || null,
    validity_days: formData.validity_days || 15, charging_model: formData.charging_model || "fixo",
    observations: formData.observations || null, responsible_member_id: ctx.member?.id, status: "rascunho",
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/propostas");
  return { ok: true, id: (data as any).id };
}

// ── Create receipt ──────────────────────────────────────────

export async function createReceiptAction(formData: {
  client_id: string; contract_id?: string; legal_case_id?: string; payment_id?: string;
  client_name: string; client_document?: string; service_description: string;
  amount_cents: number; payment_method: string; payment_date: string; observations?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data: profile } = await tbl(supabase, "professional_profiles")
    .select("professional_name, oab_number, oab_state")
    .eq("law_firm_id", ctx.lawFirm.id).single();

  const { data, error } = await tbl(supabase, "receipts").insert({
    law_firm_id: ctx.lawFirm.id, client_id: formData.client_id,
    contract_id: formData.contract_id || null, legal_case_id: formData.legal_case_id || null,
    payment_id: formData.payment_id || null,
    lawyer_name: profile?.professional_name || ctx.member?.name || "",
    oab_number: profile?.oab_number || null, oab_state: profile?.oab_state || null,
    client_name: formData.client_name, client_document: formData.client_document || null,
    service_description: formData.service_description, amount_cents: formData.amount_cents,
    payment_method: formData.payment_method, payment_date: formData.payment_date,
    observations: formData.observations || null, status: "emitido",
  }).select("id, receipt_number").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/recibos");
  return { ok: true, id: (data as any).id };
}

// ── Cancel receipt ──────────────────────────────────────────

export async function cancelReceiptAction(receiptId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "receipts")
    .update({ status: "cancelado", cancellation_reason: reason, canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", receiptId).eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/recibos");
  return { ok: true };
}

// ── Save professional profile ───────────────────────────────

export async function saveProfessionalProfileAction(formData: {
  professional_name: string;
  oab_number?: string;
  oab_state?: string;
  cnpj?: string;
  cpf?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bio?: string;
  specializations?: string[];
  primary_color?: string;
  secondary_color?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "professional_profiles").upsert({
    law_firm_id: ctx.lawFirm.id,
    professional_name: formData.professional_name,
    oab_number: formData.oab_number || null,
    oab_state: formData.oab_state || null,
    cnpj: formData.cnpj || null,
    cpf: formData.cpf || null,
    address: formData.address || null,
    phone: formData.phone || null,
    email: formData.email || null,
    website: formData.website || null,
    bio: formData.bio || null,
    specializations: formData.specializations || [],
    primary_color: formData.primary_color || "#2563eb",
    secondary_color: formData.secondary_color || "#64748b",
    updated_at: new Date().toISOString(),
  }, { onConflict: "law_firm_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/configuracoes/perfil-profissional");
  return { ok: true };
}
