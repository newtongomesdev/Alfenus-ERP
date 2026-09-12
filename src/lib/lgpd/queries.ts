import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  LgpdConsent,
  LgpdDataSubjectRequest,
  LgpdRetentionPolicy,
  LgpdDataClassification,
} from "./types";

type ConsentUpdate = Database["public"]["Tables"]["lgpd_consents"]["Update"];
type DsrUpdate =
  Database["public"]["Tables"]["lgpd_data_subject_requests"]["Update"];
type RetentionPolicyUpdate =
  Database["public"]["Tables"]["lgpd_retention_policies"]["Update"];

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapConsentRow(row: Record<string, unknown>): LgpdConsent {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    dataSubjectId: row.data_subject_id as string | null,
    purpose: row.purpose as string,
    consentText: row.consent_text as string,
    consentVersion: row.consent_version as string,
    granted: row.granted as boolean,
    origin: row.origin as string | null,
    ipAddress: row.ip_address as string | null,
    revoked: row.revoked as boolean,
    revokedAt: row.revoked_at as string | null,
    revokedReason: row.revoked_reason as string | null,
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapDsrRow(
  row: Record<string, unknown>
): LgpdDataSubjectRequest {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    dataSubjectId: row.data_subject_id as string | null,
    requestType: row.request_type as string,
    description: row.description as string | null,
    status: row.status as string,
    priority: row.priority as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    receivedAt: row.received_at as string | null,
    identifiedAt: row.identified_at as string | null,
    analysisStartedAt: row.analysis_started_at as string | null,
    decidedAt: row.decided_at as string | null,
    completedAt: row.completed_at as string | null,
    decisionNotes: row.decision_notes as string | null,
    rejectionReason: row.rejection_reason as string | null,
    identityVerified: row.identity_verified as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRetentionPolicyRow(
  row: Record<string, unknown>
): LgpdRetentionPolicy {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    policyName: row.policy_name as string,
    description: row.description as string | null,
    targetModule: row.target_module as string,
    documentType: row.document_type as string | null,
    retentionDays: row.retention_days as number,
    legalBasis: row.legal_basis as string | null,
    autoDelete: row.auto_delete as boolean,
    requiresReview: row.requires_review as boolean,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapClassificationRow(
  row: Record<string, unknown>
): LgpdDataClassification {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    classification: row.classification as string,
    classifiedBy: row.classified_by as string | null,
    classifiedAt: row.classified_at as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Consents
// ---------------------------------------------------------------------------

export async function getConsents(
  context: AppContext,
  page: number = 1,
  pageSize: number = 20
): Promise<{ consents: LgpdConsent[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { consents: [], total: 0 };

  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from("lgpd_consents")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    consents: (data ?? []).map(mapConsentRow),
    total: count ?? 0,
  };
}

export async function createConsent(
  context: AppContext,
  data: {
    dataSubjectId?: string;
    purpose: string;
    consentText: string;
    consentVersion?: string;
    granted: boolean;
    origin?: string;
    ipAddress?: string;
    expiresAt?: string;
  }
): Promise<LgpdConsent | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("lgpd_consents")
    .insert({
      law_firm_id: context.lawFirm.id,
      data_subject_id: data.dataSubjectId ?? null,
      purpose: data.purpose,
      consent_text: data.consentText,
      consent_version: data.consentVersion ?? "1.0",
      granted: data.granted,
      origin: data.origin ?? null,
      ip_address: data.ipAddress ?? null,
      expires_at: data.expiresAt ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapConsentRow(pub) : null;
}

export async function revokeConsent(
  context: AppContext,
  id: string,
  reason?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  await supabase
    .from("lgpd_consents")
    .update({
      revoked: true,
      revoked_at: now,
      revoked_reason: reason ?? null,
    } satisfies ConsentUpdate)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Data Subject Requests
// ---------------------------------------------------------------------------

export async function getSubjectRequests(
  context: AppContext,
  filters?: {
    status?: string;
    requestType?: string;
  },
  page: number = 1,
  pageSize: number = 20
): Promise<{ requests: LgpdDataSubjectRequest[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { requests: [], total: 0 };

  let query = supabase
    .from("lgpd_data_subject_requests")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.requestType)
    query = query.eq("request_type", filters.requestType);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    requests: (data ?? []).map(mapDsrRow),
    total: count ?? 0,
  };
}

export async function getSubjectRequestById(
  context: AppContext,
  id: string
): Promise<LgpdDataSubjectRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("lgpd_data_subject_requests")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapDsrRow(data) : null;
}

export async function getSubjectRequestStats(context: AppContext): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byRequestType: Record<string, number>;
  pendingCount: number;
  completedCount: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      total: 0,
      byStatus: {},
      byRequestType: {},
      pendingCount: 0,
      completedCount: 0,
    };
  }

  const { data: all } = await supabase
    .from("lgpd_data_subject_requests")
    .select("status, request_type")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  const byRequestType: Record<string, number> = {};

  const pendingStatuses = new Set([
    "recebida",
    "identificacao",
    "em_analise",
  ]);

  let pendingCount = 0;
  let completedCount = 0;

  for (const r of rows) {
    const status = r.status as string;
    const requestType = r.request_type as string;

    byStatus[status] = (byStatus[status] ?? 0) + 1;
    byRequestType[requestType] = (byRequestType[requestType] ?? 0) + 1;

    if (pendingStatuses.has(status)) pendingCount++;
    if (status === "concluida") completedCount++;
  }

  return { total, byStatus, byRequestType, pendingCount, completedCount };
}

export async function createSubjectRequest(
  context: AppContext,
  data: {
    dataSubjectId?: string;
    requestType: string;
    description?: string;
    priority?: string;
  }
): Promise<LgpdDataSubjectRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("lgpd_data_subject_requests")
    .insert({
      law_firm_id: context.lawFirm.id,
      data_subject_id: data.dataSubjectId ?? null,
      request_type: data.requestType,
      description: data.description ?? null,
      priority: data.priority ?? "normal",
    })
    .select()
    .maybeSingle();

  return pub ? mapDsrRow(pub) : null;
}

