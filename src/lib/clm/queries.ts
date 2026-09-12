import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  ContractRequest,
  ContractTemplate,
  ContractClause,
  ContractVersion,
  ContractApproval,
  ContractObligation,
  ContractAmendment,
  ContractCounterparty,
  ContractRequestStatus,
} from "./types";

type ContractRequestUpdate =
  Database["public"]["Tables"]["contract_requests"]["Update"];
type ContractTemplateUpdate =
  Database["public"]["Tables"]["contract_templates"]["Update"];
type ContractClauseUpdate =
  Database["public"]["Tables"]["contract_clauses"]["Update"];
type ContractObligationUpdate =
  Database["public"]["Tables"]["contract_obligations"]["Update"];

// ──────────────────────────────────────────────
// Row mappers
// ──────────────────────────────────────────────

function mapContractRequestRow(
  row: Record<string, unknown>
): ContractRequest {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    requesterMemberId: row.requester_member_id as string,
    clientId: row.client_id as string | null,
    legalCaseId: row.legal_case_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    category: row.category as ContractRequest["category"],
    contractType: row.contract_type as string | null,
    priority: row.priority as ContractRequest["priority"],
    necessaryDate: row.necessary_date as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    status: row.status as ContractRequest["status"],
    slaDeadline: row.sla_deadline as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapContractTemplateRow(
  row: Record<string, unknown>
): ContractTemplate {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    name: row.name as string,
    description: row.description as string | null,
    category: row.category as string | null,
    content: row.content as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapContractClauseRow(row: Record<string, unknown>): ContractClause {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    templateId: row.template_id as string | null,
    title: row.title as string,
    category: row.category as string | null,
    content: row.content as string,
    version: row.version as number,
    riskLevel: row.risk_level as ContractClause["riskLevel"],
    isMandatory: row.is_mandatory as boolean,
    isApproved: row.is_approved as boolean,
    approvedBy: row.approved_by as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    notes: row.notes as string | null,
    status: row.status as ContractClause["status"],
    createdAt: row.created_at as string,
  };
}

function mapContractVersionRow(
  row: Record<string, unknown>
): ContractVersion {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    contractRequestId: row.contract_request_id as string,
    versionNumber: row.version_number as number,
    content: row.content as string | null,
    authorMemberId: row.author_member_id as string | null,
    changeDescription: row.change_description as string | null,
    isCurrent: row.is_current as boolean,
    createdAt: row.created_at as string,
  };
}

function mapContractApprovalRow(
  row: Record<string, unknown>
): ContractApproval {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    contractRequestId: row.contract_request_id as string,
    versionId: row.version_id as string | null,
    approverMemberId: row.approver_member_id as string,
    status: row.status as ContractApproval["status"],
    decisionAt: row.decision_at as string | null,
    comments: row.comments as string | null,
    createdAt: row.created_at as string,
  };
}

function mapContractObligationRow(
  row: Record<string, unknown>
): ContractObligation {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    contractRequestId: row.contract_request_id as string,
    description: row.description as string,
    responsibleParty: row.responsible_party as string | null,
    internalResponsibleMemberId:
      row.internal_responsible_member_id as string | null,
    periodicity: row.periodicity as ContractObligation["periodicity"],
    dueDate: row.due_date as string | null,
    evidenceDescription: row.evidence_description as string | null,
    status: row.status as ContractObligation["status"],
    alertDaysBefore: row.alert_days_before as number,
    completedAt: row.completed_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapContractAmendmentRow(
  row: Record<string, unknown>
): ContractAmendment {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    contractRequestId: row.contract_request_id as string,
    amendmentType: row.amendment_type as ContractAmendment["amendmentType"],
    description: row.description as string,
    newValue: row.new_value as number | null,
    newVigenceStart: row.new_vigence_start as string | null,
    newVigenceEnd: row.new_vigence_end as string | null,
    status: row.status as ContractAmendment["status"],
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    attachmentUrl: row.attachment_url as string | null,
    createdAt: row.created_at as string,
  };
}

