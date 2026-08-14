// ============================================================
// CALCULATOR — Motor principal de cálculo de honorários
// Motor puro, determinístico, sem side effects
// Versão: 1.0.0
// ============================================================

import type {
  PricingCalculationInput,
  PricingCalculationResult,
  PricingInstallment,
  PricingMonthlyFeeItem,
  PricingWarning,
  MarginBase,
  InstallmentFrequency,
} from "./calculation-types";
import {
  PRICING_CALCULATION_ENGINE_VERSION,
} from "./calculation-types";
import type { PricingScenarioType } from "./types";
import {
  subtractCents,
  sumCents,
  clampCents,
  toNonNegativeCents,
  hoursToCents,
} from "./currency";
import { applyBasisPoints } from "./percentages";
import { divideIntoInstallments } from "./installments";
import { generateRecurringFees } from "./recurring";
import { calculateEstimatedSuccessFee } from "./success-fee";
import { buildRevenueProjection } from "./projections";

// ── Helpers ────────────────────────────────────────────────
function nonNull(value: number | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function buildWarnings(params: {
  totalEstimatedCost: number;
  fixedFeeTotal: number;
  entryAmount: number;
  installmentCount: number;
  installmentFinishDate: string;
  discountPercent: number;
  hourlyRate: number;
  totalExpenses: number;
  manualAdj: number;
  marginBase: MarginBase;
  successFeeBps: number;
  scenarioType: PricingScenarioType;
  projection: { sourceType: string; date?: string }[];
}): PricingWarning[] {
  const w: PricingWarning[] = [];
  const p = params;

  if (p.fixedFeeTotal < p.totalEstimatedCost) {
    w.push({
      code: "value_below_estimated_cost",
      severity: "important",
      title: "Valor fixo abaixo do custo estimado",
      description:
        "O valor fixo calculado está abaixo do custo estimado informado.",
      relatedField: "fixedFeeTotalCents",
      dismissible: true,
    });
  }
  if (p.entryAmount === 0 && p.installmentCount > 0) {
    w.push({
      code: "no_entry",
      severity: "info",
      title: "Sem entrada",
      description: "Nenhuma entrada foi configurada para este cenário.",
      relatedField: "entryAmountCents",
      dismissible: true,
    });
  }
  if (p.entryAmount >= p.fixedFeeTotal && p.fixedFeeTotal > 0) {
    w.push({
      code: "full_entry",
      severity: "info",
      title: "Entrada integral",
      description: "O valor da entrada cobre o valor total do honorário.",
      relatedField: "entryAmountCents",
      dismissible: true,
    });
  }
  if (p.installmentCount > 12) {
    w.push({
      code: "long_installment_term",
      severity: "attention",
      title: "Prazo prolongado de parcelamento",
      description: `O parcelamento possui ${p.installmentCount} parcelas, o que pode indicar longo prazo.`,
      relatedField: "installmentCount",
      dismissible: true,
    });
  }
  if (p.discountPercent > 2000) {
    w.push({
      code: "high_discount",
      severity: "attention",
      title: "Desconto elevado",
      description: `O desconto percentual aplicado é superior a ${p.discountPercent / 100}%.`,
      relatedField: "percentageDiscountBps",
      dismissible: true,
    });
  }
  if (p.hourlyRate === 0 && p.totalEstimatedCost > 0) {
    w.push({
      code: "no_hourly_cost",
      severity: "info",
      title: "Sem custo por hora",
      description: "Nenhuma taxa por hora foi configurada, mas há custo estimado.",
      relatedField: "hourlyRateCents",
      dismissible: true,
    });
  }
  if (p.totalExpenses === 0) {
    w.push({
      code: "no_expenses",
      severity: "info",
      title: "Sem despesas informadas",
      description: "Nenhuma despesa foi configurada para este cálculo.",
      relatedField: "totalExpenses",
      dismissible: true,
    });
  }
  if (p.successFeeBps > 0) {
    w.push({
      code: "estimated_success_fee",
      severity: "info",
      title: "Honorário de êxito estimado",
      description: "O valor de êxito é apenas uma estimativa e não representa receita garantida.",
      relatedField: "successFeeBps",
      dismissible: true,
    });
  }
  if (p.manualAdj !== 0) {
    w.push({
      code: "manual_adjustment_applied",
      severity: "info",
      title: "Ajuste manual aplicado",
      description: "Um ajuste manual foi aplicado ao cálculo.",
      relatedField: "manualAdjustmentCents",
      dismissible: true,
    });
  }
  if (p.marginBase !== "total_cost") {
    w.push({
      code: "custom_margin_base",
      severity: "info",
      title: "Base da margem personalizada",
      description: "A margem está sendo calculada sobre uma base diferente do custo total.",
      relatedField: "marginBase",
      dismissible: true,
    });
  }
  // Check for unscheduled success fee in projection
  const unscheduled = p.projection.filter(
    (item) => item.sourceType === "estimated_success_fee" && !item.date
  );
  if (unscheduled.length > 0) {
    w.push({
      code: "projection_contains_unscheduled_values",
      severity: "info",
      title: "Valores sem agendamento na projeção",
      description: "A projeção contém valores de êxito sem data de recebimento estimada.",
      relatedField: "successFeeBps",
      dismissible: true,
    });
  }

  return w;
}

// ── Motor principal ────────────────────────────────────────
export function calculatePricingFee(
  input: PricingCalculationInput
): PricingCalculationResult {
  const calcDate = input.calculationDate;
  const scenarioType: PricingScenarioType = input.scenarioType ?? "main";
  const currency = input.currency ?? "BRL";

  // 1. TRABALHO
  const estimatedHours = nonNull(input.estimatedHours, 0);
  const hourlyRateCents = nonNull(input.hourlyRateCents, 0);
  const workCostCents = hoursToCents(estimatedHours, hourlyRateCents);

  // 2. CUSTOS
  const directExpensesCents = toNonNegativeCents(nonNull(input.directExpensesCents, 0));
  const indirectExpensesCents = toNonNegativeCents(nonNull(input.indirectExpensesCents, 0));
  const thirdPartyCostsCents = toNonNegativeCents(nonNull(input.thirdPartyCostsCents, 0));
  const travelCostsCents = toNonNegativeCents(nonNull(input.travelCostsCents, 0));
  const feesAndTaxesCents = toNonNegativeCents(nonNull(input.feesAndTaxesCents, 0));
  const otherCostsCents = toNonNegativeCents(nonNull(input.otherCostsCents, 0));

  // Custom items
  let customCostsCents = 0;
  if (input.customCostItems) {
    for (const item of input.customCostItems) {
      if (item.includedInClientPrice) {
        customCostsCents += Math.round(item.quantity * item.unitAmountCents);
      }
    }
  }
  customCostsCents = toNonNegativeCents(customCostsCents);

  const totalExpensesCents = sumCents([
    workCostCents,
    directExpensesCents,
    indirectExpensesCents,
    thirdPartyCostsCents,
    travelCostsCents,
    feesAndTaxesCents,
    otherCostsCents,
    customCostsCents,
  ]);

  const totalEstimatedCostCents = totalExpensesCents;

  // 3. MARGEM
  const marginBase: MarginBase = input.marginBase ?? "total_cost";
  let marginBaseCents: number;
  switch (marginBase) {
    case "work_cost":
      marginBaseCents = workCostCents;
      break;
    case "expenses_only":
      marginBaseCents = totalExpensesCents - workCostCents;
      break;
    case "custom_base":
      marginBaseCents = nonNull(input.customMarginBaseCents, 0);
      break;
    case "total_cost":
    default:
      marginBaseCents = totalEstimatedCostCents;
      break;
  }

  const marginBps = toNonNegativeCents(nonNull(input.marginBps, 0));
  const marginAmountCents = applyBasisPoints(marginBaseCents, marginBps);

  // 4. AJUSTE MANUAL
  const manualAdjustmentCents = nonNull(input.manualAdjustmentCents, 0);

  // 5. SUBTOTAL ANTES DO DESCONTO
  const subtotalBeforeDiscountCents = sumCents([
    totalEstimatedCostCents,
    marginAmountCents,
    manualAdjustmentCents,
  ]);

  // 6. DESCONTOS
  const fixedDiscountCents = toNonNegativeCents(nonNull(input.fixedDiscountCents, 0));
  const percentageDiscountBps = toNonNegativeCents(nonNull(input.percentageDiscountBps, 0));
  const percentageDiscountCents = applyBasisPoints(
    subtotalBeforeDiscountCents,
    percentageDiscountBps
  );
  const totalDiscountCents = Math.min(
    sumCents([fixedDiscountCents, percentageDiscountCents]),
    subtotalBeforeDiscountCents
  );

  // 7. VALOR FIXO FINAL
  const fixedFeeTotalCents = subtractCents(
    subtotalBeforeDiscountCents,
    totalDiscountCents
  );

  // 8. ENTRADA E SALDO
  const entryAmountCents = clampCents(
    toNonNegativeCents(nonNull(input.entryAmountCents, 0)),
    0,
    fixedFeeTotalCents
  );
  const financedAmountCents = subtractCents(fixedFeeTotalCents, entryAmountCents);

  // 9. PARCELAMENTO
  const installmentCount = toNonNegativeCents(nonNull(input.installmentCount, 0));
  const installmentFrequency: InstallmentFrequency =
    input.installmentFrequency ?? "monthly";
  let installments: PricingInstallment[] = [];
  let installmentTotalCents = 0;
  let paymentEndDate: string | undefined;

  if (installmentCount > 0 && financedAmountCents > 0) {
    installments = divideIntoInstallments({
      totalCents: financedAmountCents,
      installmentCount,
      firstDueDate: input.firstDueDate ?? calcDate,
      frequency: installmentFrequency,
      customIntervalDays: input.customIntervalDays,
    });
    installmentTotalCents = sumCents(installments.map((i) => i.amountCents));
    paymentEndDate = installments[installments.length - 1]?.dueDate;
  }

  // 10. MENSALIDADE
  const monthlyFeeCents = toNonNegativeCents(nonNull(input.monthlyFeeCents, 0));
  const monthlyFeeCount = toNonNegativeCents(nonNull(input.monthlyFeeCount, 0));
  let monthlyFeeSchedule: PricingMonthlyFeeItem[] = [];
  let monthlyFeeTotalCents = 0;

  if (monthlyFeeCents > 0 && monthlyFeeCount > 0) {
    monthlyFeeSchedule = generateRecurringFees({
      monthlyFeeCents,
      count: monthlyFeeCount,
      firstDueDate: input.monthlyFeeFirstDueDate ?? calcDate,
      frequency: input.monthlyFeeFrequency ?? "monthly",
    });
    monthlyFeeTotalCents = sumCents(monthlyFeeSchedule.map((f) => f.amountCents));
  }

  // 11. ÊXITO
  const successFeeBps = nonNull(input.successFeeBps, 0);
  const successFeeBaseCents = nonNull(input.successFeeBaseCents, 0);
  let estimatedSuccessFeeCents = 0;
  if (successFeeBps > 0 && successFeeBaseCents > 0) {
    const sf = calculateEstimatedSuccessFee({
      percentageBps: successFeeBps,
      baseAmountCents: successFeeBaseCents,
    });
    estimatedSuccessFeeCents = sf.estimatedAmountCents;
  }

  // 12. TOTAL POTENCIAL
  const fixedRevenueCents = fixedFeeTotalCents;
  const recurringRevenueCents = monthlyFeeTotalCents;
  const estimatedSuccessRevenueCents = estimatedSuccessFeeCents;
  const guaranteedRevenueCents = sumCents([fixedRevenueCents, recurringRevenueCents]);
  const nonGuaranteedRevenueCents = estimatedSuccessRevenueCents;
  const totalPotentialRevenueCents = sumCents([
    guaranteedRevenueCents,
    nonGuaranteedRevenueCents,
  ]);

  // 13. Warnings
  const discountPercent = percentageDiscountBps;
  const projectionItems = [
    { sourceType: "entry" as const, date: input.firstDueDate ?? calcDate },
    ...installments.map((i) => ({ sourceType: "installment" as const, date: i.dueDate })),
    ...monthlyFeeSchedule.map((f) => ({ sourceType: "monthly_fee" as const, date: f.dueDate })),
    { sourceType: "estimated_success_fee" as const },
  ];

  const warnings = buildWarnings({
    totalEstimatedCost: totalEstimatedCostCents,
    fixedFeeTotal: fixedFeeTotalCents,
    entryAmount: entryAmountCents,
    installmentCount,
    installmentFinishDate: paymentEndDate ?? calcDate,
    discountPercent,
    hourlyRate: hourlyRateCents,
    totalExpenses: totalExpensesCents,
    manualAdj: manualAdjustmentCents,
    marginBase,
    successFeeBps,
    scenarioType,
    projection: projectionItems,
  });

  // 14. PROJEÇÃO
  const projectionResult =
    buildRevenueProjection({
      entryAmountCents,
      installments,
      monthlyFeeSchedule,
      successFeeResult:
        successFeeBps > 0 && successFeeBaseCents > 0
          ? calculateEstimatedSuccessFee({
              percentageBps: successFeeBps,
              baseAmountCents: successFeeBaseCents,
            })
          : undefined,
      scenarioType,
      calculationDate: calcDate,
    });
  const revenueProjection = projectionResult.timeline;
  const projectionStartDate = projectionResult.startDate;
  const projectionEndDate = projectionResult.endDate;

  // 15. ASSUMPTIONS
  const assumptions: string[] = [
    `Cálculo executado em ${calcDate}.`,
    `Moeda: ${currency}.`,
    `Percentuais representados em basis points (1% = 100 bps).`,
    `Valores monetários em centavos (R$ 1,00 = 100).`,
    `Parcelas arredondadas para o centavo mais próximo, com absorção na última parcela.`,
  ];
  if (marginBps > 0) {
    assumptions.push(
      `Margem de ${marginBps / 100}% aplicada sobre ${marginBase === "total_cost" ? "custo total" : marginBase === "work_cost" ? "custo de trabalho" : marginBase === "expenses_only" ? "despesas" : "base customizada"}.`
    );
  }
  if (totalDiscountCents > 0) {
    assumptions.push(
      `Desconto total de R$ ${(totalDiscountCents / 100).toFixed(2)} aplicado ao subtotal.`
    );
  }
  if (successFeeBps > 0) {
    assumptions.push(
      `Êxito de ${successFeeBps / 100}% é estimativa e não está incluído no valor fixo.`
    );
  }

  // 16. ROUNDING ADJUSTMENTS
  const roundingAdjustments = installments.reduce(
    (sum, i) => sum + Math.abs(i.roundingAdjustmentCents),
    0
  );

  // 17. CONSTRUIR RESULTADO
  const result: PricingCalculationResult = {
    workCostCents,
    estimatedHours,
    hourlyRateCents,
    directExpensesCents,
    indirectExpensesCents,
    thirdPartyCostsCents,
    travelCostsCents,
    feesAndTaxesCents,
    otherCostsCents,
    customCostsCents,
    totalExpensesCents,
    totalEstimatedCostCents,
    marginBaseCents,
    marginAmountCents,
    manualAdjustmentCents,
    subtotalBeforeDiscountCents,
    fixedDiscountCents,
    percentageDiscountCents,
    totalDiscountCents,
    fixedFeeTotalCents,
    entryAmountCents,
    financedAmountCents,
    installments,
    installmentTotalCents,
    installmentCount,
    paymentEndDate,
    monthlyFeeCents,
    monthlyFeeCount,
    monthlyFeeTotalCents,
    monthlyFeeSchedule,
    successFeeBps,
    successFeeBaseCents,
    estimatedSuccessFeeCents,
    successFeeIsGuaranteed: false,
    fixedRevenueCents,
    recurringRevenueCents,
    estimatedSuccessRevenueCents,
    totalPotentialRevenueCents,
    guaranteedRevenueCents,
    nonGuaranteedRevenueCents,
    revenueProjection,
    projectionStartDate,
    projectionEndDate,
    scenarioType,
    calculationVersion: PRICING_CALCULATION_ENGINE_VERSION,
    calculationDate: calcDate,
    warnings,
    assumptions,
    roundingAdjustments,
  };

  return result;
}