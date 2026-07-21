"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AdvancedRequest = {
  id: string;
  title: string;
  description: string | null;
  documentType: string;
  status: string;
  priority: string;
  approvalStatus: string;
  assignedToName: string | null;
  requestedByName: string | null;
  clientName: string | null;
  caseName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type AdvancedMessage = {
  id: string;
  requestId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function checkAuth(context: Awaited<ReturnType<typeof getAppContext>>) {
  if (context.status === "missing-env")
    throw new Error("Configure o Supabase no .env.local.");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status === "missing-tenant" || !context.member || !context.lawFirm)
    redirect("/onboarding");
}

function redirectForError(error: string): never {
  redirect(`/solicitacoes-avancado?erro=${error}`);
}

/* ------------------------------------------------------------------ */
/*  Data queries (non-"use server" – called from server components)    */
/* ------------------------------------------------------------------ */

export async function getAdvancedRequests(
  filters?: { status?: string; priority?: string; approvalStatus?: string },
  page = 1,
  pageSize = 20,
): Promise<{ requests: AdvancedRequest[]; total: number }> {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.visualizar"))
    throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("document_requests" as any)
    .select(
      "id, title, description, document_type, status, priority, approval_status, due_date, completed_at, created_at, assigned_to, client_id, legal_case_id, requested_by",
      { count: "exact" },
    )
    .eq("law_firm_id", context.lawFirm!.id)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.approvalStatus)
    query = query.eq("approval_status", filters.approvalStatus);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as any[];

  /* Resolve foreign names */
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
  const caseIds = [...new Set(rows.map((r) => r.legal_case_id).filter(Boolean))] as string[];
  const memberIds = [
    ...new Set(
      rows
        .map((r) => r.requested_by)
        .concat(rows.map((r) => r.assigned_to))
        .filter(Boolean),
    ),
  ] as string[];

  const clientNames = new Map<string, string>();
  const caseNames = new Map<string, string>();
  const memberNames = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .eq("law_firm_id", context.lawFirm!.id)
      .in("id", clientIds);
    for (const c of clients ?? []) clientNames.set(c.id, c.name);
  }
  if (caseIds.length > 0) {
    const { data: cases } = await supabase
      .from("legal_cases")
      .select("id, title")
      .eq("law_firm_id", context.lawFirm!.id)
      .in("id", caseIds);
    for (const c of cases ?? []) caseNames.set(c.id, c.title);
  }
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("law_firm_members")
      .select("id, name")
      .eq("law_firm_id", context.lawFirm!.id)
      .in("id", memberIds);
    for (const m of members ?? []) memberNames.set(m.id, m.name);
  }

  const requests: AdvancedRequest[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    documentType: r.document_type,
    status: r.status,
    priority: r.priority,
    approvalStatus: r.approval_status ?? "pendente",
    assignedToName: r.assigned_to ? memberNames.get(r.assigned_to) ?? null : null,
    requestedByName: r.requested_by ? memberNames.get(r.requested_by) ?? null : null,
    clientName: r.client_id ? clientNames.get(r.client_id) ?? null : null,
    caseName: r.legal_case_id ? caseNames.get(r.legal_case_id) ?? null : null,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }));

  return { requests, total: count ?? rows.length };
}

export async function getSolicitationStats(): Promise<{
  total: number;
  pendentes: number;
  emAndamento: number;
  concluidas: number;
  aprovacaoPendente: number;
  vencidas: number;
}> {
  const context = await getAppContext();
  checkAuth(context);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { count: total } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id);

  const { count: pendentes } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id)
    .eq("status", "pendente");

  const { count: emAndamento } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id)
    .eq("status", "em_andamento");

  const { count: concluidas } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id)
    .eq("status", "concluido");

  const { count: aprovacaoPendente } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id)
    .eq("status", "pendente")
    .eq("approval_status", "pendente");

  const today = new Date().toISOString().slice(0, 10);
  const { count: vencidas } = await supabase
    .from("document_requests" as any)
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm!.id)
    .neq("status", "concluido")
    .neq("status", "cancelado")
    .lte("due_date", today);

  return {
    total: total ?? 0,
    pendentes: pendentes ?? 0,
    emAndamento: emAndamento ?? 0,
    concluidas: concluidas ?? 0,
    aprovacaoPendente: aprovacaoPendente ?? 0,
    vencidas: vencidas ?? 0,
  };
}

