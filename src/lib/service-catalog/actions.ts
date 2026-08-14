/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import type { ServiceFormInput, ServiceStatus } from "./types";

// Helper: cast supabase table query builder to any
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Create service ───────────────────────────────────────────
export async function createServiceAction(
  formData: ServiceFormInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm)
    return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data, error } = await tbl(supabase, "service_catalog")
    .insert({
      law_firm_id: ctx.lawFirm.id,
      name: formData.name,
      slug: formData.slug,
      practice_area: formData.practice_area,
      category: formData.category || "servico",
      short_description: formData.short_description || null,
      public_description: formData.public_description || null,
      internal_description: formData.internal_description || null,
      scope_included: formData.scope_included || null,
      scope_excluded: formData.scope_excluded || null,
      estimated_duration: formData.estimated_duration || null,
      duration_unit: formData.duration_unit || "dias",
      estimated_hours: formData.estimated_hours || null,
      reference_value_cents: formData.reference_value_cents || null,
      min_value_cents: formData.min_value_cents || null,
      max_value_cents: formData.max_value_cents || null,
      currency: formData.currency || "BRL",
      charging_model: formData.charging_model || "fixo",
      default_upfront_cents: formData.default_upfront_cents || null,
      default_installments: formData.default_installments || null,
      success_fee_percentage: formData.success_fee_percentage || null,
      included_expenses: formData.included_expenses || null,
      excluded_expenses: formData.excluded_expenses || null,
      required_documents: formData.required_documents || null,
      suggested_steps: formData.suggested_steps || null,
      estimated_deadline: formData.estimated_deadline || null,
      deadline_unit: formData.deadline_unit || "dias",
      status: formData.status || "rascunho",
      sort_order: 0,
      is_favorite: false,
      is_platform_library: false,
      created_by: ctx.member?.id || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/servicos");
  return { ok: true, id: (data as any).id };
}

// ── Update service ───────────────────────────────────────────
export async function updateServiceAction(
  serviceId: string,
  formData: Partial<ServiceFormInput>
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm)
    return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "service_catalog")
    .update({
      name: formData.name,
      slug: formData.slug,
      practice_area: formData.practice_area,
      category: formData.category,
      short_description: formData.short_description,
      public_description: formData.public_description,
      internal_description: formData.internal_description,
      scope_included: formData.scope_included,
      scope_excluded: formData.scope_excluded,
      estimated_duration: formData.estimated_duration,
      duration_unit: formData.duration_unit,
      estimated_hours: formData.estimated_hours,
      reference_value_cents: formData.reference_value_cents,
      min_value_cents: formData.min_value_cents,
      max_value_cents: formData.max_value_cents,
      currency: formData.currency,
      charging_model: formData.charging_model,
      default_upfront_cents: formData.default_upfront_cents,
      default_installments: formData.default_installments,
      success_fee_percentage: formData.success_fee_percentage,
      included_expenses: formData.included_expenses,
      excluded_expenses: formData.excluded_expenses,
      required_documents: formData.required_documents,
      suggested_steps: formData.suggested_steps,
      estimated_deadline: formData.estimated_deadline,
      deadline_unit: formData.deadline_unit,
      status: formData.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/servicos");
  return { ok: true };
}

// ── Update service status ────────────────────────────────────
export async function updateServiceStatusAction(
  serviceId: string,
  status: ServiceStatus
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm)
    return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "arquivado") updateData.archived_at = new Date().toISOString();

  const { error } = await tbl(supabase, "service_catalog")
    .update(updateData)
    .eq("id", serviceId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/servicos");
  return { ok: true };
}

// ── Archive service ──────────────────────────────────────────
export async function archiveServiceAction(
  serviceId: string
): Promise<{ ok: boolean; error?: string }> {
  return updateServiceStatusAction(serviceId, "arquivado");
}

// ── Restore service ──────────────────────────────────────────
export async function restoreServiceAction(
  serviceId: string
): Promise<{ ok: boolean; error?: string }> {
  return updateServiceStatusAction(serviceId, "ativo");
}

// ── Toggle favorite ──────────────────────────────────────────
export async function toggleServiceFavoriteAction(
  serviceId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm)
    return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { data } = await tbl(supabase, "service_catalog")
    .select("is_favorite")
    .eq("id", serviceId)
    .eq("law_firm_id", ctx.lawFirm.id)
    .single();

  if (!data) return { ok: false, error: "Serviço não encontrado" };

  const { error } = await tbl(supabase, "service_catalog")
    .update({ is_favorite: !(data as any).is_favorite, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/servicos");
  return { ok: true };
}

// ── Duplicate service ────────────────────────────────────────
export async function duplicateServiceAction(
  serviceId: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm)
    return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  // Fetch the original
  const { data: original, error: fetchError } = await tbl(supabase, "service_catalog")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (fetchError || !original) return { ok: false, error: "Serviço não encontrado" };

  // Create a duplicate (remove id, created_at, etc.)
  const orig = original as any;
  const { data, error } = await tbl(supabase, "service_catalog")
    .insert({
      name: `${orig.name} (Cópia)`,
      slug: `${orig.slug}-copia-${Date.now()}`,
      practice_area: orig.practice_area,
      category: orig.category,
      short_description: orig.short_description,
      public_description: orig.public_description,
      internal_description: orig.internal_description,
      scope_included: orig.scope_included,
      scope_excluded: orig.scope_excluded,
      estimated_duration: orig.estimated_duration,
      duration_unit: orig.duration_unit,
      estimated_hours: orig.estimated_hours,
      reference_value_cents: orig.reference_value_cents,
      min_value_cents: orig.min_value_cents,
      max_value_cents: orig.max_value_cents,
      currency: orig.currency,
      charging_model: orig.charging_model,
      default_upfront_cents: orig.default_upfront_cents,
      default_installments: orig.default_installments,
      success_fee_percentage: orig.success_fee_percentage,
      included_expenses: orig.included_expenses,
      excluded_expenses: orig.excluded_expenses,
      required_documents: orig.required_documents,
      suggested_steps: orig.suggested_steps,
      estimated_deadline: orig.estimated_deadline,
      deadline_unit: orig.deadline_unit,
      status: "rascunho",
      sort_order: orig.sort_order,
      is_favorite: false,
      is_platform_library: false,
      created_by: ctx.member?.id || null,
      law_firm_id: ctx.lawFirm.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/servicos");
  return { ok: true, id: (data as any).id };
}