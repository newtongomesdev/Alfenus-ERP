import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AccessRequestStatus, SessionStatus } from "./constants";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type AccessRequestFilters = {
  status?: AccessRequestStatus;
  operatorId?: string;
  search?: string;
};

export type AccessRequest = {
  id: string;
  law_firm_id: string;
  ticket_id: string;
  operator_id: string;
  status: string;
  reason: string;
  requested_modules: string[];
  requested_actions: string[];
  approved_modules: string[] | null;
  approved_actions: string[] | null;
  restrictions: string[] | null;
  duration_minutes: number;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  operator?: { id: string; name: string; email: string } | null;
  approver?: { id: string; name: string; email: string } | null;
  ticket?: { id: string; protocol: string; subject: string } | null;
};

export type AccessSession = {
  id: string;
  law_firm_id: string;
  access_request_id: string;
  operator_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  summary: string | null;
  created_at: string;
  access_request?: AccessRequest | null;
  operator?: { id: string; name: string; email: string } | null;
};

export type AccessEvent = {
  id: string;
  law_firm_id: string;
  access_request_id: string | null;
  session_id: string | null;
  event_type: string;
  actor_id: string;
  actor_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PaginatedResult<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * Lista solicitações de acesso para um tenant.
 */
export async function getAccessRequests(
  lawFirmId: string,
  filters: AccessRequestFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<AccessRequest>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from("support_access_requests")
    .select(
      "*, operator:law_firm_members!support_access_requests_operator_id_fkey(id, name, email), approver:law_firm_members!support_access_requests_approved_by_fkey(id, name, email), ticket:support_tickets(id, protocol, subject)",
      { count: "exact" },
    )
    .eq("law_firm_id", lawFirmId);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.operatorId) query = query.eq("operator_id", filters.operatorId);
  if (filters.search) {
    query = query.or(
      `reason.ilike.%${filters.search}%,operator:law_firm_members!support_access_requests_operator_id_fkey(name).ilike.%${filters.search}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[assisted-access/queries] getAccessRequests", error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []) as AccessRequest[],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Retorna uma solicitação de acesso por ID com escopos.
 */
export async function getAccessRequestById(
  requestId: string,
  lawFirmId: string,
): Promise<AccessRequest | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("support_access_requests")
    .select(
      "*, operator:law_firm_members!support_access_requests_operator_id_fkey(id, name, email), approver:law_firm_members!support_access_requests_approved_by_fkey(id, name, email), ticket:support_tickets(id, protocol, subject)",
    )
    .eq("id", requestId)
    .eq("law_firm_id", lawFirmId)
    .single();

  if (error || !data) return null;
  return data as AccessRequest;
}

/**
 * Retorna sessões ativas para um tenant.
 */
export async function getActiveSessions(
  lawFirmId: string,
): Promise<AccessSession[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_access_sessions")
    .select(
      "*, access_request:support_access_requests(id, reason, requested_modules, requested_actions, approved_modules, approved_actions, restrictions, duration_minutes), operator:law_firm_members!support_access_sessions_operator_id_fkey(id, name, email)",
    )
    .eq("law_firm_id", lawFirmId)
    .in("status", ["ativa", "aguardando_inicio", "suspensa"])
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[assisted-access/queries] getActiveSessions", error);
    return [];
  }

  return (data ?? []) as AccessSession[];
}

/**
 * Retorna sessões para um operador específico.
 */
export async function getOperatorSessions(
  operatorId: string,
): Promise<AccessSession[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_access_sessions")
    .select(
      "*, access_request:support_access_requests(id, reason, requested_modules, requested_actions, approved_modules, approved_actions, restrictions, duration_minutes)",
    )
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[assisted-access/queries] getOperatorSessions", error);
    return [];
  }

  return (data ?? []) as AccessSession[];
}

/**
 * Retorna eventos de auditoria de acesso.
 */
export async function getAccessEvents(
  requestId?: string,
  sessionId?: string,
): Promise<AccessEvent[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("support_access_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (requestId) query = query.eq("access_request_id", requestId);
  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;

  if (error) {
    console.error("[assisted-access/queries] getAccessEvents", error);
    return [];
  }

  return (data ?? []) as AccessEvent[];
}

/**
 * Retorna todas as solicitações de acesso para o admin da plataforma.
 */
export async function getPlatformAccessRequests(
  filters: AccessRequestFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<AccessRequest>> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  let query = adminClient
    .from("support_access_requests")
    .select(
      "*, operator:law_firm_members!support_access_requests_operator_id_fkey(id, name, email), approver:law_firm_members!support_access_requests_approved_by_fkey(id, name, email), ticket:support_tickets(id, protocol, subject), law_firms!inner(id, name, plan)",
      { count: "exact" },
    );

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.operatorId) query = query.eq("operator_id", filters.operatorId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[assisted-access/queries] getPlatformAccessRequests", error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []) as AccessRequest[],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Verifica se um operador possui sessão ativa em um tenant.
 */
export async function hasActiveSession(
  lawFirmId: string,
  operatorId: string,
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("support_access_sessions")
    .select("id")
    .eq("law_firm_id", lawFirmId)
    .eq("operator_id", operatorId)
    .in("status", ["ativa", "aguardando_inicio"])
    .limit(1);

  if (error) {
    console.error("[assisted-access/queries] hasActiveSession", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Verifica se um módulo está dentro do escopo de uma sessão.
 */
export async function isModuleAllowed(
  sessionId: string,
  module: string,
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("support_access_sessions")
    .select("access_request:support_access_requests(approved_modules)")
    .eq("id", sessionId)
    .single();

  if (error || !data) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = (data as any).access_request;
  if (!request) return false;

  const approvedModules: string[] = request.approved_modules ?? request.requested_modules ?? [];
  return approvedModules.includes(module);
}
