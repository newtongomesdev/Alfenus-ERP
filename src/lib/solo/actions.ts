
"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import type { InterfaceMode, OperationProfile, ModuleKey } from "./types";
import { soloCaseInputSchema, type SoloCaseInput } from "./schemas";
import { switchInterfaceMode as switchMode } from "./service";

// Helper: cast supabase table query builder to any for tables not yet in generated types.
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

type SoloCaseRpcResult = {
  client_id: string;
  legal_case_id: string;
  contract_id: string | null;
  deadline_id: string | null;
};

const soloCaseErrorMessages: Record<string, string> = {
  SOLO_CASE_AUTH_REQUIRED: "Sua sessão expirou. Entre novamente para salvar o caso.",
  SOLO_CASE_PERMISSION_DENIED: "Seu perfil não pode criar casos.",
  SOLO_CASE_CLIENT_NOT_FOUND: "O cliente selecionado não pertence ao escritório.",
  SOLO_CASE_CLIENT_NAME_REQUIRED: "Informe o cliente.",
  SOLO_CASE_CASE_FIELDS_REQUIRED: "Informe o nome e o assunto do caso.",
  SOLO_CASE_CASE_KIND_INVALID: "Selecione um tipo de caso válido.",
  SOLO_CASE_CASE_NUMBER_REQUIRED: "Informe o número do processo judicial.",
  SOLO_CASE_CONTRACT_FIELDS_REQUIRED: "Revise os dados do contrato opcional.",
  SOLO_CASE_DEADLINE_FIELDS_REQUIRED: "Revise os dados do prazo opcional.",
  SOLO_CASE_IDEMPOTENCY_KEY_REQUIRED: "Não foi possível identificar esta tentativa. Tente novamente.",
  SOLO_CASE_IDEMPOTENCY_CONFLICT: "Esta tentativa já foi usada com outros dados. Recarregue o formulário e tente novamente.",
};

export async function createSoloCaseAction(input: SoloCaseInput, idempotencyKey: string): Promise<
  { ok: true; legalCaseId: string } | { ok: false; error: string }
> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return { ok: false, error: "Entre novamente para salvar o caso." };
  }
  if (!can(context.member.role, "processos.criar") || !can(context.member.role, "clientes.criar")) {
    return { ok: false, error: "Seu perfil não pode criar casos." };
  }

  const parsed = soloCaseInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "O banco de dados está indisponível." };

  const data = parsed.data;
  const inputHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const { data: result, error } = await (supabase as any).rpc("create_solo_case_idempotent", {
    p_idempotency_key: idempotencyKey,
    p_input_hash: inputHash,
    p_existing_client_id: data.existingClientId,
    p_client_name: data.existingClientId ? null : data.clientName,
    p_client_phone: data.existingClientId ? null : data.clientPhone || null,
    p_client_email: data.existingClientId ? null : data.clientEmail || null,
    p_client_document: data.existingClientId ? null : data.clientDocument || null,
    p_client_interest_area: data.existingClientId ? null : data.clientInterestArea || null,
    p_case_title: data.caseTitle,
    p_case_kind: data.caseKind,
    p_case_number: data.caseNumber || null,
    p_action_type: data.actionType,
    p_opposing_party: data.opposingParty || null,
    p_notes: data.notes || null,
    p_contract_service_description: data.createContract ? data.contractServiceDescription : null,
    p_contract_total_amount_cents: data.createContract ? data.contractTotalAmountCents : null,
    p_contract_upfront_amount_cents: data.createContract ? data.contractUpfrontAmountCents : 0,
    p_contract_installments_count: data.createContract ? data.contractInstallmentsCount : 1,
    p_contract_first_due_date: data.createContract ? data.contractFirstDueDate : null,
    p_contract_payment_method: data.createContract ? data.contractPaymentMethod : null,
    p_deadline_title: data.createDeadline ? data.deadlineTitle : null,
    p_deadline_date: data.createDeadline ? data.deadlineDate : null,
    p_deadline_priority: data.deadlinePriority,
  });

  if (error) {
    if (error.code === "PGRST202" || error.message.includes("create_solo_case")) {
      return { ok: false, error: "O cadastro simplificado ainda está sendo preparado. Use Processos para cadastrar este caso por enquanto." };
    }
    const knownError = Object.entries(soloCaseErrorMessages).find(([code]) => error.message.includes(code));
    return { ok: false, error: knownError?.[1] ?? "Não foi possível salvar o caso. Tente novamente." };
  }

  const row = Array.isArray(result) ? result[0] : result;
  if (!row?.legal_case_id) return { ok: false, error: "O caso não foi criado. Tente novamente." };

  revalidatePath("/meu-dia");
  revalidatePath("/clientes");
  revalidatePath("/processos");
  revalidatePath("/contratos");
  revalidatePath("/prazos");
  revalidatePath("/recebimentos");
  return { ok: true, legalCaseId: (row as SoloCaseRpcResult).legal_case_id };
}

export async function getCurrentInterfaceModeAction(): Promise<InterfaceMode> {
  const ctx = await getAppContext();
  return ctx.status === "ready" && ctx.lawFirm
    ? (ctx.lawFirm.interfaceMode ?? "completa")
    : "completa";
}

// ── Switch interface mode ───────────────────────────────────

export async function switchInterfaceModeAction(newMode: InterfaceMode): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) return { ok: false, error: "Não autenticado" };
  if (!can(ctx.member.role, "configuracoes.administrar")) return { ok: false, error: "Somente administradores podem trocar o modo da interface." };

  try {
    await switchMode(ctx.lawFirm.id, newMode);
    revalidatePath("/dashboard");
    revalidatePath("/configuracoes");
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (err) {
    console.error("[solo/interface-mode] falha ao trocar modo", err);
    return { ok: false, error: "Não foi possível trocar o modo da interface." };
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
