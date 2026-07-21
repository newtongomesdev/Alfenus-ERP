import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  LegalRequestType,
  LegalRequest,
  LegalRequestStage,
  LegalRequestApproval,
  LegalRequestSlaEvent,
  LegalRequestMessage,
} from "./types";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapRequestTypeRow(row: Record<string, unknown>): LegalRequestType {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    name: row.name as string,
    description: row.description as string | null,
    defaultPriority: row.default_priority as string,
    defaultSlaHours: row.default_sla_hours as number | null,
    requiresApproval: row.requires_approval as boolean,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRequestRow(row: Record<string, unknown>): LegalRequest {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requestTypeId: row.request_type_id as string | null,
    requesterMemberId: row.requester_member_id as string,
    clientId: row.client_id as string | null,
    legalCaseId: row.legal_case_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    category: row.category as string | null,
    priority: row.priority as string,
    responsibleMemberId: row.responsible_member_id as string | null,
    participants: (row.participants as unknown[]) ?? [],
    status: row.status as string,
    slaDeadline: row.sla_deadline as string | null,
    estimatedCost: row.estimated_cost as number | null,
    estimatedHours: row.estimated_hours as number | null,
    actualHours: row.actual_hours as number | null,
    satisfactionRating: row.satisfaction_rating as number | null,
    satisfactionComment: row.satisfaction_comment as string | null,
    openedAt: row.opened_at as string,
    firstResponseAt: row.first_response_at as string | null,
    concludedAt: row.concluded_at as string | null,
    cancelledAt: row.cancelled_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapStageRow(row: Record<string, unknown>): LegalRequestStage {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requestId: row.request_id as string,
    stageName: row.stage_name as string,
    stageOrder: row.stage_order as number,
    status: row.status as string,
    assignedTo: row.assigned_to as string | null,
    startedAt: row.started_at as string | null,
    completedAt: row.completed_at as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

function mapApprovalRow(row: Record<string, unknown>): LegalRequestApproval {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requestId: row.request_id as string,
    approverMemberId: row.approver_member_id as string,
    status: row.status as string,
    decisionAt: row.decision_at as string | null,
    comments: row.comments as string | null,
    createdAt: row.created_at as string,
  };
}

function mapSlaEventRow(row: Record<string, unknown>): LegalRequestSlaEvent {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requestId: row.request_id as string,
    eventType: row.event_type as string,
    scheduledAt: row.scheduled_at as string | null,
    actualAt: row.actual_at as string | null,
    isMet: row.is_met as boolean | null,
    justification: row.justification as string | null,
    createdAt: row.created_at as string,
  };
}

function mapMessageRow(row: Record<string, unknown>): LegalRequestMessage {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requestId: row.request_id as string,
    senderMemberId: row.sender_member_id as string,
    message: row.message as string,
    isInternal: row.is_internal as boolean,
    attachmentUrl: row.attachment_url as string | null,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export type RequestFilters = {
  status?: string;
  priority?: string;
  requesterMemberId?: string;
  responsibleMemberId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export async function getRequestTypes(
  context: AppContext
): Promise<LegalRequestType[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("legal_request_types")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data ?? []).map(mapRequestTypeRow);
}

// ---------------------------------------------------------------------------
// Legal Requests
// ---------------------------------------------------------------------------

export async function getRequests(
  context: AppContext,
  filters?: RequestFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ requests: LegalRequest[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { requests: [], total: 0 };

  let query = supabase
    .from("legal_requests")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.requesterMemberId)
    query = query.eq("requester_member_id", filters.requesterMemberId);
  if (filters?.responsibleMemberId)
    query = query.eq("responsible_member_id", filters.responsibleMemberId);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.dateFrom)
    query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo)
    query = query.lte("created_at", filters.dateTo);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    requests: (data ?? []).map(mapRequestRow),
    total: count ?? 0,
  };
}

export async function getRequestById(
  context: AppContext,
  id: string
): Promise<LegalRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("legal_requests")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapRequestRow(data) : null;
}

export async function getRequestStats(context: AppContext): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  avgSatisfaction: number;
  slaCompliance: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, byStatus: {}, byPriority: {}, avgSatisfaction: 0, slaCompliance: 0 };
  }

  const { data: all } = await supabase
    .from("legal_requests")
    .select("status, priority, satisfaction_rating, sla_deadline, concluded_at")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  let slaMet = 0;
  let slaTotal = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;

    if (r.satisfaction_rating != null) {
      totalSatisfaction += r.satisfaction_rating as number;
      satisfactionCount++;
    }

    if (r.sla_deadline) {
      slaTotal++;
      if (r.concluded_at && new Date(r.concluded_at as string) <= new Date(r.sla_deadline as string)) {
        slaMet++;
      }
    }
  }

  const avgSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0;
  const slaCompliance = slaTotal > 0 ? slaMet / slaTotal : 0;

  return { total, byStatus, byPriority, avgSatisfaction, slaCompliance };
}

