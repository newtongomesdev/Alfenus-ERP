"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import type {
  SimulatorInput,
  SimulatorResult,
  SimulationRow,
  SimulationSaveInput,
} from "./types";

// ── Helper: cast para tabela não tipada ────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tbl(client: any, table: string) {
  return client.from(table) as any;
}

// ── Buscar simulações salvas ───────────────────────────────
export async function getSimulations(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  practiceArea?: string;
}): Promise<{ simulations: SimulationRow[]; total: number }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) {
    return { simulations: [], total: 0 };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { simulations: [], total: 0 };

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  let query = tbl(supabase, "fee_simulations")
    .select("*", { count: "exact" })
    .eq("law_firm_id", ctx.lawFirm.id)
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.or(
      `service_name.ilike.%${options.search}%,client_name.ilike.%${options.search}%`
    );
  }

  if (options?.practiceArea) {
    query = query.eq("practice_area", options.practiceArea);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Erro ao buscar simulações:", error.message);
    return { simulations: [], total: 0 };
  }

  return {
    simulations: (data as SimulationRow[]) ?? [],
    total: count ?? 0,
  };
}

// ── Buscar simulação por ID ────────────────────────────────
export async function getSimulationById(
  simulationId: string
): Promise<SimulationRow | null> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await tbl(supabase, "fee_simulations")
    .select("*")
    .eq("id", simulationId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .single();

  if (error) {
    console.error("Erro ao buscar simulação:", error.message);
    return null;
  }

  return data as SimulationRow;
}

// ── Salvar simulação ───────────────────────────────────────
export async function saveSimulationAction(
  input: SimulationSaveInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }

  const { data, error } = await tbl(supabase, "fee_simulations")
    .insert({
      law_firm_id: ctx.lawFirm.id,
      service_id: input.serviceId ?? null,
      service_name: input.serviceName,
      charging_model: input.chargingModel,
      practice_area: input.practiceArea,
      input_params: input.inputParams,
      results: input.results,
      client_name: input.clientName ?? null,
      client_email: input.clientEmail ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao salvar simulação:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id };
}

// ── Deletar simulação ──────────────────────────────────────
export async function deleteSimulationAction(
  simulationId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) {
    return { ok: false, error: "Contexto não disponível" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase não disponível" };
  }

  const { error } = await tbl(supabase, "fee_simulations")
    .delete()
    .eq("id", simulationId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) {
    console.error("Erro ao deletar simulação:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ── Buscar serviço do catálogo para popular o simulador ────
export async function getServiceForSimulation(
  serviceId: string
): Promise<SimulatorInput | null> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await tbl(supabase, "service_catalog")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !data) return null;

  return {
    serviceId: data.id,
    serviceName: data.name,
    chargingModel: data.charging_model,
    practiceArea: data.practice_area,
    baseValueCents: data.reference_value_cents ?? 0,
    minValueCents: data.min_value_cents,
    maxValueCents: data.max_value_cents,
    estimatedHours: data.estimated_hours,
    hourlyRateCents: data.reference_value_cents && data.estimated_hours
      ? Math.round(data.reference_value_cents / data.estimated_hours)
      : undefined,
    numberOfInstallments: data.default_installments,
    upfrontPercentage: data.default_upfront_cents && data.reference_value_cents
      ? Math.round((data.default_upfront_cents / data.reference_value_cents) * 100)
      : undefined,
    successFeePercentage: data.success_fee_percentage
      ? Number(data.success_fee_percentage)
      : undefined,
    monthlyValueCents: data.charging_model === "mensalidade"
      ? data.reference_value_cents
      : undefined,
    estimatedExpensesCents: 0,
    quantity: 1,
    unitPriceCents: data.reference_value_cents,
  };
}
