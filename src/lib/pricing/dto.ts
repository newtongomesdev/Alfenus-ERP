/**
 * ETAPA 5.2.2.4 — DTOs com visibilidade condicional.
 *
 * Papéis: owner, lawyer, assistant
 * Campos condicionais: view_internal_costs, view_internal_margin
 *
 * Regra: quem não tem permissão recebe null nos campos protegidos.
 */

import type { PricingScenarioRow, PricingScenarioVersionRow } from "./types";

// ─── Papéis ────────────────────────────────────────────

export type UserRole = "owner" | "lawyer" | "assistant" | "supported";

// ─── Visibilidade ──────────────────────────────────────

export interface VisibilityContext {
  role: UserRole;
  userId: string;
  isOwner: boolean;
  isAssisted: boolean;
}

export function canViewCosts(ctx: VisibilityContext): boolean {
  if (ctx.isAssisted) return false;
  return ctx.role === "owner" || ctx.role === "lawyer";
}

export function canViewMargin(ctx: VisibilityContext): boolean {
  if (ctx.isAssisted) return false;
  return ctx.role === "owner";
}

export function canViewMemory(ctx: VisibilityContext): boolean {
  if (ctx.isAssisted) return false;
  return ctx.role === "owner";
}

// ─── Scenario DTO ──────────────────────────────────────

export interface ScenarioDTO {
  id: string;
  name: string;
  description: string | null;
  serviceId: string | null;
  serviceName: string | null;
  clientId: string | null;
  clientName: string | null;
  leadId: string | null;
  leadName: string | null;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  latestVersionNumber: number | null;
  itemCount: number;
  eventCount: number;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function toScenarioDTO(
  row: PricingScenarioRow & {
    active_version_number?: number | null;
    latest_version_number?: number | null;
    item_count?: number;
    event_count?: number;
    service_name?: string | null;
    client_name?: string | null;
    lead_name?: string | null;
  },
): ScenarioDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    serviceId: row.service_id,
    serviceName: row.service_name ?? null,
    clientId: row.client_id ?? null,
    clientName: row.client_name ?? null,
    leadId: row.lead_id ?? null,
    leadName: row.lead_name ?? null,
    activeVersionId: row.active_version_id ?? null,
    activeVersionNumber: row.active_version_number ?? null,
    latestVersionNumber: row.latest_version_number ?? null,
    itemCount: row.item_count ?? 0,
    eventCount: row.event_count ?? 0,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Version DTO ───────────────────────────────────────

export interface VersionDTO {
  id: string;
  scenarioId: string;
  versionNumber: number;
  currency: string;
  totalAmountCents: number;
  entryAmountCents: number;
  financedAmountCents: number;
  installmentCount: number;
  successFeePercentageBps: number;
  successFeeBaseCents: number | null;
  estimatedSuccessFeeCents: number | null;
  monthlyFeeCents: number | null;
  monthlyFeeCount: number | null;
  createdAt: string;
  createdBy: string;
}

export function toVersionDTO(
  row: PricingScenarioVersionRow,
  _ctx: VisibilityContext,
): VersionDTO {
  return {
    id: row.id,
    scenarioId: row.pricing_scenario_id,
    versionNumber: row.version_number,
    currency: row.currency,
    totalAmountCents: row.total_amount_cents,
    entryAmountCents: row.entry_amount_cents,
    financedAmountCents: row.financed_amount_cents,
    installmentCount: row.installment_count,
    successFeePercentageBps: row.success_fee_percentage_bps,
    successFeeBaseCents: row.success_fee_base_cents,
    estimatedSuccessFeeCents: row.estimated_success_fee_cents,
    monthlyFeeCents: row.monthly_fee_cents,
    monthlyFeeCount: row.monthly_fee_count,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

// ─── Memory DTO ────────────────────────────────────────

export interface MemoryDTO {
  versionId: string;
  canView: boolean;
  memory: Record<string, unknown> | null;
}

export function toMemoryDTO(
  memoryData: {
    version_id: string;
    calculation_memory: Record<string, unknown>;
  } | null,
  ctx: VisibilityContext,
): MemoryDTO | null {
  if (!memoryData) return null;

  const canView = canViewMemory(ctx);

  return {
    versionId: memoryData.version_id,
    canView,
    memory: canView ? memoryData.calculation_memory : null,
  };
}
