"use server";
/* eslint-disable @typescript-eslint/no-explicit-any -- secure views are added by migration 0053 before generated types refresh */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import type {
  PricingScenarioVersionRow,
  PricingScenarioItemRow,
  PricingScenarioEventRow,
  PricingScenarioOverview,
  PricingScenarioDetail,
  PricingScenarioStatus,
} from "./types";
import type { PricingScenarioFilterInput } from "./schemas";

// ── Buscar cenários ────────────────────────────────────────
export async function getPricingScenarios(
  filters?: PricingScenarioFilterInput
): Promise<{ scenarios: PricingScenarioOverview[]; total: number }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) {
    return { scenarios: [], total: 0 };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { scenarios: [], total: 0 };

  const limit = filters?.limit ?? 20;
  const offset = filters?.page ? (filters.page - 1) * limit : 0;

  let query = supabase
    .from("pricing_scenarios")
    .select(
      `id, name, description, status, service_id, lead_id, client_id,
       created_by, active_version_id, created_at, updated_at, archived_at`,
      { count: "exact" }
    )
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("created_at", { ascending: false });

  // Excluir arquivados por padrão
  if (!filters?.include_archived) {
    query = query.is("archived_at", null);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.service_id) {
    query = query.eq("service_id", filters.service_id);
  }

  if (filters?.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters?.lead_id) {
    query = query.eq("lead_id", filters.lead_id);
  }

  if (filters?.created_by) {
    query = query.eq("created_by", filters.created_by);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Erro ao buscar cenários:", error.message);
    return { scenarios: [], total: 0 };
  }

  const scenarios = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as PricingScenarioStatus,
    service_id: row.service_id,
    lead_id: row.lead_id,
    client_id: row.client_id,
    created_by: row.created_by,
    active_version_id: row.active_version_id,
    active_version_number: undefined,
    total_amount_cents: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  }));

  return { scenarios, total: count ?? 0 };
}

// ── Buscar cenário por ID ──────────────────────────────────
export async function getPricingScenarioById(
  scenarioId: string
): Promise<PricingScenarioDetail | null> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  // Buscar cenário
  const { data: scenario, error: scenarioError } = await supabase
    .from("pricing_scenarios")
    .select("id, name, description, status, service_id, lead_id, client_id, created_by, active_version_id, converted_proposal_id, created_at, updated_at, archived_at")
    .eq("id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .single();

  if (scenarioError || !scenario) return null;

  // Contar versões
  const { count: versionsCount } = await (supabase as any)
    .from("pricing_scenario_versions_secure")
    .select("*", { count: "exact", head: true })
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id);

  // Contar eventos
  const { count: eventsCount } = await (supabase as any)
    .from("pricing_scenario_events_secure")
    .select("*", { count: "exact", head: true })
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id);

  // Último evento
  const { data: lastEvent } = await (supabase as any)
    .from("pricing_scenario_events_secure")
    .select("created_at")
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    status: scenario.status as PricingScenarioDetail["status"],
    service_id: scenario.service_id,
    lead_id: scenario.lead_id,
    client_id: scenario.client_id,
    created_by: scenario.created_by,
    active_version_id: scenario.active_version_id,
    converted_proposal_id: scenario.converted_proposal_id,
    created_at: scenario.created_at,
    updated_at: scenario.updated_at,
    archived_at: scenario.archived_at,
    total_amount_cents: null,
    versions_count: versionsCount ?? 0,
    events_count: eventsCount ?? 0,
    last_event_at: lastEvent?.created_at ?? null,
  };
}

// ── Buscar versões de um cenário ───────────────────────────
export async function getPricingScenarioVersions(
  scenarioId: string
): Promise<PricingScenarioVersionRow[]> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return [];

  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("pricing_scenario_versions_secure")
    .select("id, pricing_scenario_id, version_number, scenario_type, currency, total_amount_cents, entry_amount_cents, financed_amount_cents, installment_count, success_fee_percentage_bps, created_by, created_at")
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("version_number", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao buscar versões:", error.message);
    return [];
  }

  return (data as PricingScenarioVersionRow[]) ?? [];
}

// ── Buscar versão ativa ────────────────────────────────────
export async function getActivePricingVersion(
  scenarioId: string
): Promise<PricingScenarioVersionRow | null> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  // Buscar o cenário para saber qual é a versão ativa
  const { data: scenario } = await supabase
    .from("pricing_scenarios")
    .select("active_version_id")
    .eq("id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .single();

  if (!scenario?.active_version_id) return null;

  const { data, error } = await (supabase as any)
    .from("pricing_scenario_versions_internal")
    .select("id, law_firm_id, pricing_scenario_id, version_number, scenario_type, parameters, calculation_result, calculation_memory, currency, total_amount_cents, entry_amount_cents, financed_amount_cents, installment_count, success_fee_percentage_bps, success_fee_base_cents, estimated_success_fee_cents, monthly_fee_cents, monthly_fee_count, created_by, created_at")
    .eq("id", scenario.active_version_id)
    .eq("law_firm_id", ctx.lawFirm.id)
    .single();

  if (error || !data) return null;

  return data as PricingScenarioVersionRow;
}

// ── Buscar itens de uma versão ─────────────────────────────
export async function getPricingScenarioItems(
  versionId: string
): Promise<PricingScenarioItemRow[]> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return [];

  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("pricing_scenario_items_secure")
    .select("id, scenario_version_id, item_type, description, quantity, unit_amount_cents, total_amount_cents, metadata, order_index, created_at")
    .eq("scenario_version_id", versionId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Erro ao buscar itens:", error.message);
    return [];
  }

  return (data as PricingScenarioItemRow[]) ?? [];
}

// ── Buscar eventos ─────────────────────────────────────────
export async function getPricingScenarioEvents(
  scenarioId: string,
  limit = 50
): Promise<PricingScenarioEventRow[]> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return [];

  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("pricing_scenario_events_secure")
    .select("id, pricing_scenario_id, version_id, event_type, actor_id, safe_metadata, created_at")
    .eq("pricing_scenario_id", scenarioId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Erro ao buscar eventos:", error.message);
    return [];
  }

  return (data as PricingScenarioEventRow[]) ?? [];
}