export async function updateSubjectRequestStatus(
  context: AppContext,
  id: string,
  status: string,
  opts?: {
    responsibleMemberId?: string;
    decisionNotes?: string;
    rejectionReason?: string;
  }
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const update: DsrUpdate = { status };

  if (opts?.responsibleMemberId !== undefined)
    update.responsible_member_id = opts.responsibleMemberId;
  if (opts?.decisionNotes !== undefined)
    update.decision_notes = opts.decisionNotes;
  if (opts?.rejectionReason !== undefined)
    update.rejection_reason = opts.rejectionReason;

  if (status === "identificacao") update.identified_at = now;
  if (status === "em_analise") update.analysis_started_at = now;
  if (
    status === "aprovada" ||
    status === "parcialmente_aprovada" ||
    status === "recusada"
  )
    update.decided_at = now;
  if (status === "concluida") update.completed_at = now;

  await supabase
    .from("lgpd_data_subject_requests")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

export async function getRetentionPolicies(
  context: AppContext,
  page: number = 1,
  pageSize: number = 20
): Promise<{ policies: LgpdRetentionPolicy[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { policies: [], total: 0 };

  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from("lgpd_retention_policies")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    policies: (data ?? []).map(mapRetentionPolicyRow),
    total: count ?? 0,
  };
}

export async function createRetentionPolicy(
  context: AppContext,
  data: {
    policyName: string;
    description?: string;
    targetModule: string;
    documentType?: string;
    retentionDays: number;
    legalBasis?: string;
    autoDelete?: boolean;
    requiresReview?: boolean;
  }
): Promise<LgpdRetentionPolicy | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("lgpd_retention_policies")
    .insert({
      law_firm_id: context.lawFirm.id,
      policy_name: data.policyName,
      description: data.description ?? null,
      target_module: data.targetModule,
      document_type: data.documentType ?? null,
      retention_days: data.retentionDays,
      legal_basis: data.legalBasis ?? null,
      auto_delete: data.autoDelete ?? false,
      requires_review: data.requiresReview ?? true,
    })
    .select()
    .maybeSingle();

  return pub ? mapRetentionPolicyRow(pub) : null;
}

