"use server";

import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logActivityEvent } from "@/lib/timeline/queries";

export type DocumentRequest = {
  id: string;
  title: string;
  description: string | null;
  documentType: string;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  documentId: string | null;
  notes: string | null;
  clientName: string | null;
  caseName: string | null;
  requestedByName: string | null;
  createdAt: string;
};

const createRequestSchema = z.object({
  clientId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  documentType: z.string().default("outro"),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["pendente", "em_andamento", "concluido", "cancelado"]),
});

// Listar solicitações
export async function getDocumentRequests(filters?: { status?: string; clientId?: string }): Promise<DocumentRequest[]> {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("document_requests" as any)
    .select(`
      id, title, description, document_type, status, priority,
      due_date, completed_at, document_id, notes, created_at,
      client_id, legal_case_id, requested_by
    `)
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
  const caseIds = [...new Set(rows.map((r) => r.legal_case_id).filter(Boolean))] as string[];
  const requesterIds = [...new Set(rows.map((r) => r.requested_by).filter(Boolean))] as string[];
  const clientNames = new Map<string, string>();
  const caseNames = new Map<string, string>();
  const requesterNames = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("law_firm_id", context.lawFirm.id)
      .in("id", clientIds);

    if (clientsError) throw clientsError;
    for (const client of clients ?? []) {
      clientNames.set(client.id, client.name);
    }
  }

  if (caseIds.length > 0) {
    const { data: cases, error: casesError } = await supabase
      .from("legal_cases")
      .select("id, title")
      .eq("law_firm_id", context.lawFirm.id)
      .in("id", caseIds);

    if (casesError) throw casesError;
    for (const legalCase of cases ?? []) {
      caseNames.set(legalCase.id, legalCase.title);
    }
  }

  if (requesterIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("law_firm_members")
      .select("id, name")
      .eq("law_firm_id", context.lawFirm.id)
      .in("id", requesterIds);

    if (membersError) throw membersError;
    for (const member of members ?? []) {
      requesterNames.set(member.id, member.name);
    }
  }

  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    documentType: r.document_type,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    documentId: r.document_id,
    notes: r.notes,
    clientName: r.client_id ? clientNames.get(r.client_id) ?? null : null,
    caseName: r.legal_case_id ? caseNames.get(r.legal_case_id) ?? null : null,
    requestedByName: r.requested_by ? requesterNames.get(r.requested_by) ?? null : null,
    createdAt: r.created_at,
  }));
}

// Criar solicitação
export async function createDocumentRequest(data: z.infer<typeof createRequestSchema>) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const parsed = createRequestSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data: request, error } = await supabase
    .from("document_requests" as any)
    .insert({
      law_firm_id: context.lawFirm.id,
      client_id: parsed.clientId ?? null,
      legal_case_id: parsed.caseId ?? null,
      requested_by: context.member.id,
      title: parsed.title,
      description: parsed.description ?? null,
      document_type: parsed.documentType,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? null,
      notes: parsed.notes ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  const requestId = (request as unknown as { id: string } | null)?.id;
  if (!requestId) throw new Error("Solicitação criada sem identificador");

  try {
    await logActivityEvent(supabase, {
      lawFirmId: context.lawFirm.id,
      actorId: context.member.id,
      actorName: context.member.name,
      eventType: "created",
      entityType: "document_request",
      entityId: requestId,
      entityTitle: parsed.title,
      description: "Solicitação de documento criada",
      metadata: { title: parsed.title },
    });
  } catch (err) {
    console.error("[solicitacoes] falha ao registrar activity_events:", err);
  }

  return { success: true };
}

// Atualizar status
export async function updateDocumentRequestStatus(requestId: string, status: string) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  updateStatusSchema.parse({ requestId, status });

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const updateData: Record<string, any> = {
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
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;

  try {
    await logActivityEvent(supabase, {
      lawFirmId: context.lawFirm.id,
      actorId: context.member.id,
      actorName: context.member.name,
      eventType: "status_changed",
      entityType: "document_request",
      entityId: requestId,
      description: `Solicitação alterada para ${status}`,
      metadata: { newStatus: status },
    });
  } catch (err) {
    console.error("[solicitacoes] falha ao registrar activity_events:", err);
  }

  return { success: true };
}

// Excluir solicitação
export async function deleteDocumentRequest(requestId: string) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase
    .from("document_requests" as any)
    .delete()
    .eq("id", requestId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}
