/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import { evaluateAllRules } from "./rules";

// Helper: cast supabase table query builder to any for tables not yet in generated types.
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Dispatch recommendations ───────────────────────────────────────

export async function dispatchOperationalRecommendations(): Promise<{
  ok: boolean;
  generated?: number;
  error?: string;
}> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const results = await evaluateAllRules(ctx.lawFirm.id, supabase);
  let generatedCount = 0;

  for (const result of results) {
    if (result.conditionMet && !result.recommendationGenerated) {
      // Check if recommendation already exists
      const { data: existing } = await tbl(supabase, "operational_recommendations")
        .select("id")
        .eq("law_firm_id", ctx.lawFirm.id)
        .eq("title", result.message ?? "")
        .eq("status", "ativa")
        .limit(1);

      if (existing && existing.length === 0) {
        await tbl(supabase, "operational_recommendations").insert({
          law_firm_id: ctx.lawFirm.id,
          recommendation_type: result.ruleKey.includes("lead") || result.ruleKey.includes("client") ? "clientes" :
            result.ruleKey.includes("proposal") ? "propostas" :
            result.ruleKey.includes("installment") || result.ruleKey.includes("contract") ? "financeiro" :
            result.ruleKey.includes("case") || result.ruleKey.includes("deadline") || result.ruleKey.includes("document") ? "juridico" :
            result.ruleKey.includes("task") ? "produtividade" : "configuracao",
          title: result.message?.split(".")[0] ?? "",
          description: result.message ?? "",
          priority: result.ruleKey.includes("overdue") || result.ruleKey.includes("no_charge") ? "critica" :
            result.ruleKey.includes("expir") || result.ruleKey.includes("pending") || result.ruleKey.includes("over_capacity") ? "importante" :
            result.ruleKey.includes("client_no_update") || result.ruleKey.includes("without_return") ? "atencao" : "informativa",
          action_label: "Ver detalhes",
          action_url: "/meu-escritorio",
          status: "ativa",
        });
        generatedCount++;
      }
    }
  }

  return { ok: true, generated: generatedCount };
}

// ── Dismiss a recommendation ────────────────────────────────────────

export async function dismissRecommendation(
  recommendationId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "operational_recommendations")
    .update({
      status: "dispensada",
      dismissed_at: new Date().toISOString(),
      dismissed_by: ctx.member?.id,
      dismissed_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recommendationId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };

  // Record dismissal
  await tbl(supabase, "recommendation_dismissals").insert({
    law_firm_id: ctx.lawFirm.id,
    recommendation_id: recommendationId,
    dismissed_by: ctx.member?.id,
    reason: reason || null,
  });

  revalidatePath("/meu-escritorio");
  return { ok: true };
}

// ── Complete a recommendation ───────────────────────────────────────

export async function completeRecommendation(
  recommendationId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "operational_recommendations")
    .update({
      status: "concluida",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recommendationId)
    .eq("law_firm_id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meu-escritorio");
  return { ok: true };
}

// ── Suppress a rule ─────────────────────────────────────────────────

export async function suppressRule(
  ruleKey: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  // Upsert preference
  const { error } = await tbl(supabase, "recommendation_preferences").upsert({
    law_firm_id: ctx.lawFirm.id,
    rule_key: ruleKey,
    muted: true,
    muted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "law_firm_id,rule_key" });

  if (error) return { ok: false, error: error.message };

  // Mark existing recommendations as dispensada
  await tbl(supabase, "operational_recommendations")
    .update({
      status: "dispensada",
      dismissed_at: new Date().toISOString(),
      dismissed_reason: "Regra silenciada pelo usuário",
      updated_at: new Date().toISOString(),
    })
    .eq("law_firm_id", ctx.lawFirm.id)
    .eq("rule_key", ruleKey)
    .eq("status", "ativa");

  revalidatePath("/meu-escritorio");
  return { ok: true };
}

// ── Generate health snapshot ────────────────────────────────────────

export async function generateHealthSnapshot(): Promise<{
  ok: boolean;
  score?: number;
  error?: string;
}> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  try {
    const { error } = await (supabase as any).rpc("generate_office_health_snapshot", {
      p_law_firm_id: ctx.lawFirm.id,
    });

    if (error) return { ok: false, error: error.message };

    // Get the latest score
    const { data } = await tbl(supabase, "office_health_snapshots")
      .select("score_number")
      .eq("law_firm_id", ctx.lawFirm.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    revalidatePath("/meu-escritorio");
    return { ok: true, score: (data as any)?.score_number };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Save setup diagnostic answers ───────────────────────────────────

export async function saveSetupDiagnosticAnswers(
  answers: Record<string, string | string[]>
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  try {
    const { error } = await (supabase as any).rpc("save_setup_diagnostic_answers", {
      p_law_firm_id: ctx.lawFirm.id,
      p_answers: answers,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/meu-escritorio");
    revalidatePath("/onboarding-solo");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Mark setup as completed ─────────────────────────────────────────

export async function completeSotoSetup(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) return { ok: false, error: "Não autenticado" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível" };

  const { error } = await tbl(supabase, "law_firms")
    .update({
      solo_pro_enabled: true,
      setup_diagnostic_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.lawFirm.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/meu-escritorio");
  revalidatePath("/onboarding-solo");
  return { ok: true };
}