export async function updateRetentionPolicy(
  context: AppContext,
  id: string,
  data: Partial<{
    policyName: string;
    description: string;
    targetModule: string;
    documentType: string;
    retentionDays: number;
    legalBasis: string;
    autoDelete: boolean;
    requiresReview: boolean;
    isActive: boolean;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: RetentionPolicyUpdate = {};

  if (data.policyName !== undefined) update.policy_name = data.policyName;
  if (data.description !== undefined) update.description = data.description;
  if (data.targetModule !== undefined) update.target_module = data.targetModule;
  if (data.documentType !== undefined) update.document_type = data.documentType;
  if (data.retentionDays !== undefined)
    update.retention_days = data.retentionDays;
  if (data.legalBasis !== undefined) update.legal_basis = data.legalBasis;
  if (data.autoDelete !== undefined) update.auto_delete = data.autoDelete;
  if (data.requiresReview !== undefined)
    update.requires_review = data.requiresReview;
  if (data.isActive !== undefined) update.is_active = data.isActive;

  await supabase
    .from("lgpd_retention_policies")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Data Classifications
// ---------------------------------------------------------------------------

export async function getClassifications(
  context: AppContext,
  entityType?: string,
  entityId?: string
): Promise<LgpdDataClassification[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("lgpd_data_classifications")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);

  const { data } = await query.order("classified_at", { ascending: false });

  return (data ?? []).map(mapClassificationRow);
}

export async function createClassification(
  context: AppContext,
  data: {
    entityType: string;
    entityId: string;
    classification: string;
    notes?: string;
  }
): Promise<LgpdDataClassification | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("lgpd_data_classifications")
    .insert({
      law_firm_id: context.lawFirm.id,
      entity_type: data.entityType,
      entity_id: data.entityId,
      classification: data.classification,
      classified_by: context.member?.userId ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapClassificationRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getLgpdDashboardStats(context: AppContext): Promise<{
  totalConsents: number;
  activeConsents: number;
  pendingRequests: number;
  completedRequests: number;
  activePolicies: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalConsents: 0,
      activeConsents: 0,
      pendingRequests: 0,
      completedRequests: 0,
      activePolicies: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [consentsRes, requestsRes, policiesRes] = await Promise.all([
    supabase
      .from("lgpd_consents")
      .select("granted, revoked")
      .eq("law_firm_id", firmId),
    supabase
      .from("lgpd_data_subject_requests")
      .select("status")
      .eq("law_firm_id", firmId),
    supabase
      .from("lgpd_retention_policies")
      .select("is_active")
      .eq("law_firm_id", firmId),
  ]);

  const consents = consentsRes.data ?? [];
  const requests = requestsRes.data ?? [];
  const policies = policiesRes.data ?? [];

  const pendingStatuses = new Set([
    "recebida",
    "identificacao",
    "em_analise",
  ]);

  const totalConsents = consents.length;
  const activeConsents = consents.filter(
    (c) => c.granted && !c.revoked
  ).length;

  let pendingRequests = 0;
  let completedRequests = 0;
  for (const r of requests) {
    const status = r.status as string;
    if (pendingStatuses.has(status)) pendingRequests++;
    if (status === "concluida") completedRequests++;
  }

  const activePolicies = policies.filter((p) => p.is_active).length;

  return {
    totalConsents,
    activeConsents,
    pendingRequests,
    completedRequests,
    activePolicies,
  };
}
