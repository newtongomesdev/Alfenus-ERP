/**
 * ETAPA 5.2.2.4 — Diferença entre parâmetros de versões.
 *
 * Compara os inputs de duas versões para identificar
 * o que mudou, sem expor valores sensíveis.
 *
 * Schema: versões usam parameters (JSONB) para parâmetros
 * e colunas diretas para valores financeiros.
 */

import type { PricingScenarioVersionRow } from "./types";

// ─── Types ─────────────────────────────────────────────

export interface ParameterDiff {
  field: string;
  label: string;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
}

export interface ComparisonResult {
  versionIdA: string;
  versionIdB: string;
  versionNumberA: number;
  versionNumberB: number;
  sameEngine: boolean;
  diffs: ParameterDiff[];
  resultDiffs: ResultDiff[];
  identicalInputs: boolean;
  identicalResults: boolean;
}

export interface ResultDiff {
  field: string;
  label: string;
  valueA: number | null;
  valueB: number | null;
  delta: number | null;
  deltaPercentage: number | null;
}

// ─── Labels ────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  scenario_type: "Tipo de cenário",
  currency: "Moeda",
  total_amount_cents: "Total do serviço",
  entry_amount_cents: "Entrada",
  financed_amount_cents: "Financiado",
  installment_count: "Parcelas",
  success_fee_percentage_bps: "Taxa de êxito",
  monthly_fee_cents: "Mensalidade",
  monthly_fee_count: "Meses recorrentes",
};

const RESULT_LABELS: Record<string, string> = {
  total_amount_cents: "Total do serviço",
  entry_amount_cents: "Entrada",
  financed_amount_cents: "Financiado",
  installment_count: "Parcelas",
  success_fee_percentage_bps: "Taxa de êxito",
  estimated_success_fee_cents: "Êxito estimado",
  monthly_fee_cents: "Mensalidade",
  monthly_fee_count: "Meses recorrentes",
};

// ─── Diff de Parâmetros ────────────────────────────────

/**
 * Compara parâmetros de entrada de duas versões.
 * Usa parameters (JSONB) e colunas diretas.
 */
export function diffParameters(
  versionA: PricingScenarioVersionRow,
  versionB: PricingScenarioVersionRow,
): ParameterDiff[] {
  const diffs: ParameterDiff[] = [];

  // Comparar parameters (JSONB)
  const paramsA = (versionA.parameters as Record<string, unknown>) ?? {};
  const paramsB = (versionB.parameters as Record<string, unknown>) ?? {};
  const allParamKeys = new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]);

  for (const key of allParamKeys) {
    const valA = paramsA[key];
    const valB = paramsB[key];
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      diffs.push({
        field: `params.${key}`,
        label: FIELD_LABELS[key] ?? key,
        from: valA as string | number | boolean | null ?? null,
        to: valB as string | number | boolean | null ?? null,
      });
    }
  }

  // Comparar colunas diretas
  const directFields: Array<keyof PricingScenarioVersionRow> = [
    "scenario_type",
    "currency",
    "total_amount_cents",
    "entry_amount_cents",
    "financed_amount_cents",
    "installment_count",
    "success_fee_percentage_bps",
    "monthly_fee_cents",
    "monthly_fee_count",
  ];

  for (const field of directFields) {
    const valA = versionA[field];
    const valB = versionB[field];
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      diffs.push({
        field: field as string,
        label: FIELD_LABELS[field as string] ?? field as string,
        from: valA as string | number | boolean | null ?? null,
        to: valB as string | number | boolean | null ?? null,
      });
    }
  }

  return diffs;
}

// ─── Diff de Resultados ────────────────────────────────

/**
 * Compara resultados calculados de duas versões.
 * Mostra deltas absolutos e percentuais.
 */
export function diffResults(
  versionA: PricingScenarioVersionRow,
  versionB: PricingScenarioVersionRow,
): ResultDiff[] {
  const diffs: ResultDiff[] = [];
  const numericFields: Array<keyof PricingScenarioVersionRow> = [
    "total_amount_cents",
    "entry_amount_cents",
    "financed_amount_cents",
    "installment_count",
    "success_fee_percentage_bps",
    "estimated_success_fee_cents",
    "monthly_fee_cents",
    "monthly_fee_count",
  ];

  for (const field of numericFields) {
    const valA = typeof versionA[field] === "number" ? (versionA[field] as number) : null;
    const valB = typeof versionB[field] === "number" ? (versionB[field] as number) : null;

    if (valA !== valB) {
      const delta = valA !== null && valB !== null ? valB - valA : null;
      const deltaPercentage =
        delta !== null && valA !== null && valA !== 0
          ? Math.round((delta / Math.abs(valA)) * 10000) / 100
          : null;

      diffs.push({
        field: field as string,
        label: RESULT_LABELS[field as string] ?? field as string,
        valueA: valA,
        valueB: valB,
        delta,
        deltaPercentage,
      });
    }
  }

  return diffs;
}

// ─── Comparação Completa ───────────────────────────────

/**
 * Compara duas versões completas (parâmetros + resultados).
 */
export function compareVersions(
  versionA: PricingScenarioVersionRow,
  versionB: PricingScenarioVersionRow,
): ComparisonResult {
  const parameterDiffs = diffParameters(versionA, versionB);
  const resultDiffs = diffResults(versionA, versionB);

  return {
    versionIdA: versionA.id,
    versionIdB: versionB.id,
    versionNumberA: versionA.version_number,
    versionNumberB: versionB.version_number,
    sameEngine: true, // Todas as versões usam o mesmo engine
    diffs: parameterDiffs,
    resultDiffs,
    identicalInputs: parameterDiffs.length === 0,
    identicalResults: resultDiffs.length === 0,
  };
}
