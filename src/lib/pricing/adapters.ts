// ============================================================
// ADAPTERS — Adaptadores de persistência entre motor e banco
// Motor puro, determinístico, sem side effects
// ============================================================

import type {
  PricingCalculationInput,
  PricingCalculationResult,
  PricingCalculationMemory,
  PricingInstallment,
  PricingMonthlyFeeItem,
  ProjectionItem,
  PricingWarning,
  PricingCustomCostItem,
} from "./calculation-types";
import type {
  PricingScenarioType,
  PricingScenarioVersionRow,
  PricingScenarioItemRow,
  PricingParameters,
} from "./types";


// ── 1. Input → Version Payload ─────────────────────────────
export interface PricingVersionPayload {
  law_firm_id: string;
  pricing_scenario_id: string;
  created_by: string;
  version_number: number;
  scenario_type: PricingScenarioType;
  parameters: PricingParameters;
  calculation_result: Record<string, unknown>;
  calculation_memory: Record<string, unknown>;
  currency: string;
  total_amount_cents: number;
  entry_amount_cents: number;
  financed_amount_cents: number;
  installment_count: number;
  success_fee_percentage_bps: number;
  success_fee_base_cents: number | null;
  estimated_success_fee_cents: number | null;
  monthly_fee_cents: number | null;
  monthly_fee_count: number | null;
}

/**
 * Converte PricingCalculationInput em payload para inserção de versão.
 */
export function pricingInputToVersionPayload(params: {
  input: PricingCalculationInput;
  result: PricingCalculationResult;
  memory: PricingCalculationMemory;
  lawFirmId: string;
  pricingScenarioId: string;
  createdBy: string;
  versionNumber: number;
}): PricingVersionPayload {
  const { input, result, memory, lawFirmId, pricingScenarioId, createdBy, versionNumber } = params;

  const parameters: PricingParameters = {
    service_snapshot: input.serviceSnapshot as PricingParameters["service_snapshot"],
    custom_inputs: input.notes ? { notes: input.notes } : undefined,
    notes: input.notes,
  };

  const totalAmountCents = result.fixedFeeTotalCents ?? 0;

  return {
    law_firm_id: lawFirmId,
    pricing_scenario_id: pricingScenarioId,
    created_by: createdBy,
    version_number: versionNumber,
    scenario_type: input.scenarioType,
    parameters,
    calculation_result: result as unknown as Record<string, unknown>,
    calculation_memory: memory as unknown as Record<string, unknown>,
    currency: input.currency ?? "BRL",
    total_amount_cents: totalAmountCents,
    entry_amount_cents: result.entryAmountCents ?? 0,
    financed_amount_cents: result.financedAmountCents ?? 0,
    installment_count: result.installmentCount ?? 0,
    success_fee_percentage_bps: result.successFeeBps ?? 0,
    success_fee_base_cents: result.successFeeBaseCents ?? null,
    estimated_success_fee_cents: result.estimatedSuccessFeeCents ?? null,
    monthly_fee_cents: result.monthlyFeeCents ?? null,
    monthly_fee_count: result.monthlyFeeCount ?? null,
  };
}

// ── 2. Result → Version Items ──────────────────────────────
export interface VersionItemPayload {
  law_firm_id: string;
  scenario_version_id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  order_index: number;
  metadata: Record<string, unknown>;
}

/**
 * Converte os itens de resultado (parcelas, mensalidades, custos customizados)
 * em items de versão para persistência.
 */
