"use server";

import { z } from "zod";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("document_requests" as any)
    .select(`
      id, title, description, document_type, status, priority,
      due_date, completed_at, document_id, notes, created_at,
      client:clients(name),
      legal_case:legal_cases(title),
      requester:law_firm_members!document_requests_requested_by_fkey(name)
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

  return (data ?? []).map((r: any) => ({
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
    clientName: r.client?.name ?? null,
    caseName: r.legal_case?.title ?? null,
    requestedByName: r.requester?.name ?? null,
    createdAt: r.created_at,
  }));
}

// Criar solicitação
export async function createDocumentRequest(data: z.infer<typeof createRequestSchema>) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const parsed = createRequestSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase.from("document_requests" as any).insert({
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
  });

  if (error) throw error;

  await supabase.from("activity_events").insert({
    law_firm_id: context.lawFirm.id,
    entity_type: "document_request",
    entity_id: "new",
    actor_id: context.member.id,
    action: "created",
    metadata: { title: parsed.title },
  } as any);

  return { success: true };
}

// Atualizar status
export async function updateDocumentRequestStatus(requestId: string, status: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
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

  await supabase.from("activity_events").insert({
    law_firm_id: context.lawFirm.id,
    entity_type: "document_request",
    entity_id: requestId,
    actor_id: context.member.id,
    action: "status_changed",
    metadata: { newStatus: status },
  } as any);

  return { success: true };
}

// Excluir solicitação
export async function deleteDocumentRequest(requestId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
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
