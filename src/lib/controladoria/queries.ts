import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";

type PublicationUpdate = Database["public"]["Tables"]["legal_publications"]["Update"];

export type LegalPublication = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  clientId: string | null;
  tribunal: string;
  diario: string | null;
  caseNumber: string | null;
  disponibilizedAt: string | null;
  publishedAt: string | null;
  content: string | null;
  summary: string | null;
  publicationType: string;
  origin: string;
  status: string;
  priority: string;
  triageMemberId: string | null;
  responsibleMemberId: string | null;
  suggestedDeadline: string | null;
  confirmedDeadline: string | null;
  treatedAt: string | null;
  treatedBy: string | null;
  treatedByMemberId: string | null;
  ignoreReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewedByMemberId: string | null;
  reviewNotes: string | null;
  observations: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicationFilters = {
  status?: string;
  publicationType?: string;
  priority?: string;
  responsibleMemberId?: string;
  clientId?: string;
  legalCaseId?: string;
  tribunal?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

function mapRow(row: Record<string, unknown>): LegalPublication {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    legalCaseId: row.legal_case_id as string | null,
    clientId: row.client_id as string | null,
    tribunal: row.tribunal as string,
    diario: row.diario as string | null,
    caseNumber: row.case_number as string | null,
    disponibilizedAt: row.disponibilized_at as string | null,
    publishedAt: row.published_at as string | null,
    content: row.content as string | null,
    summary: row.summary as string | null,
    publicationType: row.publication_type as string,
    origin: row.origin as string,
    status: row.status as string,
    priority: row.priority as string,
    triageMemberId: row.triage_member_id as string | null,
    responsibleMemberId: row.responsible_member_id as string | null,
    suggestedDeadline: row.suggested_deadline as string | null,
    confirmedDeadline: row.confirmed_deadline as string | null,
    treatedAt: row.treated_at as string | null,
    treatedBy: row.treated_by as string | null,
    treatedByMemberId: row.treated_by_member_id as string | null,
    ignoreReason: row.ignore_reason as string | null,
    reviewedAt: row.reviewed_at as string | null,
    reviewedBy: row.reviewed_by as string | null,
    reviewedByMemberId: row.reviewed_by_member_id as string | null,
    reviewNotes: row.review_notes as string | null,
    observations: row.observations as string | null,
    isRead: row.is_read as boolean,
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getPublications(
  context: AppContext,
  filters: PublicationFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ publications: LegalPublication[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return { publications: [], total: 0 };

  let query = supabase
    .from("legal_publications")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.publicationType) query = query.eq("publication_type", filters.publicationType);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.responsibleMemberId) query = query.eq("responsible_member_id", filters.responsibleMemberId);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.legalCaseId) query = query.eq("legal_case_id", filters.legalCaseId);
  if (filters.tribunal) query = query.ilike("tribunal", `%${filters.tribunal}%`);
  if (filters.dateFrom) query = query.gte("disponibilized_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("disponibilized_at", filters.dateTo);
  if (filters.q) query = query.or(`summary.ilike.%${filters.q}%,case_number.ilike.%${filters.q}%,content.ilike.%${filters.q}%`);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    publications: (data ?? []).map(mapRow),
    total: count ?? 0,
  };
}

export async function getPublicationById(
  context: AppContext,
  id: string
): Promise<LegalPublication | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("legal_publications")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function getPublicationStats(context: AppContext): Promise<{
  receivedToday: number;
  untreated: number;
  awaitingReview: number;
  withoutResponsible: number;
  expiredUntreated: number;
  deadlinesCreated: number;
  totalByStatus: Record<string, number>;
  totalByTribunal: Record<string, number>;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { receivedToday: 0, untreated: 0, awaitingReview: 0, withoutResponsible: 0, expiredUntreated: 0, deadlinesCreated: 0, totalByStatus: {}, totalByTribunal: {} };
  }

  const firmId = context.lawFirm.id;
  const today = new Date().toISOString().split("T")[0];

  const { data: all } = await supabase
    .from("legal_publications")
    .select("status, tribunal, responsible_member_id, confirmed_deadline, created_at")
    .eq("law_firm_id", firmId);

  const pubs = all ?? [];
  const receivedToday = pubs.filter((p) => p.created_at?.startsWith(today)).length;
  const untreated = pubs.filter((p) => !["tratada", "ignorada", "duplicada", "arquivada"].includes(p.status)).length;
  const awaitingReview = pubs.filter((p) => p.status === "aguardando_revisao").length;
  const withoutResponsible = pubs.filter((p) => !p.responsible_member_id && !["tratada", "ignorada", "duplicada", "arquivada"].includes(p.status)).length;
  const expiredUntreated = pubs.filter((p) => p.confirmed_deadline && p.confirmed_deadline < today && !["tratada", "ignorada", "duplicada", "arquivada"].includes(p.status)).length;
  const deadlinesCreated = pubs.filter((p) => p.confirmed_deadline).length;

  const totalByStatus: Record<string, number> = {};
  const totalByTribunal: Record<string, number> = {};
  for (const p of pubs) {
    totalByStatus[p.status] = (totalByStatus[p.status] ?? 0) + 1;
    if (p.tribunal) totalByTribunal[p.tribunal] = (totalByTribunal[p.tribunal] ?? 0) + 1;
  }

  return { receivedToday, untreated, awaitingReview, withoutResponsible, expiredUntreated, deadlinesCreated, totalByStatus, totalByTribunal };
}

