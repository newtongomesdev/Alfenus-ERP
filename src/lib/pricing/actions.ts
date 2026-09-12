"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import { pricingScenarioSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import {
  calculateAndCreateVersion,
  recalculatePricingScenario,
  activatePricingVersion,
  duplicatePricingScenario,
  archivePricingScenario,
  restorePricingScenario,
  updatePricingScenarioMetadata,
  comparePricingVersionsService,
} from "./service";
import { generateInputHash, validateIdempotencyKey } from "./idempotency";
import { PRICING_CALCULATION_ENGINE_VERSION, PRICING_SCHEMA_VERSION } from "./calculation-types";

// ── Roles permitidos para operações de pricing ─────────────
const PRICING_WRITER_ROLES = new Set([
  "proprietario",
  "administrador",
  "advogado",
]);

function requirePricingWriteRole(
  role: string
): { ok: true } | { ok: false; error: string } {
  if (!PRICING_WRITER_ROLES.has(role)) {
    return {
      ok: false,
      error: "Sem permissão. Apenas proprietário, administrador ou advogado podem operar o simulador.",
    };
  }
  return { ok: true };
}

async function assistedPricingAccessBlocked(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  lawFirmId: string,
): Promise<boolean> {
  if (!supabase) return false;
  if (typeof (supabase as { rpc?: unknown }).rpc !== "function") return false;
  const { data, error } = await supabase.rpc(
    "is_active_assisted_support_session",
    { p_law_firm_id: lawFirmId },
  );
  return !error && data === true;
}

function safePricingError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/PRICING_PERMISSION_DENIED|42501|Sem permiss/i.test(message)) return "PRICING_PERMISSION_DENIED";
  if (/PRICING_ASSISTED_ACCESS_BLOCKED/i.test(message)) return "PRICING_ASSISTED_ACCESS_BLOCKED";
  if (/arquivad/i.test(message)) return "PRICING_SCENARIO_ARCHIVED";
  if (/não encontrado|nao encontrado/i.test(message)) return "PRICING_SCENARIO_NOT_FOUND";
  if (/mem[oó]ria|sens[ií]vel/i.test(message)) return "PRICING_SENSITIVE_DATA_DENIED";
  return "PRICING_OPERATION_FAILED";
}

// ── Criar cenário ──────────────────────────────────────────
export async function createPricingScenarioAction(input: {
  name: string;
  description?: string;
  service_id?: string;
  lead_id?: string;
  client_id?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = pricingScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }
  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  // Validar serviço se fornecido
  if (input.service_id) {
    const { data: service } = await supabase
      .from("service_catalog")
      .select("id")
      .eq("id", input.service_id)
      .single();

    if (!service) {
      return { ok: false, error: "Serviço não encontrado" };
    }
  }

  const { data, error } = await supabase
    .from("pricing_scenarios")
    .insert({
      law_firm_id: ctx.lawFirm.id,
      created_by: ctx.member.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: "draft",
      service_id: parsed.data.service_id ?? null,
      lead_id: parsed.data.lead_id ?? null,
      client_id: parsed.data.client_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar cenário:", error.message);
    return { ok: false, error: safePricingError(error) };
  }

  // Registrar evento
  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: ctx.lawFirm.id,
    pricing_scenario_id: data.id,
    event_type: "scenario_created",
    actor_id: ctx.member.id,
    safe_metadata: {
      service_id: input.service_id ?? null,
    },
  });

  revalidatePath("/simulador");
  return { ok: true, id: data.id };
}