export async function getSLAStats(): Promise<{
  total: number;
  concluidas: number;
  noPrazo: number;
  atrasadas: number;
  complianceRate: number;
  avgDaysToComplete: number;
}> {
  const context = await getAppContext();
  checkAuth(context);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data: completed } = await supabase
    .from("document_requests" as any)
    .select("id, due_date, completed_at, created_at")
    .eq("law_firm_id", context.lawFirm!.id)
    .eq("status", "concluido");

  const rows = (completed ?? []) as any[];
  let noPrazo = 0;
  let totalDays = 0;

  for (const r of rows) {
    if (r.completed_at && r.due_date) {
      const completedDate = new Date(r.completed_at).getTime();
      const dueDate = new Date(r.due_date + "T23:59:59").getTime();
      if (completedDate <= dueDate) noPrazo++;
    }
    if (r.completed_at && r.created_at) {
      const diff =
        (new Date(r.completed_at).getTime() -
          new Date(r.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      totalDays += diff;
    }
  }

  const concluidas = rows.length;
  const atrasadas = concluidas - noPrazo;

  return {
    total: concluidas,
    concluidas,
    noPrazo,
    atrasadas,
    complianceRate: concluidas > 0 ? Math.round((noPrazo / concluidas) * 100) : 0,
    avgDaysToComplete:
      concluidas > 0 ? Math.round((totalDays / concluidas) * 10) / 10 : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Server Actions                                                     */
/* ------------------------------------------------------------------ */

export async function createRequestAction(formData: FormData) {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.criar")) redirectForError("permissao");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirectForError("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirectForError("ambiente");

  const { data: request, error } = await supabase
    .from("document_requests" as any)
    .insert({
      law_firm_id: context.lawFirm!.id,
      requested_by: context.member!.id,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      document_type: String(formData.get("documentType") ?? "outro").trim(),
      priority: String(formData.get("priority") ?? "normal").trim(),
      status: "pendente",
      approval_status: "pendente",
      client_id: String(formData.get("clientId") ?? "") || null,
      legal_case_id: String(formData.get("legalCaseId") ?? "") || null,
      due_date: String(formData.get("dueDate") ?? "") || null,
    })
    .select("id")
    .single();

  if (error) redirectForError("criacao");

  revalidatePath("/solicitacoes-avancado");
  revalidatePath("/solicitacoes-avancado/pedidos");
  redirect("/solicitacoes-avancado/pedidos?criado=1");
}

export async function updateRequestStatusAction(
  requestId: string,
  status: string,
) {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.criar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "concluido") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("document_requests" as any)
    .update(updateData)
    .eq("id", requestId)
    .eq("law_firm_id", context.lawFirm!.id);

  if (error) throw error;
  revalidatePath("/solicitacoes-avancado");
  revalidatePath("/solicitacoes-avancado/pedidos");
}

export async function assignRequestAction(
  requestId: string,
  assigneeId: string,
) {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.criar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase
    .from("document_requests" as any)
    .update({
      assigned_to: assigneeId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("law_firm_id", context.lawFirm!.id);

  if (error) throw error;
  revalidatePath("/solicitacoes-avancado");
  revalidatePath("/solicitacoes-avancado/pedidos");
  revalidatePath("/solicitacoes-avancado/aprovacoes");
}

export async function decideApprovalAction(formData: FormData) {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.criar")) redirectForError("permissao");

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!requestId || !decision) redirectForError("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirectForError("ambiente");

  const updateData: Record<string, unknown> = {
    approval_status: decision,
    updated_at: new Date().toISOString(),
  };
  if (decision === "aprovado") {
    updateData.status = "em_andamento";
  }

  const { error } = await supabase
    .from("document_requests" as any)
    .update(updateData)
    .eq("id", requestId)
    .eq("law_firm_id", context.lawFirm!.id);

  if (error) redirectForError("atualizacao");

  revalidatePath("/solicitacoes-avancado");
  revalidatePath("/solicitacoes-avancado/aprovacoes");
  redirect(
    `/solicitacoes-avancado/aprovacoes?decidido=1`,
  );
}

export async function createMessageAction(
  requestId: string,
  content: string,
) {
  const context = await getAppContext();
  checkAuth(context);
  if (!can(context.member!.role, "prazos.criar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Mensagem não pode estar vazia");

  const { error } = await supabase.from("document_request_messages" as any).insert({
    law_firm_id: context.lawFirm!.id,
    request_id: requestId,
    author_id: context.member!.id,
    content: trimmed,
  });

  if (error) throw error;
  revalidatePath("/solicitacoes-avancado");
}