export async function markAsRead(context: AppContext, id: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("legal_publications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function assignResponsible(
  context: AppContext,
  id: string,
  memberId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("legal_publications")
    .update({
      responsible_member_id: memberId,
      status: "aguardando_triagem",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function updatePublicationStatus(
  context: AppContext,
  id: string,
  status: string,
  extra?: { ignoreReason?: string; summary?: string; confirmedDeadline?: string; observations?: string; legalCaseId?: string; clientId?: string }
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: PublicationUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "tratada") {
    update.treated_at = new Date().toISOString();
    update.treated_by = context.member?.userId ?? null;
    update.treated_by_member_id = context.member?.id ?? null;
  }

  if (status === "ignorada" && extra?.ignoreReason) {
    update.ignore_reason = extra.ignoreReason;
    update.treated_at = new Date().toISOString();
    update.treated_by = context.member?.userId ?? null;
  }

  if (status === "aguardando_revisao") {
    update.review_notes = extra?.observations ?? null;
  }

  if (status === "tratada" || status === "aguardando_distribuicao") {
    if (extra?.summary) update.summary = extra.summary;
    if (extra?.confirmedDeadline) update.confirmed_deadline = extra.confirmedDeadline;
    if (extra?.observations) update.observations = extra.observations;
    if (extra?.legalCaseId) update.legal_case_id = extra.legalCaseId;
    if (extra?.clientId) update.client_id = extra.clientId;
  }

  if (status === "aguardando_revisao") {
    if (extra?.summary) update.summary = extra.summary;
    if (extra?.confirmedDeadline) update.confirmed_deadline = extra.confirmedDeadline;
    if (extra?.observations) update.observations = extra.observations;
  }

  await supabase
    .from("legal_publications")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function completeReview(
  context: AppContext,
  id: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: PublicationUpdate = {
    reviewed_at: new Date().toISOString(),
    reviewed_by: context.member?.userId ?? null,
    reviewed_by_member_id: context.member?.id ?? null,
    review_notes: notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (approved) {
    update.status = "tratada";
  } else {
    update.status = "aguardando_triagem";
    update.review_notes = notes ?? "Revisao reprovada";
  }

  await supabase
    .from("legal_publications")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function createPublication(
  context: AppContext,
  data: {
    tribunal: string;
    diario?: string;
    caseNumber?: string;
    disponibilizedAt?: string;
    publishedAt?: string;
    content?: string;
    summary?: string;
    publicationType?: string;
    priority?: string;
    legalCaseId?: string;
    clientId?: string;
  }
): Promise<LegalPublication | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("legal_publications")
    .insert({
      law_firm_id: context.lawFirm.id,
      tribunal: data.tribunal,
      diario: data.diario ?? null,
      case_number: data.caseNumber ?? null,
      disponibilized_at: data.disponibilizedAt ?? null,
      published_at: data.publishedAt ?? null,
      content: data.content ?? null,
      summary: data.summary ?? null,
      publication_type: data.publicationType ?? "despacho",
      origin: "manual",
      status: "recebida",
      priority: data.priority ?? "normal",
      legal_case_id: data.legalCaseId ?? null,
      client_id: data.clientId ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapRow(pub) : null;
}

export async function bulkAssign(
  context: AppContext,
  ids: string[],
  memberId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("legal_publications")
    .update({
      responsible_member_id: memberId,
      status: "aguardando_triagem",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function bulkUpdateStatus(
  context: AppContext,
  ids: string[],
  status: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("legal_publications")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}
