// ============================================================
// TIPOS — Pricing Scenarios (Cenários de Precificação)
// ETAPA 5.2.2.2 — Simulador de Honorários
// ============================================================

// ── Enums de domínio ───────────────────────────────────────
export type PricingScenarioStatus =
  | "draft"
  | "saved"
  | "archived"
  | "converted_to_proposal";

export type PricingScenarioType =
  | "conservative"
  | "main"
  | "expanded"
  | "custom";

export type PricingItemType =
  | "work_hours"
  | "direct_expense"
  | "indirect_expense"
  | "third_party_cost"
  | "travel"
  | "hearing"
  | "activity"
  | "fee"
  | "tax"
  | "adjustment"
  | "discount"
  | "other";

export type PricingEventType =
  | "scenario_created"
  | "scenario_updated"
  | "scenario_duplicated"
  | "scenario_archived"
  | "scenario_restored"
  | "version_created"
  | "version_activated"
  | "comparison_generated"
  | "memory_viewed"
  | "memory_printed"
  | "memory_exported"
  | "conversion_started"
  | "conversion_completed"
  | "conversion_failed";

// ── Rows do banco ──────────────────────────────────────────
export interface PricingScenarioRow {
  id: string;
  law_firm_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: PricingScenarioStatus;
  service_id: string | null;
  lead_id: string | null;
  client_id: string | null;
  active_version_id: string | null;
  converted_proposal_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PricingScenarioInsert {
  law_firm_id: string;
  created_by: string;
  name: string;
  description?: string;
  status?: PricingScenarioStatus;
  service_id?: string;
  lead_id?: string;
  client_id?: string;
  active_version_id?: string;
}

export interface PricingScenarioVersionRow {
  id: string;
  law_firm_id: string;
  pricing_scenario_id: string;
  created_by: string;
  version_number: number;
  scenario_type: PricingScenarioType;
  parameters: PricingParameters;
  calculation_result: PricingCalculationResult;
  calculation_memory: PricingCalculationMemory;
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
  created_at: string;
}

export interface PricingScenarioVersionInsert {
  law_firm_id: string;
  pricing_scenario_id: string;
  created_by: string;
  version_number: number;
  scenario_type?: PricingScenarioType;
  parameters?: PricingParameters;
  calculation_result?: PricingCalculationResult;
  calculation_memory?: PricingCalculationMemory;
  currency?: string;
  total_amount_cents?: number;
  entry_amount_cents?: number;
  financed_amount_cents?: number;
  installment_count?: number;
  success_fee_percentage_bps?: number;
  success_fee_base_cents?: number;
  estimated_success_fee_cents?: number;
  monthly_fee_cents?: number;
  monthly_fee_count?: number;
}

export interface PricingScenarioItemRow {
  id: string;
  law_firm_id: string;
  scenario_version_id: string;
  item_type: PricingItemType;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PricingScenarioEventRow {
  id: string;
  law_firm_id: string;
  pricing_scenario_id: string;
  version_id: string | null;
  event_type: PricingEventType;
  actor_id: string;
  safe_metadata: Record<string, unknown>;
  created_at: string;
}

// ── Estruturas JSON ────────────────────────────────────────
export interface PricingParameters {
  service_snapshot?: {
    name: string;
    practice_area: string;
    charging_model: string;
    duration_unit: string;
    estimated_duration: number | null;
    estimated_hours: number | null;
    reference_value_cents: number | null;
    min_value_cents: number | null;
    max_value_cents: number | null;
    default_upfront_cents: number | null;
    default_installments: number | null;
    success_fee_percentage: number | null;
    scope_included: string | null;
    scope_excluded: string | null;
    included_expenses: string | null;
    excluded_expenses: string | null;
    required_documents: string | null;
    suggested_steps: string | null;
  };
  custom_inputs?: Record<string, unknown>;
  scenario_multiplier?: number;
  notes?: string;
}

export interface PricingCalculationResult {
  base_fee_cents?: number;
  expenses_cents?: number;
  tax_estimate_cents?: number;
  total_fee_cents?: number;
  breakdown?: Array<{
    label: string;
    value_cents: number;
    description?: string;
  }>;
}

export interface PricingCalculationMemory {
  inputs?: Record<string, unknown>;
  steps?: Array<{
    step: string;
    description: string;
    value: unknown;
  }>;
  assumptions?: string[];
  warnings?: string[];
}

// ── DTOs de leitura ────────────────────────────────────────
export interface PricingScenarioOverview {
  id: string;
  name: string;
  description: string | null;
  status: PricingScenarioStatus;
  service_id: string | null;
  service_name?: string;
  lead_id: string | null;
  client_id: string | null;
  client_name?: string;
  created_by: string;
  creator_name?: string;
  active_version_id: string | null;
  active_version_number?: number;
  total_amount_cents: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PricingScenarioDetail extends PricingScenarioOverview {
  lead_name?: string;
  converted_proposal_id: string | null;
  versions_count: number;
  events_count: number;
  last_event_at: string | null;
}

// ── Config ─────────────────────────────────────────────────
export interface PricingScenarioStatusConfig {
  label: string;
  color: string;
  description: string;
}

export interface PricingScenarioTypeConfig {
  label: string;
  color: string;
  description: string;
  multiplier: number;
}