export function pricingResultToVersionItems(params: {
  result: PricingCalculationResult;
  lawFirmId: string;
  scenarioVersionId: string;
}): VersionItemPayload[] {
  const { result, lawFirmId, scenarioVersionId } = params;
  const items: VersionItemPayload[] = [];
  let orderIndex = 0;

  // 1. Trabalho
  if (result.workCostCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "work_hours",
      description: `Trabalho — ${result.estimatedHours}h × ${result.hourlyRateCents} cts/h`,
      quantity: result.estimatedHours,
      unit_amount_cents: result.hourlyRateCents,
      total_amount_cents: result.workCostCents,
      order_index: orderIndex++,
      metadata: { estimatedHours: result.estimatedHours, hourlyRateCents: result.hourlyRateCents },
    });
  }

  // 2. Despesas diretas
  if (result.directExpensesCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "direct_expense",
      description: "Despesas diretas",
      quantity: 1,
      unit_amount_cents: result.directExpensesCents,
      total_amount_cents: result.directExpensesCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 3. Despesas indiretas
  if (result.indirectExpensesCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "indirect_expense",
      description: "Despesas indiretas",
      quantity: 1,
      unit_amount_cents: result.indirectExpensesCents,
      total_amount_cents: result.indirectExpensesCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 4. Custos de terceiros
  if (result.thirdPartyCostsCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "third_party_cost",
      description: "Custos de terceiros",
      quantity: 1,
      unit_amount_cents: result.thirdPartyCostsCents,
      total_amount_cents: result.thirdPartyCostsCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 5. Deslocamento
  if (result.travelCostsCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "travel",
      description: "Custos de deslocamento",
      quantity: 1,
      unit_amount_cents: result.travelCostsCents,
      total_amount_cents: result.travelCostsCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 6. Impostos e taxas
  if (result.feesAndTaxesCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "tax",
      description: "Impostos e taxas",
      quantity: 1,
      unit_amount_cents: result.feesAndTaxesCents,
      total_amount_cents: result.feesAndTaxesCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 7. Outros custos
  if (result.otherCostsCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "other",
      description: "Outros custos",
      quantity: 1,
      unit_amount_cents: result.otherCostsCents,
      total_amount_cents: result.otherCostsCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 8. Ajustes manuais
  if (result.manualAdjustmentCents !== 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "adjustment",
      description: "Ajuste manual",
      quantity: 1,
      unit_amount_cents: Math.abs(result.manualAdjustmentCents),
      total_amount_cents: result.manualAdjustmentCents,
      order_index: orderIndex++,
      metadata: {},
    });
  }

  // 9. Descontos
  if (result.totalDiscountCents > 0) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "discount",
      description: "Desconto",
      quantity: 1,
      unit_amount_cents: result.totalDiscountCents,
      total_amount_cents: -result.totalDiscountCents,
      order_index: orderIndex++,
      metadata: {
        fixedDiscountCents: result.fixedDiscountCents,
        percentageDiscountCents: result.percentageDiscountCents,
      },
    });
  }

  // 10. Parcelas
  for (const inst of result.installments) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "fee",
      description: `Parcela ${inst.number}`,
      quantity: 1,
      unit_amount_cents: inst.amountCents,
      total_amount_cents: inst.amountCents,
      order_index: orderIndex++,
      metadata: { dueDate: inst.dueDate, roundingAdjustmentCents: inst.roundingAdjustmentCents },
    });
  }

  // 11. Mensalidades
  for (const fee of result.monthlyFeeSchedule) {
    items.push({
      law_firm_id: lawFirmId,
      scenario_version_id: scenarioVersionId,
      item_type: "fee",
      description: `Mensalidade ${fee.number}`,
      quantity: 1,
      unit_amount_cents: fee.amountCents,
      total_amount_cents: fee.amountCents,
      order_index: orderIndex++,
      metadata: { dueDate: fee.dueDate, competencyMonth: fee.competencyMonth },
    });
  }

  return items;
}

// ── 3. Memory → Version Payload ────────────────────────────
/**
 * Serializa PricingCalculationMemory para armazenamento no banco (JSON).
 */
export function pricingMemoryToVersionPayload(
  memory: PricingCalculationMemory,
): Record<string, unknown> {
  return memory as unknown as Record<string, unknown>;
}

// ── 4. Version → CalculationResult ─────────────────────────
/**
 * Converte dados de uma versão do banco de volta para o resultado do engine.
 */
