/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_STATUSES } from "./constants";
import { recordAccessEvent } from "./audit";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type RevocationResult = {
  success: boolean;
  error?: string;
};

export type SessionValidityCheck = {
  valid: boolean;
  reason?: string;
};

// ── Funções de revogação / encerramento ─────────────────────────────────────

/**
 * Revoga imediatamente uma sessão de acesso assistido.
 * Cria evento de auditoria "sessao_revogada".
 */
export async function revokeSession(
  sessionId: string,
  revokedBy: string,
  reason: string,
): Promise<RevocationResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "supabase_indisponivel" };

  const { data: session, error: fetchError } = await (supabase as any)
    .from("support_access_sessions")
    .select("id, law_firm_id, status, access_request_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return { success: false, error: "sessao_nao_encontrada" };
  }

  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
    SESSION_STATUSES.suspensa,
  ];

  if (!activeStatuses.includes(session.status)) {
    return { success: false, error: "sessao_ja_encerrada" };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await (supabase as any)
    .from("support_access_sessions")
    .update({
      status: SESSION_STATUSES.revogada,
      ended_at: now,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[assisted-access/revoke] revokeSession", updateError);
    return { success: false, error: "erro_revogar_sessao" };
  }

  // Atualizar solicitação associada
  if (session.access_request_id) {
    await (supabase as any)
      .from("support_access_requests")
      .update({
        status: "encerrada",
        ended_at: now,
        updated_at: now,
      })
      .eq("id", session.access_request_id);
  }

  // Criar evento de auditoria
  await recordAccessEvent({
    lawFirmId: session.law_firm_id,
    eventType: "sessao_revogada",
    actorId: revokedBy,
    actorType: "admin",
    accessRequestId: session.access_request_id ?? null,
    sessionId,
    metadata: { reason: reason.trim(), operator_initiated: false },
  });

  return { success: true };
}

/**
 * Encerra voluntariamente uma sessão.
 * Cria evento de auditoria "sessao_encerrada".
 */
export async function endSession(
  sessionId: string,
  endedBy: string,
  summary?: string,
): Promise<RevocationResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "supabase_indisponivel" };

  const { data: session, error: fetchError } = await (supabase as any)
    .from("support_access_sessions")
    .select("id, law_firm_id, status, access_request_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return { success: false, error: "sessao_nao_encontrada" };
  }

  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
    SESSION_STATUSES.suspensa,
  ];

  if (!activeStatuses.includes(session.status)) {
    return { success: false, error: "sessao_ja_encerrada" };
  }

  const now = new Date().toISOString();
  const trimmedSummary = summary?.trim() || null;

  const { error: updateError } = await (supabase as any)
    .from("support_access_sessions")
    .update({
      status: SESSION_STATUSES.encerrada,
      ended_at: now,
      summary: trimmedSummary,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[assisted-access/revoke] endSession", updateError);
    return { success: false, error: "erro_encerrar_sessao" };
  }

  // Atualizar solicitação associada
  if (session.access_request_id) {
    await (supabase as any)
      .from("support_access_requests")
      .update({
        status: "encerrada",
        ended_at: now,
        summary: trimmedSummary,
        updated_at: now,
      })
      .eq("id", session.access_request_id);
  }

  // Criar evento de auditoria
  await recordAccessEvent({
    lawFirmId: session.law_firm_id,
    eventType: "sessao_encerrada",
    actorId: endedBy,
    actorType: "operator",
    accessRequestId: session.access_request_id ?? null,
    sessionId,
    metadata: {
      summary: trimmedSummary,
      operator_initiated: true,
    },
  });

  return { success: true };
}

/**
 * Marca uma sessão como expirada (chamada pelo sistema).
 * Cria evento de auditoria "sessao_expirada".
 */
