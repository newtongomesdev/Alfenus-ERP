"use server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type BackupData = {
  exportedAt: string;
  lawFirm: { name: string; slug: string } | null;
  clients: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  legalCases: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  deadlines: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  correspondents: Record<string, unknown>[];
  powersOfAttorney: Record<string, unknown>[];
  customFields: Record<string, unknown>[];
  workflowTemplates: Record<string, unknown>[];
};

// Exportar backup completo do tenant
export async function generateBackup(): Promise<BackupData> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Somente administradores podem gerar backup");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const firmId = context.lawFirm.id;

  const [
    clientsRes,
    leadsRes,
    casesRes,
    contractsRes,
    paymentsRes,
    expensesRes,
    deadlinesRes,
    tasksRes,
    documentsRes,
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("law_firm_id", firmId).order("name"),
    supabase.from("leads").select("*").eq("law_firm_id", firmId).order("name"),
    supabase.from("legal_cases").select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
    supabase.from("contracts").select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
    supabase.from("deadlines").select("*").eq("law_firm_id", firmId).order("due_date"),
    supabase.from("tasks").select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, name, mime_type, size_bytes, entity_type, entity_id, created_at").eq("law_firm_id", firmId).order("created_at", { ascending: false }),
  ]);

  // Tabelas adicionais que podem não existir ainda
  const safeQuery = async (q: PromiseLike<{ data: unknown; error: unknown }>): Promise<Record<string, unknown>[]> => {
    try { const r = await q; return (r as { error: unknown; data: unknown }).error ? [] : ((r as { data: unknown }).data as Record<string, unknown>[] ?? []); } catch { return []; }
  };

  const [correspondentsRes, powersRes, customFieldsRes, workflowsRes] = await Promise.all([
    safeQuery(supabase.from("correspondents" as any).select("*").eq("law_firm_id", firmId).order("name")),
    safeQuery(supabase.from("powers_of_attorney" as any).select("*").eq("law_firm_id", firmId).order("created_at", { ascending: false })),
    safeQuery(supabase.from("custom_fields" as any).select("*").eq("law_firm_id", firmId).order("sort_order")),
    safeQuery(supabase.from("workflow_templates").select("*").eq("law_firm_id", firmId).order("name")),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    lawFirm: { name: context.lawFirm.name, slug: context.lawFirm.slug },
    clients: (clientsRes.data ?? []) as Record<string, unknown>[],
    leads: (leadsRes.data ?? []) as Record<string, unknown>[],
    legalCases: (casesRes.data ?? []) as Record<string, unknown>[],
    contracts: (contractsRes.data ?? []) as Record<string, unknown>[],
    payments: (paymentsRes.data ?? []) as Record<string, unknown>[],
    expenses: (expensesRes.data ?? []) as Record<string, unknown>[],
    deadlines: (deadlinesRes.data ?? []) as Record<string, unknown>[],
    tasks: (tasksRes.data ?? []) as Record<string, unknown>[],
    documents: (documentsRes.data ?? []) as Record<string, unknown>[],
    correspondents: correspondentsRes,
    powersOfAttorney: powersRes,
    customFields: customFieldsRes,
    workflowTemplates: workflowsRes,
  };
}