export function pricingVersionToCalculationResult(
  version: PricingScenarioVersionRow,
): PricingCalculationResult {
  // O calculation_result é armazenado como JSON no banco
  const raw = version.calculation_result as unknown as Partial<PricingCalculationResult>;
  return {
    workCostCents: raw.workCostCents ?? 0,
    estimatedHours: raw.estimatedHours ?? 0,
    hourlyRateCents: raw.hourlyRateCents ?? 0,
    directExpensesCents: raw.directExpensesCents ?? 0,
    indirectExpensesCents: raw.indirectExpensesCents ?? 0,
    thirdPartyCostsCents: raw.thirdPartyCostsCents ?? 0,
    travelCostsCents: raw.travelCostsCents ?? 0,
    feesAndTaxesCents: raw.feesAndTaxesCents ?? 0,
    otherCostsCents: raw.otherCostsCents ?? 0,
    customCostsCents: raw.customCostsCents ?? 0,
    totalExpensesCents: raw.totalExpensesCents ?? 0,
    totalEstimatedCostCents: raw.totalEstimatedCostCents ?? 0,
    marginBaseCents: raw.marginBaseCents ?? 0,
    marginAmountCents: raw.marginAmountCents ?? 0,
    manualAdjustmentCents: raw.manualAdjustmentCents ?? 0,
    subtotalBeforeDiscountCents: raw.subtotalBeforeDiscountCents ?? 0,
    fixedDiscountCents: raw.fixedDiscountCents ?? 0,
    percentageDiscountCents: raw.percentageDiscountCents ?? 0,
    totalDiscountCents: raw.totalDiscountCents ?? 0,
    fixedFeeTotalCents: raw.fixedFeeTotalCents ?? 0,
    entryAmountCents: raw.entryAmountCents ?? 0,
    financedAmountCents: raw.financedAmountCents ?? 0,
    installments: (raw.installments as PricingInstallment[]) ?? [],
    installmentTotalCents: raw.installmentTotalCents ?? 0,
    installmentCount: raw.installmentCount ?? 0,
    paymentEndDate: raw.paymentEndDate,
    monthlyFeeCents: raw.monthlyFeeCents ?? 0,
    monthlyFeeCount: raw.monthlyFeeCount ?? 0,
    monthlyFeeTotalCents: raw.monthlyFeeTotalCents ?? 0,
    monthlyFeeSchedule: (raw.monthlyFeeSchedule as PricingMonthlyFeeItem[]) ?? [],
    successFeeBps: raw.successFeeBps ?? 0,
    successFeeBaseCents: raw.successFeeBaseCents ?? 0,
    estimatedSuccessFeeCents: raw.estimatedSuccessFeeCents ?? 0,
    successFeeIsGuaranteed: false as const,
    fixedRevenueCents: raw.fixedRevenueCents ?? 0,
    recurringRevenueCents: raw.recurringRevenueCents ?? 0,
    estimatedSuccessRevenueCents: raw.estimatedSuccessRevenueCents ?? 0,
    totalPotentialRevenueCents: raw.totalPotentialRevenueCents ?? 0,
    guaranteedRevenueCents: raw.guaranteedRevenueCents ?? 0,
    nonGuaranteedRevenueCents: raw.nonGuaranteedRevenueCents ?? 0,
    revenueProjection: (raw.revenueProjection as ProjectionItem[]) ?? [],
    projectionStartDate: raw.projectionStartDate ?? "",
    projectionEndDate: raw.projectionEndDate ?? "",
    scenarioType: raw.scenarioType ?? "main",
    calculationVersion: raw.calculationVersion ?? "1.0.0",
    calculationDate: raw.calculationDate ?? "",
    warnings: (raw.warnings as PricingWarning[]) ?? [],
    assumptions: (raw.assumptions as string[]) ?? [],
    roundingAdjustments: raw.roundingAdjustments ?? 0,
    calculationHash: raw.calculationHash,
  };
}

// ── 5. Version → Calculation Input ─────────────────────────
/**
 * Converte uma versão do banco para o input do engine (para re-cálculo).
 */
export function pricingVersionToCalculationInput(
  version: PricingScenarioVersionRow,
): PricingCalculationInput {
  const params = version.parameters;
  const customInputs = params?.custom_inputs ?? {};

  return {
    scenarioType: version.scenario_type,
    calculationDate: version.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    currency: version.currency ?? "BRL",
    serviceSnapshot: params?.service_snapshot as Record<string, unknown> | undefined,
    notes: params?.notes ?? (customInputs as Record<string, unknown>).notes as string | undefined,

    // Extrair valores de custom_inputs se disponível
    estimatedHours: (customInputs as Record<string, unknown>).estimatedHours as number | undefined,
    hourlyRateCents: (customInputs as Record<string, unknown>).hourlyRateCents as number | undefined,

    // Valores do resultado armazenado
    entryAmountCents: version.entry_amount_cents ?? undefined,
    installmentCount: version.installment_count ?? undefined,
    successFeeBps: version.success_fee_percentage_bps ?? undefined,
    successFeeBaseCents: version.success_fee_base_cents ?? undefined,
    monthlyFeeCents: version.monthly_fee_cents ?? undefined,
    monthlyFeeCount: version.monthly_fee_count ?? undefined,
  };
}

