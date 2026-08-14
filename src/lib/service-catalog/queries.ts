/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Service Catalog Queries
 * Server-side queries for the service catalog module
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceCatalogRow, ServiceOverview, ServiceDetail } from "./types";

// Helper: cast supabase table query builder to any
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Get services (list with filters) ────────────────────────
export async function getServices(
  lawFirmId: string,
  options: {
    status?: string;
    practice_area?: string;
    search?: string;
    platform?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ services: ServiceOverview[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { services: [], total: 0 };

  let query = tbl(supabase, "service_catalog")
    .select("id, name, slug, practice_area, short_description, reference_value_cents, charging_model, status, is_favorite, is_platform_library, created_at, updated_at, archived_at", { count: "exact" })
    .eq("law_firm_id", lawFirmId)
    .order("is_favorite", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options.status && options.status !== "todos") {
    query = query.eq("status", options.status);
  }

  if (options.practice_area && options.practice_area !== "todas") {
    query = query.eq("practice_area", options.practice_area);
  }

  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,short_description.ilike.%${options.search}%,practice_area.ilike.%${options.search}%`
    );
  }

  const page = options.page || 1;
  const limit = options.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return { services: [], total: 0 };

  return {
    services: (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      practice_area: r.practice_area,
      short_description: r.short_description,
      reference_value_cents: r.reference_value_cents,
      charging_model: r.charging_model,
      status: r.status,
      is_favorite: r.is_favorite,
      is_platform_library: r.is_platform_library,
      created_at: r.created_at,
      updated_at: r.updated_at,
      archived_at: r.archived_at,
    })),
    total: count || 0,
  };
}

// ── Get service detail ─────────────────────────────────────
export async function getServiceDetail(
  serviceId: string,
  lawFirmId: string
): Promise<ServiceDetail | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await tbl(supabase, "service_catalog")
    .select("*")
    .eq("id", serviceId)
    .eq("law_firm_id", lawFirmId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    reference_value_display: data.reference_value_cents != null ? `R$ ${(data.reference_value_cents / 100).toFixed(2)}` : undefined,
    min_value_display: data.min_value_cents != null ? `R$ ${(data.min_value_cents / 100).toFixed(2)}` : undefined,
    max_value_display: data.max_value_cents != null ? `R$ ${(data.max_value_cents / 100).toFixed(2)}` : undefined,
  };
}

// ── Get platform library services ───────────────────────────
export async function getPlatformServices(): Promise<ServiceCatalogRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await tbl(supabase, "service_catalog")
    .select("*")
    .eq("is_platform_library", true)
    .order("practice_area", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data || [];
}

// ── Duplicate a service ─────────────────────────────────────
export async function duplicateService(
  serviceId: string,
  lawFirmId: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  // Fetch the original
  const { data: original, error: fetchError } = await tbl(supabase, "service_catalog")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (fetchError || !original) return { ok: false, error: "Serviço não encontrado" };

  // Create duplicate (spread all fields except id, timestamps)
  const { data, error } = await tbl(supabase, "service_catalog")
    .insert({
      name: `${original.name} (Cópia)`,
      slug: `${original.slug}-copia-${Date.now()}`,
      practice_area: original.practice_area,
      category: original.category,
      short_description: original.short_description,
      public_description: original.public_description,
      internal_description: original.internal_description,
      scope_included: original.scope_included,
      scope_excluded: original.scope_excluded,
      estimated_duration: original.estimated_duration,
      duration_unit: original.duration_unit,
      estimated_hours: original.estimated_hours,
      reference_value_cents: original.reference_value_cents,
      min_value_cents: original.min_value_cents,
      max_value_cents: original.max_value_cents,
      currency: original.currency,
      charging_model: original.charging_model,
      default_upfront_cents: original.default_upfront_cents,
      default_installments: original.default_installments,
      success_fee_percentage: original.success_fee_percentage,
      included_expenses: original.included_expenses,
      excluded_expenses: original.excluded_expenses,
      required_documents: original.required_documents,
      suggested_steps: original.suggested_steps,
      estimated_deadline: original.estimated_deadline,
      deadline_unit: original.deadline_unit,
      status: "rascunho",
      sort_order: original.sort_order,
      is_favorite: false,
      is_platform_library: false,
      created_by: null,
      law_firm_id: lawFirmId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as any).id };
}