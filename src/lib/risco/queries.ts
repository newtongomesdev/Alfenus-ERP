import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  ProcessClaim,
  RiskAssessment,
  Provision,
  JudicialGuarantee,
  JudicialDeposit,
  Seizure,
  CourtRelease,
} from "./types";

type ClaimUpdate = Database["public"]["Tables"]["process_claims"]["Update"];
type RiskAssessmentUpdate =
  Database["public"]["Tables"]["risk_assessments"]["Update"];
type ProvisionUpdate = Database["public"]["Tables"]["provisions"]["Update"];
type GuaranteeUpdate =
  Database["public"]["Tables"]["judicial_guarantees"]["Update"];
type DepositUpdate =
  Database["public"]["Tables"]["judicial_deposits"]["Update"];
type SeizureUpdate = Database["public"]["Tables"]["seizures"]["Update"];
type CourtReleaseUpdate =
  Database["public"]["Tables"]["court_releases"]["Update"];

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapClaimRow(row: Record<string, unknown>): ProcessClaim {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    clientId: row.client_id as string | null,
    description: row.description as string,
    category: row.category as string,
    originalValue: row.original_value as number | null,
    updatedValue: row.updated_value as number | null,
    baseDate: row.base_date as string | null,
    indexName: row.index_name as string | null,
    status: row.status as string,
    result: row.result as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRiskAssessmentRow(
  row: Record<string, unknown>
): RiskAssessment {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    claimId: row.claim_id as string | null,
    classification: row.classification as string,
    probability: row.probability as number | null,
    estimatedValue: row.estimated_value as number | null,
    scenario: row.scenario as string,
    justification: row.justification as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    baseDate: row.base_date as string | null,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    version: row.version as number,
    previousVersionId: row.previous_version_id as string | null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapProvisionRow(row: Record<string, unknown>): Provision {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    claimId: row.claim_id as string | null,
    riskAssessmentId: row.risk_assessment_id as string | null,
    value: row.value as number,
    competence: row.competence as string | null,
    baseDate: row.base_date as string | null,
    provisionType: row.provision_type as string,
    justification: row.justification as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    status: row.status as string,
    reversalDate: row.reversal_date as string | null,
    reversalReason: row.reversal_reason as string | null,
    history: (row.history as unknown[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapGuaranteeRow(
  row: Record<string, unknown>
): JudicialGuarantee {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    guaranteeType: row.guarantee_type as string,
    value: row.value as number,
    assetDescription: row.asset_description as string | null,
    bank: row.bank as string | null,
    accountNumber: row.account_number as string | null,
    validityDate: row.validity_date as string | null,
    documentId: row.document_id as string | null,
    status: row.status as string,
    releaseDate: row.release_date as string | null,
    releaseDocument: row.release_document as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDepositRow(row: Record<string, unknown>): JudicialDeposit {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    depositType: row.deposit_type as string,
    value: row.value as number,
    bank: row.bank as string | null,
    agency: row.agency as string | null,
    accountNumber: row.account_number as string | null,
    depositDate: row.deposit_date as string | null,
    releaseDate: row.release_date as string | null,
    beneficiary: row.beneficiary as string | null,
    institution: row.institution as string | null,
    documentNumber: row.document_number as string | null,
    repasse: row.repasse as number | null,
    retention: row.retention as number | null,
    status: row.status as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSeizureRow(row: Record<string, unknown>): Seizure {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    seizureType: row.seizure_type as string,
    assetType: row.asset_type as string,
    assetDescription: row.asset_description as string | null,
    assetValue: row.asset_value as number | null,
    entity: row.entity as string | null,
    documentNumber: row.document_number as string | null,
    orderDate: row.order_date as string | null,
    status: row.status as string,
    releaseDate: row.release_date as string | null,
    releaseReason: row.release_reason as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCourtReleaseRow(
  row: Record<string, unknown>
): CourtRelease {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    seizureId: row.seizure_id as string | null,
    releasedValue: row.released_value as number,
    beneficiary: row.beneficiary as string | null,
    releaseDate: row.release_date as string | null,
    institution: row.institution as string | null,
    documentNumber: row.document_number as string | null,
    repasse: row.repasse as number | null,
    retention: row.retention as number | null,
    status: row.status as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export type ClaimFilters = {
  status?: string;
  category?: string;
  clientId?: string;
  legalCaseId?: string;
};

export type RiskAssessmentFilters = {
  status?: string;
  classification?: string;
  scenario?: string;
  legalCaseId?: string;
};

export type ProvisionFilters = {
  status?: string;
  provisionType?: string;
  legalCaseId?: string;
};

export type GuaranteeFilters = {
  status?: string;
  guaranteeType?: string;
};

export type DepositFilters = {
  status?: string;
  depositType?: string;
};

export type SeizureFilters = {
  status?: string;
  seizureType?: string;
  assetType?: string;
};

export type ReleaseFilters = {
  status?: string;
};

// ---------------------------------------------------------------------------
// Process Claims
// ---------------------------------------------------------------------------

export async function getClaims(
  context: AppContext,
  filters?: ClaimFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ claims: ProcessClaim[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { claims: [], total: 0 };

  let query = supabase
    .from("process_claims")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.legalCaseId)
    query = query.eq("legal_case_id", filters.legalCaseId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    claims: (data ?? []).map(mapClaimRow),
    total: count ?? 0,
  };
}

export async function getClaimById(
  context: AppContext,
  id: string
): Promise<ProcessClaim | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("process_claims")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapClaimRow(data) : null;
}

export async function getClaimStats(context: AppContext): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, byStatus: {}, totalValue: 0 };
  }

  const { data: all } = await supabase
    .from("process_claims")
    .select("status, updated_value")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};
  let totalValue = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    totalValue += (r.updated_value as number) ?? 0;
  }

  return { total, byStatus, totalValue };
}

export async function createClaim(
  context: AppContext,
  data: {
    legalCaseId?: string;
    clientId?: string;
    description: string;
    category: string;
    originalValue?: number;
    updatedValue?: number;
    baseDate?: string;
    indexName?: string;
    notes?: string;
  }
): Promise<ProcessClaim | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("process_claims")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      client_id: data.clientId ?? null,
      description: data.description,
      category: data.category,
      original_value: data.originalValue ?? null,
      updated_value: data.updatedValue ?? null,
      base_date: data.baseDate ?? null,
      index_name: data.indexName ?? null,
      status: "pendente",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapClaimRow(pub) : null;
}

export async function updateClaim(
  context: AppContext,
  id: string,
  data: Partial<{
    legalCaseId: string;
    clientId: string;
    description: string;
    category: string;
    originalValue: number;
    updatedValue: number;
    baseDate: string;
    indexName: string;
    status: string;
    result: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: ClaimUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.clientId !== undefined) update.client_id = data.clientId;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.originalValue !== undefined)
    update.original_value = data.originalValue;
  if (data.updatedValue !== undefined)
    update.updated_value = data.updatedValue;
  if (data.baseDate !== undefined) update.base_date = data.baseDate;
  if (data.indexName !== undefined) update.index_name = data.indexName;
  if (data.status !== undefined) update.status = data.status;
  if (data.result !== undefined) update.result = data.result;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("process_claims")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Risk Assessments
// ---------------------------------------------------------------------------

export async function getRiskAssessments(
  context: AppContext,
  filters?: RiskAssessmentFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ assessments: RiskAssessment[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { assessments: [], total: 0 };

  let query = supabase
    .from("risk_assessments")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.classification)
    query = query.eq("classification", filters.classification);
  if (filters?.scenario)
    query = query.ilike("scenario", `%${filters.scenario}%`);
  if (filters?.legalCaseId)
    query = query.eq("legal_case_id", filters.legalCaseId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    assessments: (data ?? []).map(mapRiskAssessmentRow),
    total: count ?? 0,
  };
}

export async function getRiskAssessmentById(
  context: AppContext,
  id: string
): Promise<RiskAssessment | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("risk_assessments")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapRiskAssessmentRow(data) : null;
}

export async function createRiskAssessment(
  context: AppContext,
  data: {
    legalCaseId?: string;
    claimId?: string;
    classification: string;
    probability?: number;
    estimatedValue?: number;
    scenario: string;
    justification?: string;
    responsibleMemberId?: string;
    baseDate?: string;
  }
): Promise<RiskAssessment | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  // Auto-calculate version: find the latest version for this claim
  let version = 1;
  if (data.claimId) {
    const { data: existing } = await supabase
      .from("risk_assessments")
      .select("version")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("claim_id", data.claimId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      version = (existing.version as number) + 1;
    }
  }

  const { data: pub } = await supabase
    .from("risk_assessments")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      claim_id: data.claimId ?? null,
      classification: data.classification,
      probability: data.probability ?? null,
      estimated_value: data.estimatedValue ?? null,
      scenario: data.scenario,
      justification: data.justification ?? null,
      responsible_member_id: data.responsibleMemberId ?? null,
      base_date: data.baseDate ?? null,
      version,
      status: "rascunho",
    })
    .select()
    .maybeSingle();

  return pub ? mapRiskAssessmentRow(pub) : null;
}

