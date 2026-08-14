// ============================================================
// CALCULATION TYPES — Motor de cálculo puro
// ETAPA 5.2.2.3 — Tipos e constantes
// ============================================================

import type { PricingScenarioType } from "./types";

// ── Versão do motor ───────────────────────────────────────
export const PRICING_CALCULATION_ENGINE_VERSION = "1.0.0" as const;
export const PRICING_SCHEMA_VERSION = "1" as const;

// ── Frequências ───────────────────────────────────────────
export type InstallmentFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "custom_days";

// ── Bases de margem ───────────────────────────────────────
export type MarginBase = "total_cost" | "work_cost" | "expenses_only" | "custom_base";

// ── Classificações operacionais ────────────────────────────
export type ComplexityLevel = "low" | "medium" | "high" | "very_high";
export type UrgencyLevel = "normal" | "urgent" | "critical";
export type DelinquencyRiskLevel = "low" | "medium" | "high";

// ── Tipos de item customizado ─────────────────────────────
export interface PricingCustomCostItem {
  id?: string;
  type: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
  includedInClientPrice: boolean;
  notes?: string;
}

// ── Entrada de cálculo ────────────────────────────────────
export interface PricingCalculationInput {
  // Identificação
  scenarioType: PricingScenarioType;
  calculationDate: string; // ISO date
  currency: string; // BRL
  serviceSnapshot?: Record<string, unknown>;
  notes?: string;

  // Trabalho
  estimatedHours?: number;
  hourlyRateCents?: number;
  estimatedStages?: number;
  estimatedHearings?: number;
  estimatedDuration?: number;
  durationUnit?: string;

  // Custos
  directExpensesCents?: number;
  indirectExpensesCents?: number;
  thirdPartyCostsCents?: number;
  travelCostsCents?: number;
  feesAndTaxesCents?: number;
  otherCostsCents?: number;
  customCostItems?: PricingCustomCostItem[];

  // Ajustes
  manualAdjustmentCents?: number;
  manualAdjustmentReason?: string;
  marginBase?: MarginBase;
  marginBps?: number;
  customMarginBaseCents?: number;
  fixedDiscountCents?: number;
  percentageDiscountBps?: number;

  // Pagamento fixo
  entryAmountCents?: number;
  installmentCount?: number;
  installmentFrequency?: InstallmentFrequency;
  firstDueDate?: string;
  customIntervalDays?: number;

  // Mensalidade
  monthlyFeeCents?: number;
  monthlyFeeCount?: number;
  monthlyFeeFirstDueDate?: string;
  monthlyFeeFrequency?: InstallmentFrequency;

  // Êxito
  successFeeBps?: number;
  successFeeBaseCents?: number;
  successFeeDescription?: string;

  // Classificações operacionais
  complexity?: ComplexityLevel;
  urgency?: UrgencyLevel;
  delinquencyRisk?: DelinquencyRiskLevel;
}

// ── Item de parcela ───────────────────────────────────────
export interface PricingInstallment {
  number: number;
  amountCents: number;
  dueDate: string;
  principalCents: number;
  roundingAdjustmentCents: number;
  status: string;
}

// ── Item de mensalidade ───────────────────────────────────
export interface PricingMonthlyFeeItem {
  number: number;
  amountCents: number;
  dueDate: string;
  competencyMonth: string; // YYYY-MM
  status: string;
}

// ── Item de projeção ──────────────────────────────────────
export interface ProjectionItem {
  date: string;
  monthKey: string;
  sourceType: "entry" | "installment" | "monthly_fee" | "estimated_success_fee";
  sourceId?: string;
  description: string;
  amountCents: number;
  guaranteed: boolean;
  scenarioType: PricingScenarioType;
}

// ── Resultado de cálculo ──────────────────────────────────
export interface PricingCalculationResult {
  // Trabalho
  workCostCents: number;
  estimatedHours: number;
  hourlyRateCents: number;

  // Custos
  directExpensesCents: number;
  indirectExpensesCents: number;
  thirdPartyCostsCents: number;
  travelCostsCents: number;
  feesAndTaxesCents: number;
  otherCostsCents: number;
  customCostsCents: number;
  totalExpensesCents: number;
  totalEstimatedCostCents: number;