export async function expireSession(
  sessionId: string,
): Promise<RevocationResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "supabase_indisponivel" };

  const { data: session, error: fetchError } = await (supabase as any)
    .from("support_access_sessions")
    .select("id, law_firm_id, status, access_request_id")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return { success: false, error: "sessao_nao_encontrada" };
  }

  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
    SESSION_STATUSES.suspensa,
  ];

  if (!activeStatuses.includes(session.status)) {
    return { success: false, error: "sessao_ja_encerrada" };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await (supabase as any)
    .from("support_access_sessions")
    .update({
      status: SESSION_STATUSES.expirada,
      ended_at: now,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[assisted-access/revoke] expireSession", updateError);
    return { success: false, error: "erro_expirar_sessao" };
  }

  // Atualizar solicitação associada
  if (session.access_request_id) {
    await (supabase as any)
      .from("support_access_requests")
      .update({
        status: "expirada",
        ended_at: now,
        updated_at: now,
      })
      .eq("id", session.access_request_id);
  }

  // Criar evento de auditoria
  await recordAccessEvent({
    lawFirmId: session.law_firm_id,
    eventType: "sessao_expirada",
    actorId: "system",
    actorType: "system",
    accessRequestId: session.access_request_id ?? null,
    sessionId,
    metadata: { reason: "expiracao_automatica" },
  });

  return { success: true };
}

// ── Funções de verificação ──────────────────────────────────────────────────

/**
 * Verifica se uma sessão é válida para uso (ativa e não expirada).
 */
export function isSessionValid(session: {
  status: string;
  expires_at: string;
}): SessionValidityCheck {
  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
  ];

  if (!activeStatuses.includes(session.status)) {
    return {
      valid: false,
      reason: `Status "${session.status}" não é um status ativo`,
    };
  }

  if (new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      reason: "Sessão expirada",
    };
  }

  return { valid: true };
}

/**
 * Retorna os minutos restantes de uma sessão.
 */
export function getSessionRemainingMinutes(session: {
  expires_at: string;
  status: string;
}): number {
  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
    SESSION_STATUSES.suspensa,
  ];

  if (!activeStatuses.includes(session.status)) {
    return 0;
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60));
}

/**
 * Expira em lote todas as sessões cujo expires_at já passou.
 * Retorna o número de sessões expiradas.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return 0;

  const now = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("support_access_sessions")
    .select("id, law_firm_id, access_request_id")
    .in("status", [
      SESSION_STATUSES.ativa,
      SESSION_STATUSES.aguardando_inicio,
      SESSION_STATUSES.suspensa,
    ])
    .lt("expires_at", now);

  if (error) {
    console.error("[assisted-access/revoke] cleanupExpiredSessions fetch", error);
    return 0;
  }

  const sessions = data ?? [];
  if (sessions.length === 0) return 0;

  const sessionIds = sessions.map((s: any) => s.id);

  // Atualizar todas as sessões expiradas de uma vez
  const { error: updateError } = await (supabase as any)
    .from("support_access_sessions")
    .update({
      status: SESSION_STATUSES.expirada,
      ended_at: now,
    })
    .in("id", sessionIds);

  if (updateError) {
    console.error("[assisted-access/revoke] cleanupExpiredSessions update", updateError);
    return 0;
  }

  // Atualizar solicitações associadas
  const requestIds = sessions
    .filter((s: any) => s.access_request_id)
    .map((s: any) => s.access_request_id);

  if (requestIds.length > 0) {
    await (supabase as any)
      .from("support_access_requests")
      .update({
        status: "expirada",
        ended_at: now,
        updated_at: now,
      })
      .in("id", requestIds);
  }

  // Criar eventos de auditoria para cada sessão expirada
  for (const session of sessions) {
    await recordAccessEvent({
      lawFirmId: session.law_firm_id,
      eventType: "sessao_expirada",
      actorId: "system",
      actorType: "system",
      accessRequestId: session.access_request_id ?? null,
      sessionId: session.id,
      metadata: { reason: "expiracao_automatica_lote" },
    });
  }

  return sessions.length;
}