function mapContractCounterpartyRow(
  row: Record<string, unknown>
): ContractCounterparty {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    contractRequestId: row.contract_request_id as string,
    partyName: row.party_name as string,
    partyType: row.party_type as ContractCounterparty["partyType"],
    documentNumber: row.document_number as string | null,
    contactName: row.contact_name as string | null,
    contactEmail: row.contact_email as string | null,
    contactPhone: row.contact_phone as string | null,
    role: row.role as ContractCounterparty["role"],
    createdAt: row.created_at as string,
  };
}

// ──────────────────────────────────────────────
// Filters
// ──────────────────────────────────────────────

export type RequestFilters = {
  status?: ContractRequestStatus;
  category?: string;
  priority?: string;
  clientId?: string;
  legalCaseId?: string;
  responsibleMemberId?: string;
};

// ══════════════════════════════════════════════
// Contract Requests
// ══════════════════════════════════════════════

export async function getRequests(
  context: AppContext,
  filters?: RequestFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ requests: ContractRequest[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { requests: [], total: 0 };

  let query = supabase
    .from("contract_requests")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.legalCaseId)
    query = query.eq("legal_case_id", filters.legalCaseId);
  if (filters?.responsibleMemberId)
    query = query.eq("responsible_member_id", filters.responsibleMemberId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    requests: (data ?? []).map(mapContractRequestRow),
    total: count ?? 0,
  };
}

export async function getRequestById(
  context: AppContext,
  id: string
): Promise<ContractRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("contract_requests")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapContractRequestRow(data) : null;
}

export async function getRequestStats(context: AppContext): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  activeCount: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, byStatus: {}, byCategory: {}, byPriority: {}, activeCount: 0 };
  }

  const { data: all } = await supabase
    .from("contract_requests")
    .select("status, category, priority")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let activeCount = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
    if (["ativo", "renovacao", "negociacao", "aprovacao", "assinatura_pendente"].includes(r.status)) {
      activeCount++;
    }
  }

  return { total, byStatus, byCategory, byPriority, activeCount };
}

export async function createRequest(
  context: AppContext,
  data: {
    title: string;
    description?: string;
    category?: string;
    contractType?: string;
    priority?: string;
    clientId?: string;
    legalCaseId?: string;
    necessaryDate?: string;
    responsibleMemberId?: string;
    slaDeadline?: string;
  }
): Promise<ContractRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm || !context.member) return null;

  const { data: pub } = await supabase
    .from("contract_requests")
    .insert({
      law_firm_id: context.lawFirm.id,
      requester_member_id: context.member.userId,
      client_id: data.clientId ?? null,
      legal_case_id: data.legalCaseId ?? null,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? "juridico",
      contract_type: data.contractType ?? null,
      priority: data.priority ?? "normal",
      necessary_date: data.necessaryDate ?? null,
      responsible_member_id: data.responsibleMemberId ?? null,
      sla_deadline: data.slaDeadline ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractRequestRow(pub) : null;
}

export async function updateRequest(
  context: AppContext,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    category: string;
    contractType: string;
    priority: string;
    clientId: string;
    legalCaseId: string;
    necessaryDate: string;
    responsibleMemberId: string;
    slaDeadline: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: ContractRequestUpdate = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.contractType !== undefined) update.contract_type = data.contractType;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.clientId !== undefined) update.client_id = data.clientId;
  if (data.legalCaseId !== undefined) update.legal_case_id = data.legalCaseId;
  if (data.necessaryDate !== undefined) update.necessary_date = data.necessaryDate;
  if (data.responsibleMemberId !== undefined)
    update.responsible_member_id = data.responsibleMemberId;
  if (data.slaDeadline !== undefined) update.sla_deadline = data.slaDeadline;

  await supabase
    .from("contract_requests")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function updateRequestStatus(
  context: AppContext,
  id: string,
  status: ContractRequestStatus
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("contract_requests")
    .update({ status })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ══════════════════════════════════════════════
// Contract Templates
// ══════════════════════════════════════════════

export async function getTemplates(
  context: AppContext,
  page: number = 1,
  pageSize: number = 20
): Promise<{ templates: ContractTemplate[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { templates: [], total: 0 };

  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from("contract_templates")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    templates: (data ?? []).map(mapContractTemplateRow),
    total: count ?? 0,
  };
}

export async function createTemplate(
  context: AppContext,
  data: {
    name: string;
    description?: string;
    category?: string;
    content?: string;
  }
): Promise<ContractTemplate | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("contract_templates")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      content: data.content ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractTemplateRow(pub) : null;
}

