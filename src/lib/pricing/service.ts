/* eslint-disable @typescript-eslint/no-explicit-any -- secure views are added by migration 0053 before generated types refresh */

/**
 * ETAPA 5.2.2.5.1 — Camada de serviço central.
 *
 * Coordena todas as operações de pricing:
 * criação de cenário, cálculo, versão, ativação,
 * duplicação, arquivamento, restauração, comparação.
 *
 * Princípios:
 * - Nunca confiar no cálculo do cliente
 * - Transações atômicas via RPC
 * - Optimistic locking para concorrência
 * - Idempotência para retries
 * - Snapshots para imutabilidade
 * - Auditoria em todas as operações
 *
 * RPCs resolvem membro internamente via auth.uid().
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { calculatePricingFee } from "./calculator";
import type { PricingCalculationInput } from "./calculation-types";
import {
  persistScenario,
  persistCalculatedVersion,
  persistCalculatedVersionIdempotent,
  activateVersion as persistActivateVersion,
  duplicateScenario as persistDuplicateScenario,
  archiveScenario as persistArchiveScenario,
  restoreScenario as persistRestoreScenario,
  updateScenarioMetadata,
} from "./persistence";
import { comparePricingVersions } from "./comparison";
import type { ComparisonResult } from "./diff";

type SupabaseDB = SupabaseClient<Database>;

// ─── Types ─────────────────────────────────────────────

export interface CreateScenarioInput {
  name: string;
  description?: string;
  serviceId: string;
  clientId?: string;
  leadId?: string;
  items: Array<{
    serviceName: string;
    quantityCents: number;
    unitPriceCents: number;
    notes?: string;
  }>;
}

export interface CreateVersionInput {
  scenarioId: string;
  scenarioType: string;
  feeType: string;
  feeValueCents: number;
  currency: string;
  paymentMethod: string;
  installments: number;
  successFeeRateBps?: number;
  recurringMonths?: number;
  billingFrequency?: string;
  idempotencyKey?: string;
  inputHash?: string;
  forceNewVersion?: boolean;
  activate?: boolean;
  expectedUpdatedAt?: string;
}

export interface UpdateMetadataInput {
  scenarioId: string;
  expectedUpdatedAt: string;
  name?: string;
  description?: string;
}

// ─── Criação de Cenário ────────────────────────────────

export async function createPricingScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  input: CreateScenarioInput,
): Promise<{ scenarioId: string }> {
  const { data: service, error: serviceError } = await supabase
    .from("service_catalog")
    .select("id, is_active")
    .eq("id", input.serviceId)
    .eq("law_firm_id", tenantId)
    .single();

  if (serviceError || !service) {
    throw new Error(`Serviço não encontrado: ${input.serviceId}`);
  }

  if (input.clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("law_firm_id", tenantId)
      .single();

    if (!client) {
      throw new Error(`Cliente não encontrado: ${input.clientId}`);
    }
  }

  if (input.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", input.leadId)
      .eq("law_firm_id", tenantId)
      .single();

    if (!lead) {
      throw new Error(`Lead não encontrado: ${input.leadId}`);
    }
  }

  const { id: scenarioId } = await persistScenario(
    supabase,
    tenantId,
    userId,
    input,
  );

  return { scenarioId };
}

// ─── Cálculo e Criação de Versão ───────────────────────

export async function calculateAndCreateVersion(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  input: CreateVersionInput,
): Promise<{
  versionId: string;
  versionNumber: number;
  isDuplicate: boolean;
  isIdempotent: boolean;
  activated: boolean;
}> {
  const { data: scenario, error: scenarioError } = await supabase
    .from("pricing_scenarios")
    .select("id, status")
    .eq("id", input.scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (scenarioError || !scenario) {
    throw new Error(`Cenário não encontrado: ${input.scenarioId}`);
  }

  if (scenario.status === "archived") {
    throw new Error(
      `Cenário arquivado: ${input.scenarioId}. Restaure antes de operar.`,
    );
  }

  const calcInput: PricingCalculationInput = {
    scenarioType: input.scenarioType as PricingCalculationInput["scenarioType"],
    calculationDate: new Date().toISOString().split("T")[0],
    currency: input.currency,
    estimatedHours: input.feeType === "hourly" ? Math.ceil(input.feeValueCents / 100) : undefined,
    hourlyRateCents: input.feeType === "hourly" ? input.feeValueCents : undefined,
  };

  const result = calculatePricingFee(calcInput);

  const items = [{
    serviceName: "Serviço",
    quantityCents: 1,
    unitPriceCents: input.feeValueCents,
  }];

  const params = {
    feeType: input.feeType,
    feeValueCents: input.feeValueCents,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    installments: input.installments,
    successFeeRateBps: input.successFeeRateBps ?? null,
    recurringMonths: input.recurringMonths ?? null,
    billingFrequency: input.billingFrequency ?? null,
  };

  // Usar persistência idempotente quando idempotencyKey e inputHash são fornecidos
  if (input.idempotencyKey && input.inputHash) {
    const idempResult = await persistCalculatedVersionIdempotent(
      supabase,
      {
        scenarioId: input.scenarioId,
        scenarioType: input.scenarioType,
        parameters: params,
        calculationResult: result,
        calculationMemory: {},
        items,
        activate: input.activate ?? false,
      },
      {
        idempotencyKey: input.idempotencyKey,
        inputHash: input.inputHash,
        expectedUpdatedAt: input.expectedUpdatedAt,
      },
    );

    return {
      versionId: idempResult.versionId ?? "",
      versionNumber: 0,
      isDuplicate: idempResult.idempotent,
      isIdempotent: idempResult.idempotent,
      activated: input.activate === true && !idempResult.idempotent,
    };
  }

  // Caminho original (sem idempotência via RPC)
  const persistResult = await persistCalculatedVersion(
    supabase,
    tenantId,
    userId,
    {
      scenarioId: input.scenarioId,
      items,
      params,
      result,
      memory: {},
      forceNewVersion: input.forceNewVersion,
    },
  );

  let activated = false;
  if (input.activate && !persistResult.isDuplicate) {
    await persistActivateVersion(
      supabase,
      tenantId,
      userId,
      input.scenarioId,
      persistResult.versionId,
    );
    activated = true;
  }

  return {
    versionId: persistResult.versionId,
    versionNumber: persistResult.versionNumber,
    isDuplicate: persistResult.isDuplicate,
    isIdempotent: false,
    activated,
  };
}

// ─── Recálculo ─────────────────────────────────────────

export async function recalculatePricingScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
  activate?: boolean,
): Promise<{
  versionId: string;
  versionNumber: number;
  isDuplicate: boolean;
  isIdempotent: boolean;
  activated: boolean;
}> {
  const { data: scenario, error } = await supabase
    .from("pricing_scenarios")
    .select("id, status")
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !scenario) {
    throw new Error(`Cenário não encontrado: ${scenarioId}`);
  }

  if (scenario.status === "archived") {
    throw new Error(
      `Cenário arquivado: ${scenarioId}. Restaure antes de operar.`,
    );
  }

  const { data: lastVersion } = await (supabase as any)
    .from("pricing_scenario_versions_internal")
    .select("*")
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", tenantId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (!lastVersion) {
    throw new Error("Nenhuma versão encontrada para recálculo");
  }

  const params = (lastVersion.parameters as Record<string, unknown>) ?? {};
  return calculateAndCreateVersion(supabase, tenantId, userId, {
    scenarioId,
    scenarioType: (lastVersion.scenario_type as string) ?? "main",
    feeType: (params.feeType as string) ?? "fixed",
    feeValueCents: (params.feeValueCents as number) ?? 0,
    currency: lastVersion.currency,
    paymentMethod: (params.paymentMethod as string) ?? "single",
    installments: lastVersion.installment_count,
    successFeeRateBps: (params.successFeeRateBps as number) ?? undefined,
    recurringMonths: (params.recurringMonths as number) ?? undefined,
    billingFrequency: (params.billingFrequency as string) ?? undefined,
    forceNewVersion: true,
    activate,
  });
}

// ─── Ativação ──────────────────────────────────────────

export async function activatePricingVersion(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
  versionId: string,
): Promise<void> {
  const { data: scenario, error: scenarioError } = await supabase
    .from("pricing_scenarios")
    .select("id, status")
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (scenarioError || !scenario) {
    throw new Error(`Cenário não encontrado: ${scenarioId}`);
  }

  if (scenario.status === "archived") {
    throw new Error(
      `Cenário arquivado: ${scenarioId}. Restaure antes de operar.`,
    );
  }

  const { data: version, error: versionError } = await (supabase as any)
    .from("pricing_scenario_versions_secure")
    .select("id, pricing_scenario_id")
    .eq("id", versionId)
    .eq("law_firm_id", tenantId)
    .single();

  if (versionError || !version) {
    throw new Error(`Versão não encontrada: ${versionId}`);
  }

  if (version.pricing_scenario_id !== scenarioId) {
    throw new Error("Versão não pertence a este cenário");
  }

  await persistActivateVersion(supabase, tenantId, userId, scenarioId, versionId);
}

// ─── Duplicação ────────────────────────────────────────

export async function duplicatePricingScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  sourceScenarioId: string,
  newName: string,
): Promise<{ scenarioId: string }> {
  const { data: source, error } = await supabase
    .from("pricing_scenarios")
    .select("id, name")
    .eq("id", sourceScenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !source) {
    throw new Error(`Cenário não encontrado: ${sourceScenarioId}`);
  }

  return persistDuplicateScenario(
    supabase,
    tenantId,
    userId,
    sourceScenarioId,
    newName,
  );
}

// ─── Arquivamento / Restauração ────────────────────────

export async function archivePricingScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
): Promise<void> {
  const { data: scenario, error } = await supabase
    .from("pricing_scenarios")
    .select("id, status")
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !scenario) {
    throw new Error(`Cenário não encontrado: ${scenarioId}`);
  }

  if (scenario.status === "archived") {
    throw new Error("Cenário já está arquivado");
  }

  await persistArchiveScenario(supabase, tenantId, userId, scenarioId);
}

export async function restorePricingScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
): Promise<void> {
  const { data: scenario, error } = await supabase
    .from("pricing_scenarios")
    .select("id, status")
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !scenario) {
    throw new Error(`Cenário não encontrado: ${scenarioId}`);
  }

  if (scenario.status !== "archived") {
    throw new Error("Cenário não está arquivado");
  }

  await persistRestoreScenario(supabase, tenantId, userId, scenarioId);
}

// ─── Atualização de Metadados ──────────────────────────

export async function updatePricingScenarioMetadata(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  input: UpdateMetadataInput,
): Promise<void> {
  const { data: scenario, error } = await supabase
    .from("pricing_scenarios")
    .select("id, status, updated_at")
    .eq("id", input.scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !scenario) {
    throw new Error(`Cenário não encontrado: ${input.scenarioId}`);
  }

  if (scenario.status === "archived") {
    throw new Error(
      `Cenário arquivado: ${input.scenarioId}. Restaure antes de alterar.`,
    );
  }

  if (scenario.updated_at !== input.expectedUpdatedAt) {
    throw new Error(
      "Conflito de concorrência. O cenário foi modificado por outro usuário. Recarregue e tente novamente.",
    );
  }

  const updates: { name?: string; description?: string } = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  await updateScenarioMetadata(
    supabase,
    tenantId,
    userId,
    input.scenarioId,
    input.expectedUpdatedAt,
    updates,
  );
}

// ─── Comparação ────────────────────────────────────────

export async function comparePricingVersionsService(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
  versionIdA: string,
  versionIdB: string,
): Promise<ComparisonResult> {
  const { data: scenario, error } = await supabase
    .from("pricing_scenarios")
    .select("id")
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !scenario) {
    throw new Error(`Cenário não encontrado: ${scenarioId}`);
  }

  return comparePricingVersions(
    supabase,
    tenantId,
    scenarioId,
    versionIdA,
    versionIdB,
  );
}
