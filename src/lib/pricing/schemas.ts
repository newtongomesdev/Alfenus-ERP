// ============================================================
// SCHEMAS ZOD — Pricing Scenarios
// ETAPA 5.2.2.2 — Simulador de Honorários
// ============================================================

import { z } from "zod";
import type {
  PricingScenarioStatus,
  PricingScenarioType,
  PricingItemType,
  PricingEventType,
} from "./types";
import { PRICING_LIMITS } from "./constants";

// ── Enums ──────────────────────────────────────────────────
export const pricingScenarioStatusSchema = z.enum([
  "draft",
  "saved",
  "archived",
  "converted_to_proposal",
]) satisfies z.ZodType<PricingScenarioStatus>;

export const pricingScenarioTypeSchema = z.enum([
  "conservative",
  "main",
  "expanded",
  "custom",
]) satisfies z.ZodType<PricingScenarioType>;

export const pricingItemTypeSchema = z.enum([
  "work_hours",
  "direct_expense",
  "indirect_expense",
  "third_party_cost",
  "travel",
  "hearing",
  "activity",
  "fee",
  "tax",
  "adjustment",
  "discount",
  "other",
]) satisfies z.ZodType<PricingItemType>;

export const pricingEventTypeSchema = z.enum([
  "scenario_created",
  "scenario_updated",
  "scenario_duplicated",
  "scenario_archived",
  "scenario_restored",
  "version_created",
  "version_activated",
  "comparison_generated",
  "memory_viewed",
  "memory_printed",
  "memory_exported",
  "conversion_started",
  "conversion_completed",
  "conversion_failed",
]) satisfies z.ZodType<PricingEventType>;

// ── Service Snapshot (dentro de parameters) ────────────────
const serviceSnapshotSchema = z
  .object({
    name: z.string().min(1),
    practice_area: z.string().min(1),
    charging_model: z.string().min(1),
    duration_unit: z.string(),
    estimated_duration: z.number().int().nullable(),
    estimated_hours: z.number().int().nullable(),
    reference_value_cents: z.number().int().nullable(),
    min_value_cents: z.number().int().nullable(),
    max_value_cents: z.number().int().nullable(),
    default_upfront_cents: z.number().int().nullable(),
    default_installments: z.number().int().nullable(),
    success_fee_percentage: z.number().nullable(),
    scope_included: z.string().nullable(),
    scope_excluded: z.string().nullable(),
    included_expenses: z.string().nullable(),
    excluded_expenses: z.string().nullable(),
    required_documents: z.string().nullable(),
    suggested_steps: z.string().nullable(),
  })
  .strict();

