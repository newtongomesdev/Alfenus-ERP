/**
 * Service Catalog Types
 * Types for the service catalog (CATÁLOGO DE SERVIÇOS JURÍDICOS)
 */

// ── Status ──────────────────────────────────────────────────
export type ServiceStatus = "rascunho" | "ativo" | "inativo" | "arquivado";

// ── Charging models ─────────────────────────────────────────
export type ChargingModel =
  | "consulta"
  | "fixo"
  | "parcelado"
  | "mensalidade"
  | "por_hora"
  | "por_atividade"
  | "exito"
  | "hibrido"
  | "personalizado";

// ── Duration units ──────────────────────────────────────────
export type DurationUnit = "horas" | "dias" | "semanas" | "meses";

// ── Service Catalog Row (database) ──────────────────────────
export interface ServiceCatalogRow {
  id: string;
  law_firm_id: string;
  name: string;
  slug: string;
  practice_area: string;
  category: string;
  short_description: string | null;
  public_description: string | null;
  internal_description: string | null;
  scope_included: string | null;
  scope_excluded: string | null;
  estimated_duration: number | null;
  duration_unit: string;
  estimated_hours: number | null;
  reference_value_cents: number | null;
  min_value_cents: number | null;
  max_value_cents: number | null;
  currency: string;
  charging_model: string;
  default_upfront_cents: number | null;
  default_installments: number | null;
  success_fee_percentage: number | null;
  included_expenses: string | null;
  excluded_expenses: string | null;
  required_documents: string | null;
  suggested_steps: string | null;
  estimated_deadline: number | null;
  deadline_unit: string;
  proposal_template_id: string | null;
  contract_template_id: string | null;
  checklist_template_id: string | null;
  status: ServiceStatus;
  sort_order: number;
  is_favorite: boolean;
  is_platform_library: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// ── Service Catalog Insert ──────────────────────────────────
export interface ServiceCatalogInsert {
  id?: string;
  law_firm_id: string;
  name: string;
  slug: string;
  practice_area: string;
  category?: string;
  short_description?: string | null;
  public_description?: string | null;
  internal_description?: string | null;
  scope_included?: string | null;
  scope_excluded?: string | null;
  estimated_duration?: number | null;
  duration_unit?: string;
  estimated_hours?: number | null;
  reference_value_cents?: number | null;
  min_value_cents?: number | null;
  max_value_cents?: number | null;
  currency?: string;
  charging_model?: string;
  default_upfront_cents?: number | null;
  default_installments?: number | null;
  success_fee_percentage?: number | null;
  included_expenses?: string | null;
  excluded_expenses?: string | null;
  required_documents?: string | null;
  suggested_steps?: string | null;
  estimated_deadline?: number | null;
  deadline_unit?: string;
  proposal_template_id?: string | null;
  contract_template_id?: string | null;
  checklist_template_id?: string | null;
  status?: ServiceStatus;
  sort_order?: number;
  is_favorite?: boolean;
  is_platform_library?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
}

// ── Service Form Input (frontend) ───────────────────────────
export interface ServiceFormInput {
  name: string;
  slug: string;
  practice_area: string;
  category?: string;
  short_description?: string;
  public_description?: string;
  internal_description?: string;
  scope_included?: string;
  scope_excluded?: string;
  estimated_duration?: number;
  duration_unit?: string;
  estimated_hours?: number;
  reference_value_cents?: number;
  min_value_cents?: number;
  max_value_cents?: number;
  currency?: string;
  charging_model?: string;
  default_upfront_cents?: number;
  default_installments?: number;
  success_fee_percentage?: number;
  included_expenses?: string;
  excluded_expenses?: string;
  required_documents?: string;
  suggested_steps?: string;
  estimated_deadline?: number;
  deadline_unit?: string;
  status?: ServiceStatus;
}

// ── Service Overview (for list view) ─────────────────────────
export interface ServiceOverview {
  id: string;
  name: string;
  slug: string;
  practice_area: string;
  short_description: string | null;
  reference_value_cents: number | null;
  charging_model: string;
  status: ServiceStatus;
  is_favorite: boolean;
  is_platform_library: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// ── Service Detail (for detail/edit view) ────────────────────
export interface ServiceDetail extends ServiceCatalogRow {
  // Computed fields
  reference_value_display?: string;
  min_value_display?: string;
  max_value_display?: string;
}

// ── Status badge config ──────────────────────────────────────
export interface ServiceStatusConfig {
  label: string;
  color: string;
}