// ── 6. Items → CustomCostItems ─────────────────────────────
/**
 * Converte PricingScenarioItemRow[] do banco para PricingCustomCostItem[] do engine.
 */
export function pricingItemsToCustomCostItems(
  items: PricingScenarioItemRow[],
): PricingCustomCostItem[] {
  return items
    .filter((item) => item.metadata?.includedInClientPrice === true)
    .map((item) => ({
      id: item.id,
      type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unitAmountCents: item.unit_amount_cents,
      totalAmountCents: item.total_amount_cents,
      includedInClientPrice: true,
      notes: (item.metadata as Record<string, unknown>).notes as string | undefined,
    }));
}

// ── 7. Normalize Input ─────────────────────────────────────
export interface PricingNormalizedInput {
  scenarioType: string;
  currency: string;
  estimatedHours: number;
  hourlyRateCents: number;
  directExpensesCents: number;
  indirectExpensesCents: number;
  thirdPartyCostsCents: number;
  travelCostsCents: number;
  feesAndTaxesCents: number;
  otherCostsCents: number;
  manualAdjustmentCents: number;
  marginBps: number;
  fixedDiscountCents: number;
  percentageDiscountBps: number;
  entryAmountCents: number;
  installmentCount: number;
  monthlyFeeCents: number;
  monthlyFeeCount: number;
  successFeeBps: number;
  successFeeBaseCents: number;
}

/**
 * Normaliza um PricingCalculationInput para comparação e hash.
 */
export function normalizePricingInput(input: PricingCalculationInput): PricingNormalizedInput {
  return {
    scenarioType: input.scenarioType,
    currency: input.currency ?? "BRL",
    estimatedHours: input.estimatedHours ?? 0,
    hourlyRateCents: input.hourlyRateCents ?? 0,
    directExpensesCents: input.directExpensesCents ?? 0,
    indirectExpensesCents: input.indirectExpensesCents ?? 0,
    thirdPartyCostsCents: input.thirdPartyCostsCents ?? 0,
    travelCostsCents: input.travelCostsCents ?? 0,
    feesAndTaxesCents: input.feesAndTaxesCents ?? 0,
    otherCostsCents: input.otherCostsCents ?? 0,
    manualAdjustmentCents: input.manualAdjustmentCents ?? 0,
    marginBps: input.marginBps ?? 0,
    fixedDiscountCents: input.fixedDiscountCents ?? 0,
    percentageDiscountBps: input.percentageDiscountBps ?? 0,
    entryAmountCents: input.entryAmountCents ?? 0,
    installmentCount: input.installmentCount ?? 0,
    monthlyFeeCents: input.monthlyFeeCents ?? 0,
    monthlyFeeCount: input.monthlyFeeCount ?? 0,
    successFeeBps: input.successFeeBps ?? 0,
    successFeeBaseCents: input.successFeeBaseCents ?? 0,
  };
}

// ── 8. Hash ────────────────────────────────────────────────
/**
 * Gera um hash determinístico de um input normalizado.
 * Usa simples concatenação de valores para hash determinístico.
 */
export function generateInputHash(input: PricingNormalizedInput): string {
  const parts = [
    input.scenarioType,
    input.currency,
    input.estimatedHours,
    input.hourlyRateCents,
    input.directExpensesCents,
    input.indirectExpensesCents,
    input.thirdPartyCostsCents,
    input.travelCostsCents,
    input.feesAndTaxesCents,
    input.otherCostsCents,
    input.manualAdjustmentCents,
    input.marginBps,
    input.fixedDiscountCents,
    input.percentageDiscountBps,
    input.entryAmountCents,
    input.installmentCount,
    input.monthlyFeeCents,
    input.monthlyFeeCount,
    input.successFeeBps,
    input.successFeeBaseCents,
  ];
  const str = parts.join("|");
  // Hash simples e determinístico (djb2)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return `v1-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}