export async function updateRiskAssessment(
  context: AppContext,
  id: string,
  data: Partial<{
    classification: string;
    probability: number;
    estimatedValue: number;
    scenario: string;
    justification: string;
    responsibleMemberId: string;
    baseDate: string;
    approvedBy: string;
    status: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: RiskAssessmentUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.classification !== undefined)
    update.classification = data.classification;
  if (data.probability !== undefined)
    update.probability = data.probability;
  if (data.estimatedValue !== undefined)
    update.estimated_value = data.estimatedValue;
  if (data.scenario !== undefined) update.scenario = data.scenario;
  if (data.justification !== undefined)
    update.justification = data.justification;
  if (data.responsibleMemberId !== undefined)
    update.responsible_member_id = data.responsibleMemberId;
  if (data.baseDate !== undefined) update.base_date = data.baseDate;
  if (data.approvedBy !== undefined) {
    update.approved_by = data.approvedBy;
    update.approved_at = new Date().toISOString();
  }
  if (data.status !== undefined) update.status = data.status;

  await supabase
    .from("risk_assessments")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Provisions
// ---------------------------------------------------------------------------

export async function getProvisions(
  context: AppContext,
  filters?: ProvisionFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ provisions: Provision[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { provisions: [], total: 0 };

  let query = supabase
    .from("provisions")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.provisionType)
    query = query.eq("provision_type", filters.provisionType);
  if (filters?.legalCaseId)
    query = query.eq("legal_case_id", filters.legalCaseId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    provisions: (data ?? []).map(mapProvisionRow),
    total: count ?? 0,
  };
}

export async function getProvisionById(
  context: AppContext,
  id: string
): Promise<Provision | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("provisions")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapProvisionRow(data) : null;
}

