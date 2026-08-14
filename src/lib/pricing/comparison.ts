/* eslint-disable @typescript-eslint/no-explicit-any -- secure views are added by migration 0053 before generated types refresh */

/**
 * ETAPA 5.2.2.5.1 — Serviço de comparação de versões.
 *
 * Carrega apenas versões escolhidas (não todas).
 * Não carrega memória completa (sob demanda).
 *
 * Usa tipo SupabaseDB completo, sem tbl().
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { compareVersions, type ComparisonResult } from "./diff";
import type { PricingScenarioVersionRow } from "./types";

type SupabaseDB = SupabaseClient<Database>;

// ─── Comparação de Versões ─────────────────────────────

export async function comparePricingVersions(
  supabase: SupabaseDB,
  tenantId: string,
  scenarioId: string,
  versionIdA: string,
  versionIdB: string,
): Promise<ComparisonResult> {
  const { data: versionA, error: errA } = await (supabase as any)
    .from("pricing_scenario_versions_internal")
    .select("*")
    .eq("id", versionIdA)
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (errA || !versionA) {
    throw new Error(`Versão não encontrada: ${versionIdA}`);
  }

  const { data: versionB, error: errB } = await (supabase as any)
    .from("pricing_scenario_versions_internal")
    .select("*")
    .eq("id", versionIdB)
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", tenantId)
    .single();

  if (errB || !versionB) {
    throw new Error(`Versão não encontrada: ${versionIdB}`);
  }

  return compareVersions(
    versionA as PricingScenarioVersionRow,
    versionB as PricingScenarioVersionRow,
  );
}

// ─── Comparação com Referência ─────────────────────────

export async function compareWithReference(
  supabase: SupabaseDB,
  tenantId: string,
  scenarioId: string,
  referenceVersionId: string,
  compareVersionIds: string[],
): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = [];

  for (const compareId of compareVersionIds) {
    const result = await comparePricingVersions(
      supabase,
      tenantId,
      scenarioId,
      referenceVersionId,
      compareId,
    );
    results.push(result);
  }

  return results;
}
