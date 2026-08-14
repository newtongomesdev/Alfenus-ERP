/* eslint-disable @typescript-eslint/no-explicit-any -- secure views are added by migration 0053 before generated types refresh */

/**
 * ETAPA 5.2.2.5.1 — Persistência de cenários e versões.
 *
 * Camada de acesso ao banco com snapshots, idempotência
 * e registro de eventos.
 *
 * Princípio: nunca confiar no cálculo do cliente.
 * O servidor sempre recalcula antes de persistir.
 *
 * Schema: colunas usam law_firm_id, pricing_scenario_id,
 * pricing_scenario_events, scenario_version_id, actor_id.
 *
 * RPCs resolvem membro internamente via auth.uid() —
 * não passar p_tenant_id ou p_created_by.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { computeCalculationHash } from "./idempotency";
import { PRICING_CALCULATION_ENGINE_VERSION, PRICING_SCHEMA_VERSION } from "./calculation-types";
import type { PricingCalculationResult } from "./calculation-types";

// ── SupabaseDB tipado ────────────────────────────────────
type SupabaseDB = SupabaseClient<Database>;

// ── Persistência de Cenário ───────────────────────────

export interface CreateScenarioData {
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

/**
 * Cria cenário. RPCs resolvem membro internamente via auth.uid().
 */
export async function persistScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  data: CreateScenarioData,
): Promise<{ id: string }> {
  const { data: scenario, error: scenarioError } = await supabase
    .from("pricing_scenarios")
    .insert({
      law_firm_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      service_id: data.serviceId,
      client_id: data.clientId ?? null,
      lead_id: data.leadId ?? null,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (scenarioError || !scenario) {
    throw new Error(`Erro ao criar cenário: ${scenarioError?.message}`);
  }

  // Registrar evento
  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: scenario.id,
    event_type: "scenario_created",
    actor_id: userId,
    safe_metadata: {
      name: data.name,
      serviceId: data.serviceId,
      clientId: data.clientId ?? null,
      leadId: data.leadId ?? null,
    },
  });

  return { id: scenario.id };
}

// ── Persistência de Versão Calculada ──────────────────

export interface PersistVersionData {
  scenarioId: string;
  items: Array<{
    serviceName: string;
    quantityCents: number;
    unitPriceCents: number;
    notes?: string;
  }>;
  params: Record<string, unknown>;
  result: PricingCalculationResult;
  memory: Record<string, unknown>;
  forceNewVersion?: boolean;
}

/**
 * Persiste versão calculada com idempotência.
 *
 * Fluxo:
 * 1. Calcular hash canônico dos parâmetros
 * 2. Verificar duplicidade por hash (não por JSON.stringify)
 * 3. Chamar RPC create_pricing_scenario_version
 * 4. Registrar evento
 *
 * RPC: create_pricing_scenario_version
 * - resolve membro via auth.uid() internamente
 * - não aceita p_tenant_id nem p_created_by
 * - parâmetros: p_scenario_id, p_parameters, p_calculation_result, p_calculation_memory, ...
 */