export async function createRequest(
  context: AppContext,
  data: {
    requestTypeId?: string;
    requesterMemberId: string;
    clientId?: string;
    legalCaseId?: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    responsibleMemberId?: string;
    participants?: unknown[];
    estimatedCost?: number;
    estimatedHours?: number;
  }
): Promise<LegalRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const now = new Date().toISOString();

  const { data: pub } = await supabase
    .from("legal_requests")
    .insert({
      law_firm_id: context.lawFirm.id,
      request_type_id: data.requestTypeId ?? null,
      requester_member_id: data.requesterMemberId,
      client_id: data.clientId ?? null,
      legal_case_id: data.legalCaseId ?? null,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      priority: data.priority ?? "normal",
      responsible_member_id: data.responsibleMemberId ?? null,
      participants: data.participants ?? [],
      status: "aberta",
      estimated_cost: data.estimatedCost ?? null,
      estimated_hours: data.estimatedHours ?? null,
      opened_at: now,
    })
    .select()
    .maybeSingle();

  return pub ? mapRequestRow(pub) : null;
}

export async function updateRequest(
  context: AppContext,
  id: string,
  data: Partial<{
    requestTypeId: string;
    clientId: string;
    legalCaseId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    responsibleMemberId: string;
    participants: unknown[];
    estimatedCost: number;
    estimatedHours: number;
    actualHours: number;
    satisfactionRating: number;
    satisfactionComment: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: Database["public"]["Tables"]["legal_requests"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (data.requestTypeId !== undefined)
    update.request_type_id = data.requestTypeId;
  if (data.clientId !== undefined) update.client_id = data.clientId;
  if (data.legalCaseId !== undefined) update.legal_case_id = data.legalCaseId;
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.responsibleMemberId !== undefined)
    update.responsible_member_id = data.responsibleMemberId;
  if (data.participants !== undefined)
    update.participants = data.participants;
  if (data.estimatedCost !== undefined)
    update.estimated_cost = data.estimatedCost;
  if (data.estimatedHours !== undefined)
    update.estimated_hours = data.estimatedHours;
  if (data.actualHours !== undefined) update.actual_hours = data.actualHours;
  if (data.satisfactionRating !== undefined)
    update.satisfaction_rating = data.satisfactionRating;
  if (data.satisfactionComment !== undefined)
    update.satisfaction_comment = data.satisfactionComment;

  await supabase
    .from("legal_requests")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function updateRequestStatus(
  context: AppContext,
  id: string,
  status: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["legal_requests"]["Update"] = {
    status,
    updated_at: now,
  };

  if (status === "em_andamento") {
    update.first_response_at = now;
  } else if (status === "concluida") {
    update.concluded_at = now;
  } else if (status === "cancelada") {
    update.cancelled_at = now;
  }

  await supabase
    .from("legal_requests")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function assignRequest(
  context: AppContext,
  id: string,
  responsibleMemberId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("legal_requests")
    .update({
      responsible_member_id: responsibleMemberId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export async function getRequestStages(
  context: AppContext,
  requestId: string
): Promise<LegalRequestStage[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("legal_request_stages")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("request_id", requestId)
    .order("stage_order", { ascending: true });

  return (data ?? []).map(mapStageRow);
}

export async function createStage(
  context: AppContext,
  data: {
    requestId: string;
    stageName: string;
    stageOrder: number;
    assignedTo?: string;
    notes?: string;
  }
): Promise<LegalRequestStage | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("legal_request_stages")
    .insert({
      law_firm_id: context.lawFirm.id,
      request_id: data.requestId,
      stage_name: data.stageName,
      stage_order: data.stageOrder,
      status: "pendente",
      assigned_to: data.assignedTo ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapStageRow(pub) : null;
}

export async function updateStage(
  context: AppContext,
  id: string,
  data: Partial<{
    stageName: string;
    stageOrder: number;
    status: string;
    assignedTo: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: Database["public"]["Tables"]["legal_request_stages"]["Update"] = {};

  if (data.stageName !== undefined) update.stage_name = data.stageName;
  if (data.stageOrder !== undefined) update.stage_order = data.stageOrder;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "em_andamento" && !update.started_at) {
      update.started_at = new Date().toISOString();
    }
    if (data.status === "concluida" && !update.completed_at) {
      update.completed_at = new Date().toISOString();
    }
  }
  if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("legal_request_stages")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function getRequestApprovals(
  context: AppContext,
  requestId?: string
): Promise<LegalRequestApproval[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("legal_request_approvals")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (requestId) query = query.eq("request_id", requestId);

  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map(mapApprovalRow);
}

export async function createApproval(
  context: AppContext,
  data: {
    requestId: string;
    approverMemberId: string;
  }
): Promise<LegalRequestApproval | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("legal_request_approvals")
    .insert({
      law_firm_id: context.lawFirm.id,
      request_id: data.requestId,
      approver_member_id: data.approverMemberId,
      status: "pendente",
    })
    .select()
    .maybeSingle();

  return pub ? mapApprovalRow(pub) : null;
}

export async function decideApproval(
  context: AppContext,
  id: string,
  approved: boolean,
  comments?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  await supabase
    .from("legal_request_approvals")
    .update({
      status: approved ? "aprovado" : "rejeitado",
      decision_at: now,
      comments: comments ?? null,
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// SLA Events
// ---------------------------------------------------------------------------

export async function getSlaEvents(
  context: AppContext,
  requestId?: string
): Promise<LegalRequestSlaEvent[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("legal_request_sla_events")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (requestId) query = query.eq("request_id", requestId);

  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map(mapSlaEventRow);
}

export async function createSlaEvent(
  context: AppContext,
  data: {
    requestId: string;
    eventType: string;
    scheduledAt?: string;
    actualAt?: string;
    isMet?: boolean;
    justification?: string;
  }
): Promise<LegalRequestSlaEvent | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("legal_request_sla_events")
    .insert({
      law_firm_id: context.lawFirm.id,
      request_id: data.requestId,
      event_type: data.eventType,
      scheduled_at: data.scheduledAt ?? null,
      actual_at: data.actualAt ?? null,
      is_met: data.isMet ?? null,
      justification: data.justification ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapSlaEventRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getRequestMessages(
  context: AppContext,
  requestId: string
): Promise<LegalRequestMessage[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("legal_request_messages")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapMessageRow);
}

export async function createMessage(
  context: AppContext,
  data: {
    requestId: string;
    senderMemberId: string;
    message: string;
    isInternal?: boolean;
    attachmentUrl?: string;
  }
): Promise<LegalRequestMessage | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("legal_request_messages")
    .insert({
      law_firm_id: context.lawFirm.id,
      request_id: data.requestId,
      sender_member_id: data.senderMemberId,
      message: data.message,
      is_internal: data.isInternal ?? false,
      attachment_url: data.attachmentUrl ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapMessageRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getRequestDashboardStats(context: AppContext) {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalRequests: 0,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      avgSatisfaction: 0,
      slaCompliance: 0,
      pendingApprovals: 0,
      openRequests: 0,
      avgResolutionHours: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [requestsRes, approvalsRes] = await Promise.all([
    supabase
      .from("legal_requests")
      .select("status, priority, satisfaction_rating, sla_deadline, concluded_at, opened_at")
      .eq("law_firm_id", firmId),
    supabase
      .from("legal_request_approvals")
      .select("status")
      .eq("law_firm_id", firmId)
      .eq("status", "pendente"),
  ]);

  const rows = requestsRes.data ?? [];
  const totalRequests = rows.length;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  let slaMet = 0;
  let slaTotal = 0;
  let totalResolutionMs = 0;
  let resolvedCount = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;

    if (r.satisfaction_rating != null) {
      totalSatisfaction += r.satisfaction_rating as number;
      satisfactionCount++;
    }

    if (r.sla_deadline) {
      slaTotal++;
      if (
        r.concluded_at &&
        new Date(r.concluded_at as string) <= new Date(r.sla_deadline as string)
      ) {
        slaMet++;
      }
    }

    if (r.concluded_at && r.opened_at) {
      const opened = new Date(r.opened_at as string);
      const concluded = new Date(r.concluded_at as string);
      totalResolutionMs += concluded.getTime() - opened.getTime();
      resolvedCount++;
    }
  }

  const avgSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0;
  const slaCompliance = slaTotal > 0 ? slaMet / slaTotal : 0;
  const avgResolutionHours =
    resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount / (1000 * 60 * 60) * 10) / 10 : 0;

  return {
    totalRequests,
    byStatus,
    byPriority,
    avgSatisfaction,
    slaCompliance,
    pendingApprovals: (approvalsRes.data ?? []).length,
    openRequests: (byStatus["aberta"] ?? 0) + (byStatus["em_andamento"] ?? 0),
    avgResolutionHours,
  };
}