export async function getProvisionStats(context: AppContext): Promise<{
  total: number;
  totalValue: number;
  byType: Record<string, { count: number; value: number }>;
  byStatus: Record<string, number>;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, totalValue: 0, byType: {}, byStatus: {} };
  }

  const { data: all } = await supabase
    .from("provisions")
    .select("status, provision_type, value")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  let totalValue = 0;
  const byType: Record<string, { count: number; value: number }> = {};
  const byStatus: Record<string, number> = {};

  for (const r of rows) {
    totalValue += (r.value as number) ?? 0;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    const t = r.provision_type as string;
    if (!byType[t]) byType[t] = { count: 0, value: 0 };
    byType[t].count += 1;
    byType[t].value += (r.value as number) ?? 0;
  }

  return { total, totalValue, byType, byStatus };
}

export async function createProvision(
  context: AppContext,
  data: {
    legalCaseId?: string;
    claimId?: string;
    riskAssessmentId?: string;
    value: number;
    competence?: string;
    baseDate?: string;
    provisionType: string;
    justification?: string;
    responsibleMemberId?: string;
  }
): Promise<Provision | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("provisions")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      claim_id: data.claimId ?? null,
      risk_assessment_id: data.riskAssessmentId ?? null,
      value: data.value,
      competence: data.competence ?? null,
      base_date: data.baseDate ?? null,
      provision_type: data.provisionType,
      justification: data.justification ?? null,
      responsible_member_id: data.responsibleMemberId ?? null,
      status: "pendente",
      history: [],
    })
    .select()
    .maybeSingle();

  return pub ? mapProvisionRow(pub) : null;
}