// ══════════════════════════════════════════════
// Contract Clauses
// ══════════════════════════════════════════════

export async function getClauses(
  context: AppContext,
  templateId?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ clauses: ContractClause[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { clauses: [], total: 0 };

  let query = supabase
    .from("contract_clauses")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (templateId) query = query.eq("template_id", templateId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    clauses: (data ?? []).map(mapContractClauseRow),
    total: count ?? 0,
  };
}

export async function createClause(
  context: AppContext,
  data: {
    templateId?: string;
    title: string;
    category?: string;
    content: string;
    riskLevel?: string;
    isMandatory?: boolean;
    responsibleMemberId?: string;
    notes?: string;
  }
): Promise<ContractClause | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("contract_clauses")
    .insert({
      law_firm_id: context.lawFirm.id,
      template_id: data.templateId ?? null,
      title: data.title,
      category: data.category ?? null,
      content: data.content,
      risk_level: data.riskLevel ?? "baixo",
      is_mandatory: data.isMandatory ?? false,
      responsible_member_id: data.responsibleMemberId ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractClauseRow(pub) : null;
}

export async function updateClause(
  context: AppContext,
  id: string,
  data: Partial<{
    title: string;
    category: string;
    content: string;
    riskLevel: string;
    isMandatory: boolean;
    isApproved: boolean;
    approvedBy: string;
    responsibleMemberId: string;
    notes: string;
    status: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: ContractClauseUpdate = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.category !== undefined) update.category = data.category;
  if (data.content !== undefined) update.content = data.content;
  if (data.riskLevel !== undefined) update.risk_level = data.riskLevel;
  if (data.isMandatory !== undefined) update.is_mandatory = data.isMandatory;
  if (data.isApproved !== undefined) update.is_approved = data.isApproved;
  if (data.approvedBy !== undefined) update.approved_by = data.approvedBy;
  if (data.responsibleMemberId !== undefined)
    update.responsible_member_id = data.responsibleMemberId;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.status !== undefined) update.status = data.status;

  await supabase
    .from("contract_clauses")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ══════════════════════════════════════════════
// Contract Versions
// ══════════════════════════════════════════════

export async function getVersions(
  context: AppContext,
  contractRequestId: string
): Promise<ContractVersion[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("contract_versions")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("contract_request_id", contractRequestId)
    .order("version_number", { ascending: false });

  return (data ?? []).map(mapContractVersionRow);
}

export async function createVersion(
  context: AppContext,
  data: {
    contractRequestId: string;
    content?: string;
    changeDescription?: string;
  }
): Promise<ContractVersion | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  // Determine next version number
  const { data: existing } = await supabase
    .from("contract_versions")
    .select("version_number")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("contract_request_id", data.contractRequestId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextNumber =
    existing && existing.length > 0
      ? (existing[0].version_number as number) + 1
      : 1;

  // Mark previous versions as not current
  await supabase
    .from("contract_versions")
    .update({ is_current: false })
    .eq("contract_request_id", data.contractRequestId)
    .eq("is_current", true);

  const { data: pub } = await supabase
    .from("contract_versions")
    .insert({
      law_firm_id: context.lawFirm.id,
      contract_request_id: data.contractRequestId,
      version_number: nextNumber,
      content: data.content ?? null,
      author_member_id: context.member?.userId ?? null,
      change_description: data.changeDescription ?? null,
      is_current: true,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractVersionRow(pub) : null;
}

// ══════════════════════════════════════════════
// Contract Approvals
// ══════════════════════════════════════════════

export async function getApprovals(
  context: AppContext,
  contractRequestId: string
): Promise<ContractApproval[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("contract_approvals")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("contract_request_id", contractRequestId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapContractApprovalRow);
}

export async function decideApproval(
  context: AppContext,
  id: string,
  approved: boolean,
  comments?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("contract_approvals")
    .update({
      status: approved ? "aprovado" : "rejeitado",
      decision_at: new Date().toISOString(),
      comments: comments ?? null,
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ══════════════════════════════════════════════
// Contract Obligations
// ══════════════════════════════════════════════

export async function getObligations(
  context: AppContext,
  contractRequestId?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ obligations: ContractObligation[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { obligations: [], total: 0 };

  let query = supabase
    .from("contract_obligations")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (contractRequestId)
    query = query.eq("contract_request_id", contractRequestId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("due_date", { ascending: true })
    .range(from, from + pageSize - 1);

  return {
    obligations: (data ?? []).map(mapContractObligationRow),
    total: count ?? 0,
  };
}

export async function createObligation(
  context: AppContext,
  data: {
    contractRequestId: string;
    description: string;
    responsibleParty?: string;
    internalResponsibleMemberId?: string;
    periodicity?: string;
    dueDate?: string;
    evidenceDescription?: string;
    alertDaysBefore?: number;
  }
): Promise<ContractObligation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("contract_obligations")
    .insert({
      law_firm_id: context.lawFirm.id,
      contract_request_id: data.contractRequestId,
      description: data.description,
      responsible_party: data.responsibleParty ?? null,
      internal_responsible_member_id:
        data.internalResponsibleMemberId ?? null,
      periodicity: data.periodicity ?? null,
      due_date: data.dueDate ?? null,
      evidence_description: data.evidenceDescription ?? null,
      alert_days_before: data.alertDaysBefore ?? 30,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractObligationRow(pub) : null;
}

export async function updateObligation(
  context: AppContext,
  id: string,
  data: Partial<{
    description: string;
    responsibleParty: string;
    internalResponsibleMemberId: string;
    periodicity: string;
    dueDate: string;
    evidenceDescription: string;
    status: string;
    alertDaysBefore: number;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: ContractObligationUpdate = {};

  if (data.description !== undefined) update.description = data.description;
  if (data.responsibleParty !== undefined)
    update.responsible_party = data.responsibleParty;
  if (data.internalResponsibleMemberId !== undefined)
    update.internal_responsible_member_id = data.internalResponsibleMemberId;
  if (data.periodicity !== undefined) update.periodicity = data.periodicity;
  if (data.dueDate !== undefined) update.due_date = data.dueDate;
  if (data.evidenceDescription !== undefined)
    update.evidence_description = data.evidenceDescription;
  if (data.status !== undefined) update.status = data.status;
  if (data.alertDaysBefore !== undefined)
    update.alert_days_before = data.alertDaysBefore;

  if (data.status === "concluida") {
    update.completed_at = new Date().toISOString();
  }

  await supabase
    .from("contract_obligations")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ══════════════════════════════════════════════
// Contract Amendments
// ══════════════════════════════════════════════

export async function getAmendments(
  context: AppContext,
  contractRequestId: string
): Promise<ContractAmendment[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("contract_amendments")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("contract_request_id", contractRequestId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapContractAmendmentRow);
}

export async function createAmendment(
  context: AppContext,
  data: {
    contractRequestId: string;
    amendmentType: string;
    description: string;
    newValue?: number;
    newVigenceStart?: string;
    newVigenceEnd?: string;
    attachmentUrl?: string;
  }
): Promise<ContractAmendment | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("contract_amendments")
    .insert({
      law_firm_id: context.lawFirm.id,
      contract_request_id: data.contractRequestId,
      amendment_type: data.amendmentType,
      description: data.description,
      new_value: data.newValue ?? null,
      new_vigence_start: data.newVigenceStart ?? null,
      new_vigence_end: data.newVigenceEnd ?? null,
      attachment_url: data.attachmentUrl ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractAmendmentRow(pub) : null;
}

// ══════════════════════════════════════════════
// Contract Counterparties
// ══════════════════════════════════════════════

export async function getCounterparties(
  context: AppContext,
  contractRequestId: string
): Promise<ContractCounterparty[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("contract_counterparties")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("contract_request_id", contractRequestId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapContractCounterpartyRow);
}

export async function createCounterparty(
  context: AppContext,
  data: {
    contractRequestId: string;
    partyName: string;
    partyType?: string;
    documentNumber?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    role?: string;
  }
): Promise<ContractCounterparty | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("contract_counterparties")
    .insert({
      law_firm_id: context.lawFirm.id,
      contract_request_id: data.contractRequestId,
      party_name: data.partyName,
      party_type: data.partyType ?? "pj",
      document_number: data.documentNumber ?? null,
      contact_name: data.contactName ?? null,
      contact_email: data.contactEmail ?? null,
      contact_phone: data.contactPhone ?? null,
      role: data.role ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapContractCounterpartyRow(pub) : null;
}

// ══════════════════════════════════════════════
// Dashboard Stats
// ══════════════════════════════════════════════

export async function getClmDashboardStats(context: AppContext): Promise<{
  totalRequests: number;
  emAndamento: number;
  aguardandoAprovacao: number;
  ativos: number;
  totalObligations: number;
  totalAmendments: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalRequests: 0,
      emAndamento: 0,
      aguardandoAprovacao: 0,
      ativos: 0,
      totalObligations: 0,
      totalAmendments: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [requestsRes, obligationsRes, amendmentsRes] = await Promise.all([
    supabase
      .from("contract_requests")
      .select("status")
      .eq("law_firm_id", firmId),
    supabase
      .from("contract_obligations")
      .select("id", { count: "exact" })
      .eq("law_firm_id", firmId),
    supabase
      .from("contract_amendments")
      .select("id", { count: "exact" })
      .eq("law_firm_id", firmId),
  ]);

  const requests = requestsRes.data ?? [];
  const emAndamento = requests.filter((r) =>
    ["triagem", "minuta", "revisao", "negociacao"].includes(r.status as string)
  ).length;
  const aguardandoAprovacao = requests.filter((r) =>
    ["aprovacao", "assinatura_pendente"].includes(r.status as string)
  ).length;
  const ativos = requests.filter((r) =>
    ["ativo", "renovacao"].includes(r.status as string)
  ).length;

  return {
    totalRequests: requests.length,
    emAndamento,
    aguardandoAprovacao,
    ativos,
    totalObligations: obligationsRes.count ?? 0,
    totalAmendments: amendmentsRes.count ?? 0,
  };
}

// ══════════════════════════════════════════════
// All Amendments (list view)
// ══════════════════════════════════════════════

export type AmendmentFilters = {
  status?: string;
  amendmentType?: string;
};

export async function getAllAmendments(
  context: AppContext,
  filters?: AmendmentFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ amendments: ContractAmendment[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { amendments: [], total: 0 };

  let query = supabase
    .from("contract_amendments")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.amendmentType) query = query.eq("amendment_type", filters.amendmentType);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    amendments: (data ?? []).map(mapContractAmendmentRow),
    total: count ?? 0,
  };
}