  // Formação do valor
  marginBaseCents: number;
  marginAmountCents: number;
  manualAdjustmentCents: number;
  subtotalBeforeDiscountCents: number;
  fixedDiscountCents: number;
  percentageDiscountCents: number;
  totalDiscountCents: number;
  fixedFeeTotalCents: number;

  // Pagamento
  entryAmountCents: number;
  financedAmountCents: number;
  installments: PricingInstallment[];
  installmentTotalCents: number;
  installmentCount: number;
  paymentEndDate?: string;

  // Mensalidade
  monthlyFeeCents: number;
  monthlyFeeCount: number;
  monthlyFeeTotalCents: number;
  monthlyFeeSchedule: PricingMonthlyFeeItem[];

  // Êxito
  successFeeBps: number;
  successFeeBaseCents: number;
  estimatedSuccessFeeCents: number;
  successFeeIsGuaranteed: false;

  // Total potencial
  fixedRevenueCents: number;
  recurringRevenueCents: number;
  estimatedSuccessRevenueCents: number;
  totalPotentialRevenueCents: number;
  guaranteedRevenueCents: number;
  nonGuaranteedRevenueCents: number;

  // Projeção
  revenueProjection: ProjectionItem[];
  projectionStartDate: string;
  projectionEndDate: string;

  // Metadados
  scenarioType: PricingScenarioType;
  calculationVersion: string;
  calculationDate: string;
  warnings: PricingWarning[];
  assumptions: string[];
  roundingAdjustments: number;
  calculationHash?: string;
}

// ── Warning ───────────────────────────────────────────────
export type PricingWarningSeverity = "info" | "attention" | "important";
export type PricingWarningCode =
  | "value_below_estimated_cost"
  | "no_entry"
  | "full_entry"
  | "long_installment_term"
  | "high_discount"
  | "no_hourly_cost"
  | "no_expenses"
  | "estimated_success_fee"
  | "manual_adjustment_applied"
  | "custom_margin_base"
  | "scenario_without_overrides"
  | "projection_contains_unscheduled_values";

export interface PricingWarning {
  code: PricingWarningCode;
  severity: PricingWarningSeverity;
  title: string;
  description: string;
  relatedField?: string;
  dismissible: boolean;
}

// ── Memória de cálculo ────────────────────────────────────
export type PricingMemoryVisibility = "internal" | "restricted" | "proposal_safe_future";

export interface PricingMemoryItem {
  label: string;
  description?: string;
  formula?: string;
  inputValues: Record<string, unknown>;
  amountCents?: number;
  percentageBps?: number;
  result: unknown;
  visibility: PricingMemoryVisibility;
  order: number;
}

export interface PricingMemorySection {
  id: string;
  title: string;
  items: PricingMemoryItem[];
}

export interface PricingCalculationMemory {
  engineVersion: string;
  schemaVersion: string;
  calculatedAt: string;
  scenarioType: PricingScenarioType;
  sections: PricingMemorySection[];
  warnings: PricingWarning[];
  assumptions: string[];
  disclaimer: string;
}

// ── Override de cenário ───────────────────────────────────
export interface PricingScenarioOverride {
  name: string;
  type: PricingScenarioType;
  overrides: Partial<PricingCalculationInput>;
}

// ── Resultado de cenário ──────────────────────────────────
export interface PricingScenarioResult {
  scenarioType: PricingScenarioType;
  name: string;
  input: PricingCalculationInput;
  result: PricingCalculationResult;
  memory: PricingCalculationMemory;
}

// ── Diferença entre cenários ──────────────────────────────
export interface PricingScenarioDifference {
  field: string;
  label: string;
  absoluteDelta: number;
  percentageDelta: number;
  baseValue: number;
  compareValue: number;
}

export interface PricingScenarioComparison {
  main: PricingScenarioResult;
  others: PricingScenarioResult[];
  differences: PricingScenarioDifference[];
}

// ── Hash normalizado ──────────────────────────────────────
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