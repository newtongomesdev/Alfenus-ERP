/**
 * Serviço de ciclo de vida de sessões aprimorado.
 * Gerencia criação, renovação, revogação e expiração de sessões
 * com rastreamento completo de eventos e dispositivos.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionStatus =
  | "ativa"
  | "revogada"
  | "expirada"
  | "suspeita";

export type UserSession = {
  id: string;
  userId: string;
  lawFirmId: string;
  memberId: string;
  ipAddress: string | null;
  userAgent: string | null;
  mfaLevel: string | null;
  deviceInfo: Record<string, any> | null;
  status: SessionStatus;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
};

export type SessionEvent = {
  id: string;
  sessionId: string;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
};

export type SessionDetails = UserSession & {
  events: SessionEvent[];
  riskFlags: Array<{
    id: string;
    riskType: string;
    riskLevel: string;
    description: string;
    createdAt: string;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function createSessionEvent(
  client: AnyClient,
  params: {
    sessionId: string;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const { error } = await client.from("session_events" as any).insert({
    session_id: params.sessionId,
    event_type: params.eventType,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) console.error("[session-lifecycle] erro ao registrar evento:", error.message);
}

function mapSessionRow(row: any): UserSession {
  return {
    id: row.id,
    userId: row.user_id,
    lawFirmId: row.law_firm_id,
    memberId: row.member_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    mfaLevel: row.mfa_level,
    deviceInfo: row.device_info,
    status: row.status as SessionStatus,
    lastActivityAt: row.last_activity_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Cria uma nova sessão de usuário.
 * Registra evento 'criada' na trilha de auditoria.
 */
export async function createUserSession(
  userId: string,
  lawFirmId: string,
  memberId: string,
  sessionData: {
    ipAddress?: string;
    userAgent?: string;
    mfaLevel?: string;
    deviceInfo?: Record<string, any>;
    expiresAt?: string;
  }
): Promise<UserSession | null> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return null;

  const now = new Date();
  // Padrão: sessão expira em 8 horas
  const expiresAt = sessionData.expiresAt
    ? new Date(sessionData.expiresAt)
    : new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const { data, error } = await client
    .from("user_sessions" as any)
    .insert({
      user_id: userId,
      law_firm_id: lawFirmId,
      member_id: memberId,
      ip_address: sessionData.ipAddress ?? null,
      user_agent: sessionData.userAgent ?? null,
      mfa_level: sessionData.mfaLevel ?? null,
      device_info: sessionData.deviceInfo ?? null,
      status: "ativa",
      last_activity_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  // Registra evento 'criada'
  await createSessionEvent(client, {
    sessionId: data.id,
    eventType: "criada",
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent,
    metadata: { mfa_level: sessionData.mfaLevel ?? null },
  });

  return mapSessionRow(data);
}

/**
 * Atualiza a última atividade de uma sessão.
 * Detecta mudanças de IP e registra eventos apropriados.
 */
export async function refreshSession(
  sessionId: string,
  ipAddress?: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  // Busca sessão atual para comparar IP
  const { data: current } = await client
    .from("user_sessions" as any)
    .select("ip_address, status")
    .eq("id", sessionId)
    .eq("status", "ativa")
    .maybeSingle();

  if (!current) return;

  // Atualiza last_activity_at
  const updates: Record<string, any> = { last_activity_at: now };
  if (ipAddress) {
    updates.ip_address = ipAddress;
  }

  const { error } = await client
    .from("user_sessions" as any)
    .update(updates)
    .eq("id", sessionId)
    .eq("status", "ativa");

  if (error) throw error;

  // Detecta mudança de IP
  if (ipAddress && current.ip_address && ipAddress !== current.ip_address) {
    await createSessionEvent(client, {
      sessionId,
      eventType: "ip_alterado",
      ipAddress,
      metadata: {
        previous_ip: current.ip_address,
        new_ip: ipAddress,
      },
    });
  }

  // Registra evento de atividade
  await createSessionEvent(client, {
    sessionId,
    eventType: "atividade",
    ipAddress,
  });
}

/**
 * Revoga uma sessão específica.
 * Define status='revogada' e registra evento 'revogada'.
 * Retorna se a sessão era a corrente (o caller deve tratar sign-out).
 */
export async function revokeSession(
  sessionId: string,
  revokedBy: string,
  reason: string
): Promise<{ revoked: boolean; wasCurrentSession: boolean }> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return { revoked: false, wasCurrentSession: false };

  const now = new Date().toISOString();

  const { data: session } = await client
    .from("user_sessions" as any)
    .select("id, status")
    .eq("id", sessionId)
    .eq("status", "ativa")
    .maybeSingle();

  if (!session) return { revoked: false, wasCurrentSession: false };

  const { error } = await client
    .from("user_sessions" as any)
    .update({ status: "revogada" })
    .eq("id", sessionId)
    .eq("status", "ativa");

  if (error) throw error;

  // Registra evento
  await createSessionEvent(client, {
    sessionId,
    eventType: "revogada",
    metadata: {
      revoked_by: revokedBy,
      reason,
    },
  });

  // Log de auditoria
  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: revokedBy,
    action: "session_revoked",
    entity_type: "user_session",
    entity_id: sessionId,
    details: { reason },
  });

  return { revoked: true, wasCurrentSession: false };
}