export async function persistCalculatedVersion(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  data: PersistVersionData,
): Promise<{ versionId: string; versionNumber: number; isDuplicate: boolean }> {
  // 1. Calcular hash canônico dos parâmetros
  const paramsHash = computeCalculationHash({
    serviceId: data.scenarioId,
    feeType: (data.params.feeType as string) ?? "fixed",
    feeValue: (data.params.feeValueCents as number) ?? 0,
    currency: (data.params.currency as string) ?? "BRL",
    paymentMethod: (data.params.paymentMethod as string) ?? "single",
    installments: (data.params.installments as number) ?? 1,
    successFeeRate: data.params.successFeeRateBps as number | undefined,
    recurringMonths: data.params.recurringMonths as number | undefined,
    billingFrequency: data.params.billingFrequency as string | undefined,
    engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
    schemaVersion: PRICING_SCHEMA_VERSION,
  });

  // 2. Verificar duplicidade por hash canônico
  if (!data.forceNewVersion) {
    const { data: existingVersions } = await (supabase as any)
      .from("pricing_scenario_versions_internal")
      .select("id, version_number, parameters")
      .eq("pricing_scenario_id", data.scenarioId)
      .eq("law_firm_id", tenantId)
      .order("version_number", { ascending: false })
      .limit(1);

    if (existingVersions && existingVersions.length > 0) {
      const existing = existingVersions[0];
      const existingHash = computeCalculationHash({
        serviceId: data.scenarioId,
        feeType: (existing.parameters as Record<string, unknown>)?.feeType as string ?? "fixed",
        feeValue: (existing.parameters as Record<string, unknown>)?.feeValueCents as number ?? 0,
        currency: (existing.parameters as Record<string, unknown>)?.currency as string ?? "BRL",
        paymentMethod: (existing.parameters as Record<string, unknown>)?.paymentMethod as string ?? "single",
        installments: (existing.parameters as Record<string, unknown>)?.installments as number ?? 1,
        successFeeRate: (existing.parameters as Record<string, unknown>)?.successFeeRateBps as number | undefined,
        recurringMonths: (existing.parameters as Record<string, unknown>)?.recurringMonths as number | undefined,
        billingFrequency: (existing.parameters as Record<string, unknown>)?.billingFrequency as string | undefined,
        engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
        schemaVersion: PRICING_SCHEMA_VERSION,
      });

      if (paramsHash === existingHash) {
        await supabase.from("pricing_scenario_events").insert({
          law_firm_id: tenantId,
          pricing_scenario_id: data.scenarioId,
          event_type: "version_created",
          actor_id: userId,
          safe_metadata: {
            existingVersionId: existing.id,
            existingVersionNumber: existing.version_number,
            hash: paramsHash,
            duplicated: true,
          },
        });

        return {
          versionId: existing.id,
          versionNumber: existing.version_number,
          isDuplicate: true,
        };
      }
    }
  }

  // 3. Chamar RPC create_pricing_scenario_version
  // RPC resolve member via auth.uid() — não passar p_tenant_id, p_created_by
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_pricing_scenario_version",
    {
      p_scenario_id: data.scenarioId,
      p_parameters: data.params as Json,
      p_calculation_result: data.result as unknown as Json,
      p_calculation_memory: data.memory as Json,
      p_activate: false,
    },
  );

  if (rpcError) {
    throw new Error(`Erro ao criar versão: ${rpcError.message}`);
  }

  if (!rpcResult || typeof rpcResult !== "object") {
    throw new Error("RPC não retornou resultado válido");
  }

  const rpc = rpcResult as { ok: boolean; error?: string; version_id?: string; version_number?: number };

  if (!rpc.ok) {
    throw new Error(`RPC retornou erro: ${rpc.error}`);
  }

  // 5. Registrar evento
  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: data.scenarioId,
    version_id: rpc.version_id ?? null,
    event_type: "version_created",
    actor_id: userId,
    safe_metadata: {
      versionNumber: rpc.version_number,
      engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
      hash: paramsHash,
    },
  });

  return {
    versionId: rpc.version_id ?? "",
    versionNumber: rpc.version_number ?? 0,
    isDuplicate: false,
  };
}

// ── Resultado de Persistência Idempotente ──────────────

export interface VersionPersistenceResult {
  success: boolean;
  idempotent: boolean;
  versionId?: string;
}

// ── Persistência de Versão (Idempotente via RPC) ───────

/**
 * Persiste versão calculada usando RPC create_pricing_scenario_version_idempotent.
 *
 * A RPC internamente verifica a chave de idempotência e o hash de input
 * para evitar duplicatas. Se já existe uma versão com a mesma chave
 * e hash, retorna a versão existente (idempotent: true).
 *
 * Se o RPC lança erro (throw), o erro é repassado ao caller.
 */
export async function persistCalculatedVersionIdempotent(
  supabase: SupabaseDB,
  params: {
    scenarioId: string;
    scenarioType: string;
    parameters: Record<string, unknown>;
    calculationResult: PricingCalculationResult;
    calculationMemory: Record<string, unknown>;
    items: Array<{
      serviceName: string;
      quantityCents: number;
      unitPriceCents: number;
      notes?: string;
    }>;
    activate: boolean;
  },
  opts: {
    idempotencyKey: string;
    inputHash: string;
    expectedUpdatedAt?: string;
  },
): Promise<VersionPersistenceResult> {
  const rpcItems = params.items.map((item, index) => ({
    item_type: "fee",
    description: item.serviceName,
    quantity: item.quantityCents,
    unit_amount_cents: item.unitPriceCents,
    total_amount_cents: item.quantityCents * item.unitPriceCents,
    order_index: index,
    metadata: item.notes ? { notes: item.notes } : {},
  }));

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_pricing_scenario_version_idempotent",
    {
      p_scenario_id: params.scenarioId,
      p_scenario_type: params.scenarioType,
      p_parameters: params.parameters as Json,
      p_calculation_result: params.calculationResult as unknown as Json,
      p_calculation_memory: params.calculationMemory as Json,
      p_items: rpcItems as unknown as Json,
      p_activate: params.activate,
      p_idempotency_key: opts.idempotencyKey,
      p_input_hash: opts.inputHash,
      p_expected_updated_at: opts.expectedUpdatedAt ?? undefined,
    },
  );

  if (rpcError) {
    throw new Error(`Erro ao criar versão idempotente: ${rpcError.message}`);
  }

  if (!rpcResult || typeof rpcResult !== "object") {
    throw new Error("RPC não retornou resultado válido");
  }

  const rpc = rpcResult as {
    ok: boolean;
    idempotent?: boolean;
    version_id?: string;
    error?: string;
  };

  if (!rpc.ok) {
    throw new Error(`RPC retornou erro: ${rpc.error}`);
  }

  return {
    success: true,
    idempotent: rpc.idempotent === true,
    versionId: rpc.version_id,
  };
}

