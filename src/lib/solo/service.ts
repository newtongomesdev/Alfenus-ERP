/**
 * Solo Mode Service
 * Business logic for solo mode interface management
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { InterfaceMode, ModuleKey, OperationProfile } from "./types";
import { SOLO_DEFAULT_MODULES, SOLO_HIDDEN_MODULES, MODULE_INFO } from "./constants";

// Helper to access new columns before migration is applied and types are regenerated.
// After migration, replace `as any` with proper typed queries.
function firmQuery(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>) {
  return (supabase as any).from("law_firms");
}

// ── Get interface mode for a law firm ───────────────────────

export async function getInterfaceMode(lawFirmId: string): Promise<InterfaceMode> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return "completa";

  const { data } = await firmQuery(supabase)
    .select("interface_mode")
    .eq("id", lawFirmId)
    .single();

  return (data?.interface_mode as InterfaceMode) ?? "completa";
}

// ── Get operation profile ───────────────────────────────────

export async function getOperationProfile(lawFirmId: string): Promise<OperationProfile> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return "escritorio_com_equipe";

  const { data } = await firmQuery(supabase)
    .select("operation_profile")
    .eq("id", lawFirmId)
    .single();

  return (data?.operation_profile as OperationProfile) ?? "escritorio_com_equipe";
}

// ── Get visible modules based on interface mode ─────────────

export function getVisibleModules(
  interfaceMode: InterfaceMode,
  enabledModules: ModuleKey[],
  hiddenModules: ModuleKey[],
): ModuleKey[] {
  if (interfaceMode === "completa") {
    const allModules = Object.keys(MODULE_INFO) as ModuleKey[];
    return allModules.filter((m) => !hiddenModules.includes(m));
  }

  if (interfaceMode === "simples") {
    const visible = new Set<ModuleKey>(SOLO_DEFAULT_MODULES);
    for (const m of enabledModules) visible.add(m);
    for (const m of hiddenModules) visible.delete(m);
    return Array.from(visible);
  }

  // personalizada
  if (enabledModules.length > 0) {
    return enabledModules.filter((m) => !hiddenModules.includes(m));
  }
  const allModules = Object.keys(MODULE_INFO) as ModuleKey[];
  return allModules.filter((m) => !hiddenModules.includes(m));
}

// ── Check if a module is enabled ────────────────────────────

export async function isModuleEnabled(
  lawFirmId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data } = await firmQuery(supabase)
    .select("interface_mode, enabled_modules, hidden_modules")
    .eq("id", lawFirmId)
    .single();

  if (!data) return false;

  const mode = (data.interface_mode as InterfaceMode) ?? "completa";
  const enabled = (data.enabled_modules as ModuleKey[]) ?? [];
  const hidden = (data.hidden_modules as ModuleKey[]) ?? [];

  if (hidden.includes(moduleKey)) return false;

  if (mode === "completa") return !hidden.includes(moduleKey);
  if (mode === "simples") return SOLO_DEFAULT_MODULES.includes(moduleKey) || enabled.includes(moduleKey);

  if (enabled.length > 0) return enabled.includes(moduleKey);
  return !hidden.includes(moduleKey);
}

// ── Enable a module ─────────────────────────────────────────

export async function enableModule(lawFirmId: string, moduleKey: ModuleKey): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { data } = await firmQuery(supabase)
    .select("enabled_modules, hidden_modules")
    .eq("id", lawFirmId)
    .single();

  if (!data) return;

  const enabled = new Set<string>((data.enabled_modules as string[]) ?? []);
  const hidden = new Set<string>((data.hidden_modules as string[]) ?? []);
  enabled.add(moduleKey);
  hidden.delete(moduleKey);

  await firmQuery(supabase)
    .update({ enabled_modules: Array.from(enabled), hidden_modules: Array.from(hidden), updated_at: new Date().toISOString() })
    .eq("id", lawFirmId);
}

// ── Disable a module ────────────────────────────────────────

export async function disableModule(lawFirmId: string, moduleKey: ModuleKey): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { data } = await firmQuery(supabase)
    .select("enabled_modules, hidden_modules")
    .eq("id", lawFirmId)
    .single();

  if (!data) return;

  const enabled = new Set<string>((data.enabled_modules as string[]) ?? []);
  const hidden = new Set<string>((data.hidden_modules as string[]) ?? []);
  enabled.delete(moduleKey);
  hidden.add(moduleKey);

  await firmQuery(supabase)
    .update({ enabled_modules: Array.from(enabled), hidden_modules: Array.from(hidden), updated_at: new Date().toISOString() })
    .eq("id", lawFirmId);
}

// ── Switch interface mode ───────────────────────────────────

export async function switchInterfaceMode(lawFirmId: string, newMode: InterfaceMode): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  if (newMode === "simples") {
    await firmQuery(supabase)
      .update({
        interface_mode: newMode,
        operation_profile: "advogado_independente",
        hidden_modules: SOLO_HIDDEN_MODULES,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lawFirmId);
  } else {
    await firmQuery(supabase)
      .update({ interface_mode: newMode, updated_at: new Date().toISOString() })
      .eq("id", lawFirmId);
  }
}

// ── Get recommended modules based on operation profile ──────

export function getRecommendedModules(profile: OperationProfile): ModuleKey[] {
  const base: ModuleKey[] = [
    "meu_dia", "clientes", "processos", "prazos", "agenda", "financeiro", "documentos", "tarefas",
  ];

  switch (profile) {
    case "advogado_independente":
      return [...base, "modelos", "relatorios", "recibos", "propostas", "retornos", "fichas_atendimento", "configuracoes", "notificacoes"];
    case "escritorio_pequeno":
      return [...base, "modelos", "relatorios", "recibos", "propostas", "retornos", "equipe", "despesas", "horas", "configuracoes", "notificacoes"];
    default:
      return Object.keys(MODULE_INFO) as ModuleKey[];
  }
}