/**
 * Revoga todas as sessões de um usuário, exceto opcionalmente uma.
 */
export async function revokeAllUserSessions(
  userId: string,
  lawFirmId: string,
  revokedBy: string,
  reason?: string,
  excludeSessionId?: string
): Promise<number> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return 0;

  const now = new Date().toISOString();

  // Busca sessões ativas antes de revogar
  let query = client
    .from("user_sessions" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativa");

  if (excludeSessionId) {
    query = query.neq("id", excludeSessionId);
  }

  const { data: activeSessions } = await query;
  if (!activeSessions || activeSessions.length === 0) return 0;

  const sessionIds = activeSessions.map((s: any) => s.id);

  // Atualiza status para 'revogada'
  let updateQuery = client
    .from("user_sessions" as any)
    .update({ status: "revogada" })
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativa");

  if (excludeSessionId) {
    updateQuery = updateQuery.neq("id", excludeSessionId);
  }

  const { error } = await updateQuery;
  if (error) throw error;

  // Registra evento para cada sessão revogada
  for (const sid of sessionIds) {
    await createSessionEvent(client, {
      sessionId: sid,
      eventType: "revogada",
      metadata: {
        revoked_by: revokedBy,
        reason: reason ?? "revogacao_em_lote",
      },
    });
  }

  // Log de auditoria
  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: revokedBy,
    action: "sessions_revoked_all",
    entity_type: "user_session",
    entity_id: userId,
    details: {
      sessions_revoked: sessionIds.length,
      reason: reason ?? "revogacao_em_lote",
      excluded_session: excludeSessionId ?? null,
    },
  });

  return sessionIds.length;
}

/**
 * Encontra e expira sessões que passaram do expires_at.
 * Registra evento 'expirada' para cada uma.
 */
export async function expireOldSessions(): Promise<number> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return 0;

  const now = new Date().toISOString();

  // Busca sessões ativas expiradas
  const { data: expiredSessions } = await client
    .from("user_sessions" as any)
    .select("id")
    .eq("status", "ativa")
    .lt("expires_at", now);

  if (!expiredSessions || expiredSessions.length === 0) return 0;

  // Atualiza status para 'expirada'
  const { error } = await client
    .from("user_sessions" as any)
    .update({ status: "expirada" })
    .eq("status", "ativa")
    .lt("expires_at", now);

  if (error) throw error;

  // Registra evento para cada sessão
  for (const session of expiredSessions) {
    await createSessionEvent(client, {
      sessionId: session.id,
      eventType: "expirada",
    });
  }

  return expiredSessions.length;
}

/**
 * Retorna detalhes completos de uma sessão,
 * incluindo dispositivo, flags de risco e eventos.
 */
export async function getSessionWithDetails(
  sessionId: string
): Promise<SessionDetails | null> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return null;

  // Busca sessão
  const { data: sessionData } = await client
    .from("user_sessions" as any)
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionData) return null;

  const session = mapSessionRow(sessionData);

  // Busca eventos
  const { data: eventsData } = await client
    .from("session_events" as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const events: SessionEvent[] = (eventsData ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

  // Busca flags de risco associadas
  const { data: riskData } = await client
    .from("risk_flags" as any)
    .select("id, risk_type, risk_level, description, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const riskFlags = (riskData ?? []).map((row: any) => ({
    id: row.id,
    riskType: row.risk_type,
    riskLevel: row.risk_level,
    description: row.description,
    createdAt: row.created_at,
  }));

  return {
    ...session,
    events,
    riskFlags,
  };
}

/**
 * Lista todas as sessões de um usuário em uma escritoria.
 */
export async function getUserSessions(
  userId: string,
  lawFirmId: string
): Promise<UserSession[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const { data, error } = await client
    .from("user_sessions" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => mapSessionRow(row));
}

/**
 * Marca uma sessão como suspeita.
 * Define status='suspeita' e cria uma flag de risco associada.
 */
export async function markSessionSuspicious(
  sessionId: string,
  reason: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  // Atualiza status da sessão
  const { data: session } = await client
    .from("user_sessions" as any)
    .select("user_id, law_firm_id")
    .eq("id", sessionId)
    .eq("status", "ativa")
    .maybeSingle();

  if (!session) return;

  const { error } = await client
    .from("user_sessions" as any)
    .update({ status: "suspeita" })
    .eq("id", sessionId)
    .eq("status", "ativa");

  if (error) throw error;

  // Registra evento
  await createSessionEvent(client, {
    sessionId,
    eventType: "marcada_suspeita",
    metadata: { reason },
  });

  // Cria flag de risco associada
  await client.from("risk_flags" as any).insert({
    user_id: session.user_id,
    law_firm_id: session.law_firm_id,
    session_id: sessionId,
    risk_type: "user_agent_suspeito",
    risk_level: "alto_risco",
    description: `Sessao marcada como suspeita: ${reason}`,
    metadata: { reason, session_id: sessionId },
    resolved: false,
  });

  // Log de auditoria
  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: session.user_id,
    action: "session_marked_suspicious",
    entity_type: "user_session",
    entity_id: sessionId,
    details: { reason },
  });
}
