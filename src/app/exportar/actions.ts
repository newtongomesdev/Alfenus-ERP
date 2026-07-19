"use server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ExportResult } from "@/lib/export/csv";

// Exportar clientes
export async function exportClients(): Promise<ExportResult> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "clientes.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, phone, document, person_type, status, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .order("name");

  if (error) throw error;

  const headers = ["ID", "Nome", "E-mail", "Telefone", "Documento", "Tipo", "Status", "Criado em"];
  const rows = (data ?? []).map((r: any) => [
    r.id, r.name, r.email ?? "", r.phone ?? "", r.document ?? "",
    r.person_type ?? "", r.status, r.created_at,
  ]);

  return { headers, rows, filename: "clientes", totalRows: rows.length };
}

// Exportar leads
export async function exportLeads(): Promise<ExportResult> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "leads.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, interest, funnel_stage, probability, estimated_value_cents, status, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .order("name");

  if (error) throw error;

  const headers = ["ID", "Nome", "E-mail", "Telefone", "Interesse", "Estágio", "Probabilidade", "Valor Estimado", "Status", "Criado em"];
  const rows = (data ?? []).map((r: any) => [
    r.id, r.name, r.email ?? "", r.phone ?? "", r.interest ?? "",
    r.funnel_stage, r.probability, r.estimated_value_cents / 100, r.status, r.created_at,
  ]);

  return { headers, rows, filename: "leads", totalRows: rows.length };
}

// Exportar processos
export async function exportCases(): Promise<ExportResult> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("legal_cases")
    .select("id, title, case_number, case_kind, court, status, priority, opposing_party, opposing_lawyer, started_at, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .order("name");

  if (error) throw error;

  const headers = ["ID", "Título", "Nº Processo", "Tipo", "Foro", "Status", "Prioridade", "Contrário", "Advogado Contrário", "Início", "Criado em"];
  const rows = (data ?? []).map((r: any) => [
    r.id, r.title, r.case_number ?? "", r.case_kind ?? "", r.court ?? "",
    r.status, r.priority, r.opposing_party ?? "", r.opposing_lawyer ?? "",
    r.started_at ?? "", r.created_at,
  ]);

  return { headers, rows, filename: "processos", totalRows: rows.length };
}

// Exportar pagamentos
export async function exportPayments(): Promise<ExportResult> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "financeiro.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount_cents, payment_method, paid_at, status, notes, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .order("paid_at", { ascending: false });

  if (error) throw error;

  const headers = ["ID", "Valor", "Método", "Data Pgto", "Status", "Notas", "Criado em"];
  const rows = (data ?? []).map((r: any) => [
    r.id, r.amount_cents / 100, r.payment_method ?? "", r.paid_at ?? "",
    r.status, r.notes ?? "", r.created_at,
  ]);

  return { headers, rows, filename: "pagamentos", totalRows: rows.length };
}
