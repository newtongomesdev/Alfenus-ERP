// ============================================================
// SCENARIOS — Cálculo e comparação de cenários de precificação
// Motor puro, determinístico, sem side effects
// ============================================================

import type {
  PricingCalculationInput,
  PricingScenarioResult,
  PricingScenarioComparison,
  PricingScenarioDifference,
  PricingScenarioOverride,
  PricingCalculationResult,
} from "./calculation-types";
import { calculatePricingFee } from "./calculator";
import { buildPricingCalculationMemory } from "./memory";

// ── Campo para comparação ──────────────────────────────────
interface ComparisonField {
  key: string;
  label: string;
}

const COMPARISON_FIELDS: ComparisonField[] = [
  { key: "workCostCents", label: "Custo do trabalho" },
  { key: "totalEstimatedCostCents", label: "Custo total estimado" },
  { key: "marginAmountCents", label: "Margem" },
  { key: "totalDiscountCents", label: "Desconto total" },
  { key: "fixedFeeTotalCents", label: "Taxa fixa total" },
  { key: "entryAmountCents", label: "Entrada" },
  { key: "financedAmountCents", label: "Valor financiado" },
  { key: "installmentTotalCents", label: "Total das parcelas" },
  { key: "monthlyFeeTotalCents", label: "Total mensalidades" },
  { key: "estimatedSuccessFeeCents", label: "Êxito estimado" },
  { key: "totalPotentialRevenueCents", label: "Receita potencial total" },
  { key: "guaranteedRevenueCents", label: "Receita garantida" },
];

// ── 1. calculatePricingScenario ───────────────────────────
/**
 * Calcula um cenário de precificação individual.
 * Sequência:
 *   1. Mescla baseInput com overrides.
 *   2. Chama calculatePricingFee (./calculator).
 *   3. Retorna PricingScenarioResult com resultado + memória.
 */
export function calculatePricingScenario(
  baseInput: PricingCalculationInput,
  overrides?: Partial<PricingCalculationInput>,
  name?: string,
): PricingScenarioResult {
  const mergedInput: PricingCalculationInput = {
    ...baseInput,
    ...overrides,
  };

  const resolvedName = name ?? `Cenário ${baseInput.scenarioType}`;
  const scenarioType = overrides?.scenarioType ?? baseInput.scenarioType;

  const result = calculatePricingFee(mergedInput);
  const memory = buildPricingCalculationMemory({
    input: mergedInput,
    result,
    calculatedAt: new Date().toISOString(),
    scenarioType,
  });

  return {
    scenarioType,
    name: resolvedName,
    input: mergedInput,
    result,
    memory,
  };
}

// ── 2. calculateMultiplePricingScenarios ──────────────────
/**
 * Calcula múltiplos cenários a partir de um input base e lista de overrides.
 */
export function calculateMultiplePricingScenarios(
  baseInput: PricingCalculationInput,
  scenarios: PricingScenarioOverride[],
): PricingScenarioResult[] {
  return scenarios.map((scenario) =>
    calculatePricingScenario(
      baseInput,
      scenario.overrides,
      scenario.name,
    ),
  );
}

// ── 3. comparePricingScenarios ────────────────────────────
/**
 * Compara o cenário principal com outros cenários.
 * Retorna PricingScenarioComparison com as diferenças.
 */
export function comparePricingScenarios(
  main: PricingScenarioResult,
  others: PricingScenarioResult[],
): PricingScenarioComparison {
  const allDifferences: PricingScenarioDifference[] = [];

  for (const other of others) {
    const diffs = calculateScenarioDifferences(main, other);
    allDifferences.push(...diffs);
  }

  return {
    main,
    others,
    differences: allDifferences,
  };
}

// ── 4. calculateScenarioDifferences ───────────────────────
/**
 * Calcula diferenças absolutas e percentuais entre dois cenários
 * para os campos-chave relevantes.
 */
export function calculateScenarioDifferences(
  main: PricingScenarioResult,
  compare: PricingScenarioResult,
): PricingScenarioDifference[] {
  const differences: PricingScenarioDifference[] = [];

  for (const field of COMPARISON_FIELDS) {
    const mainValue = getNestedField(main.result, field.key);
    const compareValue = getNestedField(compare.result, field.key);

    const absoluteDelta = compareValue - mainValue;
    const percentageDelta =
      mainValue !== 0
        ? Math.round(((compareValue - mainValue) / Math.abs(mainValue)) * 10000) / 100
        : 0;

    differences.push({
      field: field.key,
      label: field.label,
      absoluteDelta,
      percentageDelta,
      baseValue: mainValue,
      compareValue,
    });
  }

  return differences;
}

// ── Helper: valor aninhado ────────────────────────────────
function getNestedField(obj: PricingCalculationResult, key: string): number {
  const record = obj as unknown as Record<string, unknown>;
  const val = record[key];
  return typeof val === "number" ? val : 0;
}