export async function updateProvision(
  context: AppContext,
  id: string,
  data: Partial<{
    value: number;
    competence: string;
    baseDate: string;
    provisionType: string;
    justification: string;
    responsibleMemberId: string;
    approvedBy: string;
    status: string;
    reversalDate: string;
    reversalReason: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: ProvisionUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.value !== undefined) update.value = data.value;
  if (data.competence !== undefined) update.competence = data.competence;
  if (data.baseDate !== undefined) update.base_date = data.baseDate;
  if (data.provisionType !== undefined)
    update.provision_type = data.provisionType;
  if (data.justification !== undefined)
    update.justification = data.justification;
  if (data.responsibleMemberId !== undefined)
    update.responsible_member_id = data.responsibleMemberId;
  if (data.approvedBy !== undefined) {
    update.approved_by = data.approvedBy;
    update.approved_at = new Date().toISOString();
  }
  if (data.status !== undefined) update.status = data.status;
  if (data.reversalDate !== undefined)
    update.reversal_date = data.reversalDate;
  if (data.reversalReason !== undefined)
    update.reversal_reason = data.reversalReason;

  await supabase
    .from("provisions")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Judicial Guarantees
// ---------------------------------------------------------------------------

export async function getGuarantees(
  context: AppContext,
  filters?: GuaranteeFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ guarantees: JudicialGuarantee[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { guarantees: [], total: 0 };

  let query = supabase
    .from("judicial_guarantees")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.guaranteeType)
    query = query.eq("guarantee_type", filters.guaranteeType);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    guarantees: (data ?? []).map(mapGuaranteeRow),
    total: count ?? 0,
  };
}

export async function createGuarantee(
  context: AppContext,
  data: {
    legalCaseId?: string;
    guaranteeType: string;
    value: number;
    assetDescription?: string;
    bank?: string;
    accountNumber?: string;
    validityDate?: string;
    documentId?: string;
    notes?: string;
  }
): Promise<JudicialGuarantee | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("judicial_guarantees")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      guarantee_type: data.guaranteeType,
      value: data.value,
      asset_description: data.assetDescription ?? null,
      bank: data.bank ?? null,
      account_number: data.accountNumber ?? null,
      validity_date: data.validityDate ?? null,
      document_id: data.documentId ?? null,
      status: "ativa",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapGuaranteeRow(pub) : null;
}

export async function updateGuarantee(
  context: AppContext,
  id: string,
  data: Partial<{
    legalCaseId: string;
    guaranteeType: string;
    value: number;
    assetDescription: string;
    bank: string;
    accountNumber: string;
    validityDate: string;
    documentId: string;
    status: string;
    releaseDate: string;
    releaseDocument: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: GuaranteeUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.guaranteeType !== undefined)
    update.guarantee_type = data.guaranteeType;
  if (data.value !== undefined) update.value = data.value;
  if (data.assetDescription !== undefined)
    update.asset_description = data.assetDescription;
  if (data.bank !== undefined) update.bank = data.bank;
  if (data.accountNumber !== undefined)
    update.account_number = data.accountNumber;
  if (data.validityDate !== undefined)
    update.validity_date = data.validityDate;
  if (data.documentId !== undefined)
    update.document_id = data.documentId;
  if (data.status !== undefined) update.status = data.status;
  if (data.releaseDate !== undefined)
    update.release_date = data.releaseDate;
  if (data.releaseDocument !== undefined)
    update.release_document = data.releaseDocument;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("judicial_guarantees")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Judicial Deposits
// ---------------------------------------------------------------------------

export async function getDeposits(
  context: AppContext,
  filters?: DepositFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ deposits: JudicialDeposit[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { deposits: [], total: 0 };

  let query = supabase
    .from("judicial_deposits")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.depositType)
    query = query.eq("deposit_type", filters.depositType);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    deposits: (data ?? []).map(mapDepositRow),
    total: count ?? 0,
  };
}

export async function createDeposit(
  context: AppContext,
  data: {
    legalCaseId?: string;
    depositType: string;
    value: number;
    bank?: string;
    agency?: string;
    accountNumber?: string;
    depositDate?: string;
    releaseDate?: string;
    beneficiary?: string;
    institution?: string;
    documentNumber?: string;
    repasse?: number;
    retention?: number;
    notes?: string;
  }
): Promise<JudicialDeposit | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("judicial_deposits")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      deposit_type: data.depositType,
      value: data.value,
      bank: data.bank ?? null,
      agency: data.agency ?? null,
      account_number: data.accountNumber ?? null,
      deposit_date: data.depositDate ?? null,
      release_date: data.releaseDate ?? null,
      beneficiary: data.beneficiary ?? null,
      institution: data.institution ?? null,
      document_number: data.documentNumber ?? null,
      repasse: data.repasse ?? null,
      retention: data.retention ?? null,
      status: "realizado",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapDepositRow(pub) : null;
}