// ── Ativação de Versão ────────────────────────────────

/**
 * Ativa uma versão via RPC.
 * RPC: set_active_pricing_version(p_scenario_id, p_version_id)
 */
export async function activateVersion(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
  versionId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc(
    "set_active_pricing_version",
    {
      p_scenario_id: scenarioId,
      p_version_id: versionId,
    },
  );

  if (error) {
    throw new Error(`Erro ao ativar versão: ${error.message}`);
  }

  const rpc = data as { ok: boolean; error?: string };

  if (!rpc.ok) {
    throw new Error(`RPC retornou erro: ${rpc.error}`);
  }

  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: scenarioId,
    version_id: versionId,
    event_type: "version_activated",
    actor_id: userId,
    safe_metadata: { versionId },
  });
}

// ── Duplicação de Cenário ─────────────────────────────

/**
 * Duplica cenário via RPC.
 * RPC: duplicate_pricing_scenario(p_source_scenario_id, p_new_name)
 */
export async function duplicateScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  sourceScenarioId: string,
  newName: string,
): Promise<{ scenarioId: string }> {
  const { data, error } = await supabase.rpc(
    "duplicate_pricing_scenario",
    {
      p_source_scenario_id: sourceScenarioId,
      p_new_name: newName,
    },
  );

  if (error) {
    throw new Error(`Erro ao duplicar cenário: ${error.message}`);
  }

  const rpc = data as { ok: boolean; error?: string; scenario_id?: string; name?: string };

  if (!rpc.ok) {
    throw new Error(`RPC retornou erro: ${rpc.error}`);
  }

  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: rpc.scenario_id ?? "",
    event_type: "scenario_duplicated",
    actor_id: userId,
    safe_metadata: { sourceScenarioId, newName },
  });

  return { scenarioId: rpc.scenario_id ?? "" };
}

// ── Arquivamento / Restauração ────────────────────────

export async function archiveScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pricing_scenarios")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId);

  if (error) {
    throw new Error(`Erro ao arquivar cenário: ${error.message}`);
  }

  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: scenarioId,
    event_type: "scenario_archived",
    actor_id: userId,
    safe_metadata: {},
  });
}

export async function restoreScenario(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pricing_scenarios")
    .update({ status: "draft", archived_at: null })
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId);

  if (error) {
    throw new Error(`Erro ao restaurar cenário: ${error.message}`);
  }

  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: scenarioId,
    event_type: "scenario_restored",
    actor_id: userId,
    safe_metadata: {},
  });
}

// ── Atualização com Optimistic Locking ────────────────

/**
 * Atualiza metadados do cenário com optimistic locking.
 *
 * Usa .select("id") após update para verificar se a linha foi afetada.
 * Se nenhuma linha retornou, significa que updated_at mudou (outro usuário editou).
 *
 * Comportamento esperado:
 * 1. Usuário carrega cenário → obtém updated_at.
 * 2. Outra aba altera → updated_at muda.
 * 3. Primeira aba tenta salvar com token antigo → 0 linhas afetadas.
 * 4. Sistema lança OptimisticLockError.
 */
export async function updateScenarioMetadata(
  supabase: SupabaseDB,
  tenantId: string,
  userId: string,
  scenarioId: string,
  expectedUpdatedAt: string,
  updates: { name?: string; description?: string },
): Promise<void> {
  // 1. Fazer update com filtro por updated_at
  const { data, error } = await supabase
    .from("pricing_scenarios")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
    })
    .eq("id", scenarioId)
    .eq("law_firm_id", tenantId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id");

  if (error) {
    throw new Error(`Erro ao atualizar cenário: ${error.message}`);
  }

  // 2. Verificar se a linha foi afetada (optimistic locking)
  if (!data || data.length === 0) {
    throw new Error(
      "Conflito de concorrência. O cenário foi modificado por outro usuário. Recarregue e tente novamente.",
    );
  }

  // 3. Registrar evento
  await supabase.from("pricing_scenario_events").insert({
    law_firm_id: tenantId,
    pricing_scenario_id: scenarioId,
    event_type: "metadata_updated",
    actor_id: userId,
    safe_metadata: { fields: Object.keys(updates) },
  });
}