// ── PricingParameters ──────────────────────────────────────
export const pricingParametersSchema = z
  .object({
    service_snapshot: serviceSnapshotSchema.optional(),
    custom_inputs: z.record(z.string(), z.unknown()).optional(),
    scenario_multiplier: z.number().min(0).max(10).optional(),
    notes: z.string().max(PRICING_LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  })
  .strict() satisfies z.ZodType<import("./types").PricingParameters>;

// ── PricingCalculationResult ───────────────────────────────
const breakdownItemSchema = z.object({
  label: z.string(),
  value_cents: z.number().int(),
  description: z.string().optional(),
});

export const pricingCalculationResultSchema = z
  .object({
    base_fee_cents: z.number().int().optional(),
    expenses_cents: z.number().int().optional(),
    tax_estimate_cents: z.number().int().optional(),
    total_fee_cents: z.number().int().optional(),
    breakdown: z.array(breakdownItemSchema).optional(),
  })
  .strict() satisfies z.ZodType<import("./types").PricingCalculationResult>;

// ── PricingCalculationMemory ───────────────────────────────
const memoryStepSchema = z.object({
  step: z.string(),
  description: z.string(),
  value: z.unknown(),
});

export const pricingCalculationMemorySchema = z
  .object({
    inputs: z.record(z.string(), z.unknown()).optional(),
    steps: z.array(memoryStepSchema).optional(),
    assumptions: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  })
  .strict() satisfies z.ZodType<import("./types").PricingCalculationMemory>;

// ── Scenario ───────────────────────────────────────────────
export const pricingScenarioSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(PRICING_LIMITS.MAX_NAME_LENGTH),
    description: z
      .string()
      .max(PRICING_LIMITS.MAX_DESCRIPTION_LENGTH)
      .nullable()
      .optional(),
    status: pricingScenarioStatusSchema.optional(),
    service_id: z.string().uuid().nullable().optional(),
    lead_id: z.string().uuid().nullable().optional(),
    client_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const pricingScenarioFilterSchema = z
  .object({
    status: pricingScenarioStatusSchema.optional(),
    service_id: z.string().uuid().optional(),
    client_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional(),
    created_by: z.string().uuid().optional(),
    scenario_type: pricingScenarioTypeSchema.optional(),
    search: z.string().max(200).optional(),
    include_archived: z.boolean().optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

// ── Version ────────────────────────────────────────────────
export const pricingScenarioVersionSchema = z
  .object({
    pricing_scenario_id: z.string().uuid(),
    scenario_type: pricingScenarioTypeSchema,
    parameters: pricingParametersSchema,
    calculation_result: pricingCalculationResultSchema,
    calculation_memory: pricingCalculationMemorySchema,
    currency: z.string().min(3).max(3).default("BRL"),
    total_amount_cents: z.number().int().min(0),
    entry_amount_cents: z.number().int().min(0),
    financed_amount_cents: z.number().int().min(0),
    installment_count: z.number().int().min(0),
    success_fee_percentage_bps: z
      .number()
      .int()
      .min(0)
      .max(PRICING_LIMITS.MAX_BPS),
    success_fee_base_cents: z.number().int().nullable().optional(),
    estimated_success_fee_cents: z.number().int().nullable().optional(),
    monthly_fee_cents: z.number().int().min(0).nullable().optional(),
    monthly_fee_count: z.number().int().min(0).nullable().optional(),
    activate: z.boolean().optional(),
  })
  .refine(
    (data) => data.entry_amount_cents <= data.total_amount_cents,
    { message: "Entrada não pode exceder o total" }
  );

// ── Item ───────────────────────────────────────────────────
export const pricingScenarioItemSchema = z
  .object({
    item_type: pricingItemTypeSchema,
    description: z.string().min(1).max(500),
    quantity: z.number().min(0),
    unit_amount_cents: z.number().int().min(0),
    total_amount_cents: z.number().int().min(0),
    order_index: z.number().int().min(0),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ── Event ──────────────────────────────────────────────────
export const pricingScenarioEventSchema = z
  .object({
    pricing_scenario_id: z.string().uuid(),
    version_id: z.string().uuid().nullable().optional(),
    event_type: pricingEventTypeSchema,
    safe_metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ── Active Version ─────────────────────────────────────────
export const setActiveVersionSchema = z
  .object({
    scenario_id: z.string().uuid(),
    version_id: z.string().uuid(),
  })
  .strict();

// ── Duplicate ──────────────────────────────────────────────
export const duplicateScenarioSchema = z
  .object({
    source_scenario_id: z.string().uuid(),
    new_name: z
      .string()
      .max(PRICING_LIMITS.MAX_NAME_LENGTH)
      .optional(),
  })
  .strict();

// ── Types de inferência ────────────────────────────────────
export type PricingScenarioInput = z.infer<typeof pricingScenarioSchema>;
export type PricingScenarioFilterInput = z.infer<
  typeof pricingScenarioFilterSchema
>;
export type PricingScenarioVersionInput = z.infer<
  typeof pricingScenarioVersionSchema
>;
export type PricingScenarioItemInput = z.infer<
  typeof pricingScenarioItemSchema
>;
export type SetActiveVersionInput = z.infer<typeof setActiveVersionSchema>;
export type DuplicateScenarioInput = z.infer<typeof duplicateScenarioSchema>;