export async function updateDeposit(
  context: AppContext,
  id: string,
  data: Partial<{
    legalCaseId: string;
    depositType: string;
    value: number;
    bank: string;
    agency: string;
    accountNumber: string;
    depositDate: string;
    releaseDate: string;
    beneficiary: string;
    institution: string;
    documentNumber: string;
    repasse: number;
    retention: number;
    status: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: DepositUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.depositType !== undefined)
    update.deposit_type = data.depositType;
  if (data.value !== undefined) update.value = data.value;
  if (data.bank !== undefined) update.bank = data.bank;
  if (data.agency !== undefined) update.agency = data.agency;
  if (data.accountNumber !== undefined)
    update.account_number = data.accountNumber;
  if (data.depositDate !== undefined)
    update.deposit_date = data.depositDate;
  if (data.releaseDate !== undefined)
    update.release_date = data.releaseDate;
  if (data.beneficiary !== undefined)
    update.beneficiary = data.beneficiary;
  if (data.institution !== undefined)
    update.institution = data.institution;
  if (data.documentNumber !== undefined)
    update.document_number = data.documentNumber;
  if (data.repasse !== undefined) update.repasse = data.repasse;
  if (data.retention !== undefined) update.retention = data.retention;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("judicial_deposits")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Seizures
// ---------------------------------------------------------------------------

export async function getSeizures(
  context: AppContext,
  filters?: SeizureFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ seizures: Seizure[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { seizures: [], total: 0 };

  let query = supabase
    .from("seizures")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.seizureType)
    query = query.eq("seizure_type", filters.seizureType);
  if (filters?.assetType)
    query = query.eq("asset_type", filters.assetType);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    seizures: (data ?? []).map(mapSeizureRow),
    total: count ?? 0,
  };
}

export async function createSeizure(
  context: AppContext,
  data: {
    legalCaseId?: string;
    seizureType: string;
    assetType: string;
    assetDescription?: string;
    assetValue?: number;
    entity?: string;
    documentNumber?: string;
    orderDate?: string;
    notes?: string;
  }
): Promise<Seizure | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("seizures")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      seizure_type: data.seizureType,
      asset_type: data.assetType,
      asset_description: data.assetDescription ?? null,
      asset_value: data.assetValue ?? null,
      entity: data.entity ?? null,
      document_number: data.documentNumber ?? null,
      order_date: data.orderDate ?? null,
      status: "ativo",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapSeizureRow(pub) : null;
}

