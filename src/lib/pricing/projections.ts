// ============================================================
// PROJECTIONS — Construção de projeção de receita
// Motor puro, determinístico, sem side effects
// ============================================================

import type {
  ProjectionItem,
  PricingInstallment,
  PricingMonthlyFeeItem,
} from "./calculation-types";
import type { PricingScenarioType } from "./types";
import type { EstimatedSuccessFeeResult } from "./success-fee";

// ── Params ─────────────────────────────────────────────────
export interface BuildRevenueProjectionParams {
  entryAmountCents: number;
  installments: PricingInstallment[];
  monthlyFeeSchedule: PricingMonthlyFeeItem[];
  successFeeResult?: EstimatedSuccessFeeResult;
  scenarioType: PricingScenarioType;
  calculationDate: string; // YYYY-MM-DD
}

// ── Resultado ──────────────────────────────────────────────
export interface RevenueProjectionResult {
  timeline: ProjectionItem[];
  monthlyTotals: Record<string, number>;
  guaranteedMonthlyTotals: Record<string, number>;
  estimatedMonthlyTotals: Record<string, number>;
  startDate: string;
  endDate: string;
}

// ── Helpers ────────────────────────────────────────────────
function toMonthKey(dateStr: string): string {
  // Expects YYYY-MM-DD → YYYY-MM
  return dateStr.slice(0, 7);
}

// ── Build Revenue Projection ──────────────────────────────
export function buildRevenueProjection(
  params: BuildRevenueProjectionParams,
): RevenueProjectionResult {
  const {
    entryAmountCents,
    installments,
    monthlyFeeSchedule,
    successFeeResult,
    scenarioType,
    calculationDate,
  } = params;

  const items: ProjectionItem[] = [];

  // 1. Entrada (entry)
  if (entryAmountCents > 0) {
    items.push({
      date: calculationDate,
      monthKey: toMonthKey(calculationDate),
      sourceType: "entry",
      description: "Entrada",
      amountCents: entryAmountCents,
      guaranteed: true,
      scenarioType,
    });
  }

  // 2. Parcelas (installment)
  for (const inst of installments) {
    items.push({
      date: inst.dueDate,
      monthKey: toMonthKey(inst.dueDate),
      sourceType: "installment",
      description: `Parcela ${inst.number}`,
      amountCents: inst.amountCents,
      guaranteed: true,
      scenarioType,
    });
  }

  // 3. Mensalidades (monthly_fee)
  for (const fee of monthlyFeeSchedule) {
    items.push({
      date: fee.dueDate,
      monthKey: toMonthKey(fee.dueDate),
      sourceType: "monthly_fee",
      description: `Mensalidade ${fee.number}`,
      amountCents: fee.amountCents,
      guaranteed: true,
      scenarioType,
    });
  }

  // 4. Êxito estimado (estimated_success_fee)
  if (successFeeResult && successFeeResult.estimatedAmountCents > 0) {
    items.push({
      date: calculationDate, // sem data específica, usa data de cálculo
      monthKey: toMonthKey(calculationDate),
      sourceType: "estimated_success_fee",
      description: "Honorário de êxito estimado",
      amountCents: successFeeResult.estimatedAmountCents,
      guaranteed: false,
      scenarioType,
    });
  }

  // Caso vazio
  if (items.length === 0) {
    return {
      timeline: [],
      monthlyTotals: {},
      guaranteedMonthlyTotals: {},
      estimatedMonthlyTotals: {},
      startDate: "",
      endDate: "",
    };
  }

  // Agrupar por monthKey
  const monthlyTotals: Record<string, number> = {};
  const guaranteedMonthlyTotals: Record<string, number> = {};
  const estimatedMonthlyTotals: Record<string, number> = {};

  for (const item of items) {
    const key = item.monthKey;

    monthlyTotals[key] = (monthlyTotals[key] ?? 0) + item.amountCents;

    if (item.guaranteed) {
      guaranteedMonthlyTotals[key] =
        (guaranteedMonthlyTotals[key] ?? 0) + item.amountCents;
    } else {
      estimatedMonthlyTotals[key] =
        (estimatedMonthlyTotals[key] ?? 0) + item.amountCents;
    }
  }

  // Datas de início e fim
  const dates = items.map((i) => i.date);
  const startDate = dates.reduce((min, d) => (d < min ? d : min));
  const endDate = dates.reduce((max, d) => (d > max ? d : max));

  return {
    timeline: items,
    monthlyTotals,
    guaranteedMonthlyTotals,
    estimatedMonthlyTotals,
    startDate,
    endDate,
  };
}