// ── Atualizar cenário (com optimistic locking) ──────────────
export async function updatePricingScenarioAction(
  scenarioId: string,
  input: {
    name?: string;
    description?: string;
    expected_updated_at?: string;
  }
): Promise<{ ok: boolean; error?: string; updated_at?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    await updatePricingScenarioMetadata(supabase, ctx.lawFirm.id, ctx.member.id, {
      scenarioId,
      expectedUpdatedAt: input.expected_updated_at ?? new Date().toISOString(),
      name: input.name,
      description: input.description,
    });

    revalidatePath("/simulador");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Arquivar cenário ───────────────────────────────────────
export async function archivePricingScenarioAction(
  scenarioId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    await archivePricingScenario(supabase, ctx.lawFirm.id, ctx.member.id, scenarioId);
    revalidatePath("/simulador");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Calcular e criar versão ─────────────────────────────
export async function calculateAndCreatePricingVersionAction(input: {
  scenario_id: string;
  scenario_type: string;
  fee_type: string;
  fee_value_cents: number;
  currency: string;
  payment_method: string;
  installments: number;
  success_fee_rate_bps?: number;
  recurring_months?: number;
  billing_frequency?: string;
  force_new_version?: boolean;
  activate?: boolean;
  idempotency_key?: string;
  expected_updated_at?: string;
}): Promise<{
  ok: boolean;
  version_id?: string;
  version_number?: number;
  is_duplicate?: boolean;
  is_idempotent?: boolean;
  activated?: boolean;
  error?: string;
}> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    // Determinar idempotencyKey e inputHash
    const idempotencyKey = input.idempotency_key;
    let inputHash: string | undefined;

    if (idempotencyKey) {
      // Validar chave fornecida pelo cliente
      if (!validateIdempotencyKey(idempotencyKey)) {
        return { ok: false, error: "Chave de idempotência inválida." };
      }
      // Gerar hash do input (inclui engineVersion e schemaVersion)
      inputHash = generateInputHash({
        scenarioType: input.scenario_type,
        feeType: input.fee_type,
        feeValueCents: input.fee_value_cents,
        currency: input.currency,
        paymentMethod: input.payment_method,
        installments: input.installments,
        successFeeRateBps: input.success_fee_rate_bps ?? null,
        recurringMonths: input.recurring_months ?? null,
        billingFrequency: input.billing_frequency ?? null,
        engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
        schemaVersion: PRICING_SCHEMA_VERSION,
      });
    } else {
      // Chave obrigatória — não permitir sem chorda de idempotência
      return { ok: false, error: "Chave de idempotência (idempotency_key) é obrigatória." };
    }

    const result = await calculateAndCreateVersion(
      supabase,
      ctx.lawFirm.id,
      ctx.member.id,
      {
        scenarioId: input.scenario_id,
        scenarioType: input.scenario_type,
        feeType: input.fee_type,
        feeValueCents: input.fee_value_cents,
        currency: input.currency,
        paymentMethod: input.payment_method,
        installments: input.installments,
        successFeeRateBps: input.success_fee_rate_bps,
        recurringMonths: input.recurring_months,
        billingFrequency: input.billing_frequency,
        forceNewVersion: input.force_new_version,
        activate: input.activate,
        idempotencyKey,
        inputHash,
        expectedUpdatedAt: input.expected_updated_at,
      },
    );

    revalidatePath("/simulador");
    revalidatePath(`/simulador/${input.scenario_id}`);
    return {
      ok: true,
      version_id: result.versionId,
      version_number: result.versionNumber,
      is_duplicate: result.isDuplicate,
      is_idempotent: result.isIdempotent,
      activated: result.activated,
    };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Recalcular cenário ─────────────────────────────────
export async function recalculatePricingScenarioAction(
  scenarioId: string,
  activate?: boolean,
): Promise<{
  ok: boolean;
  version_id?: string;
  version_number?: number;
  error?: string;
}> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    const result = await recalculatePricingScenario(
      supabase,
      ctx.lawFirm.id,
      ctx.member.id,
      scenarioId,
      activate,
    );

    revalidatePath("/simulador");
    revalidatePath(`/simulador/${scenarioId}`);
    return {
      ok: true,
      version_id: result.versionId,
      version_number: result.versionNumber,
    };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Comparar versões ───────────────────────────────────
export async function comparePricingVersionsAction(
  scenarioId: string,
  versionIdA: string,
  versionIdB: string,
): Promise<{
  ok: boolean;
  comparison?: Record<string, unknown>;
  error?: string;
}> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }
  if (ctx.member.role !== "proprietario") {
    return { ok: false, error: "PRICING_PERMISSION_DENIED" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    const result = await comparePricingVersionsService(
      supabase,
      ctx.lawFirm.id,
      ctx.member.id,
      scenarioId,
      versionIdA,
      versionIdB,
    );

    return {
      ok: true,
      comparison: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Restaurar cenário ──────────────────────────────────────
export async function restorePricingScenarioAction(
  scenarioId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    await restorePricingScenario(supabase, ctx.lawFirm.id, ctx.member.id, scenarioId);
    revalidatePath("/simulador");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Duplicar cenário ───────────────────────────────────────
export async function duplicatePricingScenarioAction(
  sourceScenarioId: string,
  newName?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    const result = await duplicatePricingScenario(
      supabase,
      ctx.lawFirm.id,
      ctx.member.id,
      sourceScenarioId,
      newName ?? "Cenário duplicado",
    );

    revalidatePath("/simulador");
    return { ok: true, id: result.scenarioId };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}

// ── Ativar versão ──────────────────────────────────────────
export async function setActivePricingVersionAction(
  scenarioId: string,
  versionId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const roleCheck = requirePricingWriteRole(ctx.member.role);
  if (!roleCheck.ok) return roleCheck;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }
  if (await assistedPricingAccessBlocked(supabase, ctx.lawFirm.id)) {
    return { ok: false, error: "PRICING_ASSISTED_ACCESS_BLOCKED" };
  }

  try {
    await activatePricingVersion(supabase, ctx.lawFirm.id, ctx.member.id, scenarioId, versionId);
    revalidatePath("/simulador");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safePricingError(error) };
  }
}