export async function updateSeizure(
  context: AppContext,
  id: string,
  data: Partial<{
    legalCaseId: string;
    seizureType: string;
    assetType: string;
    assetDescription: string;
    assetValue: number;
    entity: string;
    documentNumber: string;
    orderDate: string;
    status: string;
    releaseDate: string;
    releaseReason: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: SeizureUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.seizureType !== undefined)
    update.seizure_type = data.seizureType;
  if (data.assetType !== undefined)
    update.asset_type = data.assetType;
  if (data.assetDescription !== undefined)
    update.asset_description = data.assetDescription;
  if (data.assetValue !== undefined)
    update.asset_value = data.assetValue;
  if (data.entity !== undefined) update.entity = data.entity;
  if (data.documentNumber !== undefined)
    update.document_number = data.documentNumber;
  if (data.orderDate !== undefined)
    update.order_date = data.orderDate;
  if (data.status !== undefined) update.status = data.status;
  if (data.releaseDate !== undefined)
    update.release_date = data.releaseDate;
  if (data.releaseReason !== undefined)
    update.release_reason = data.releaseReason;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("seizures")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Court Releases
// ---------------------------------------------------------------------------

export async function getReleases(
  context: AppContext,
  filters?: ReleaseFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ releases: CourtRelease[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { releases: [], total: 0 };

  let query = supabase
    .from("court_releases")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    releases: (data ?? []).map(mapCourtReleaseRow),
    total: count ?? 0,
  };
}

export async function createRelease(
  context: AppContext,
  data: {
    legalCaseId?: string;
    seizureId?: string;
    releasedValue: number;
    beneficiary?: string;
    releaseDate?: string;
    institution?: string;
    documentNumber?: string;
    repasse?: number;
    retention?: number;
    notes?: string;
  }
): Promise<CourtRelease | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("court_releases")
    .insert({
      law_firm_id: context.lawFirm.id,
      legal_case_id: data.legalCaseId ?? null,
      seizure_id: data.seizureId ?? null,
      released_value: data.releasedValue,
      beneficiary: data.beneficiary ?? null,
      release_date: data.releaseDate ?? null,
      institution: data.institution ?? null,
      document_number: data.documentNumber ?? null,
      repasse: data.repasse ?? null,
      retention: data.retention ?? null,
      status: "realizado",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapCourtReleaseRow(pub) : null;
}

export async function updateRelease(
  context: AppContext,
  id: string,
  data: Partial<{
    legalCaseId: string;
    seizureId: string;
    releasedValue: number;
    beneficiary: string;
    releaseDate: string;
    institution: string;
    documentNumber: string;
    repasse: number;
    retention: number;
    status: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: CourtReleaseUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.seizureId !== undefined)
    update.seizure_id = data.seizureId;
  if (data.releasedValue !== undefined)
    update.released_value = data.releasedValue;
  if (data.beneficiary !== undefined)
    update.beneficiary = data.beneficiary;
  if (data.releaseDate !== undefined)
    update.release_date = data.releaseDate;
  if (data.institution !== undefined)
    update.institution = data.institution;
  if (data.documentNumber !== undefined)
    update.document_number = data.documentNumber;
  if (data.repasse !== undefined) update.repasse = data.repasse;
  if (data.retention !== undefined) update.retention = data.retention;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("court_releases")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getRiskDashboardStats(context: AppContext) {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalClaims: 0,
      totalValue: 0,
      byStatus: {} as Record<string, number>,
      totalRiskAssessments: 0,
      byClassification: {} as Record<string, number>,
      totalProvisions: 0,
      totalProvisionValue: 0,
      byType: {} as Record<string, number>,
      totalGuarantees: 0,
      totalGuaranteeValue: 0,
      totalSeizures: 0,
      totalSeizureValue: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [claimsRes, assessmentsRes, provisionsRes, guaranteesRes, seizuresRes] =
    await Promise.all([
      supabase
        .from("process_claims")
        .select("status, updated_value")
        .eq("law_firm_id", firmId),
      supabase
        .from("risk_assessments")
        .select("classification")
        .eq("law_firm_id", firmId),
      supabase
        .from("provisions")
        .select("status, provision_type, value")
        .eq("law_firm_id", firmId),
      supabase
        .from("judicial_guarantees")
        .select("value")
        .eq("law_firm_id", firmId),
      supabase
        .from("seizures")
        .select("asset_value")
        .eq("law_firm_id", firmId),
    ]);

  const claims = claimsRes.data ?? [];
  const assessments = assessmentsRes.data ?? [];
  const provisions = provisionsRes.data ?? [];
  const guarantees = guaranteesRes.data ?? [];
  const seizuresData = seizuresRes.data ?? [];

  const byStatus: Record<string, number> = {};
  let totalValue = 0;
  for (const c of claims) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    totalValue += (c.updated_value as number) ?? 0;
  }

  const byClassification: Record<string, number> = {};
  for (const a of assessments) {
    byClassification[a.classification] =
      (byClassification[a.classification] ?? 0) + 1;
  }

  let totalProvisionValue = 0;
  const byType: Record<string, number> = {};
  for (const p of provisions) {
    totalProvisionValue += (p.value as number) ?? 0;
    byType[p.provision_type] = (byType[p.provision_type] ?? 0) + 1;
  }

  let totalGuaranteeValue = 0;
  for (const g of guarantees) {
    totalGuaranteeValue += (g.value as number) ?? 0;
  }

  let totalSeizureValue = 0;
  for (const s of seizuresData) {
    totalSeizureValue += (s.asset_value as number) ?? 0;
  }

  return {
    totalClaims: claims.length,
    totalValue,
    byStatus,
    totalRiskAssessments: assessments.length,
    byClassification,
    totalProvisions: provisions.length,
    totalProvisionValue,
    byType,
    totalGuarantees: guarantees.length,
    totalGuaranteeValue,
    totalSeizures: seizuresData.length,
    totalSeizureValue,
  };
}
