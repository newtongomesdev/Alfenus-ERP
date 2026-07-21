/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EVENT_TYPES } from "./constants";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type AccessEventParams = {
  lawFirmId: string;
  eventType: (typeof EVENT_TYPES)[number];
  actorId: string;
  actorType?: string;
  accessRequestId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AccessAttemptParams = {
  lawFirmId: string;
  actorId: string;
  actorType?: string;
  accessRequestId?: string | null;
  sessionId?: string | null;
  route?: string;
  method?: string;
  endpoint?: string;
  module?: string;
  action?: string;
  entityId?: string;
  reason?: string;
};

export type AuditSummary = {
  totalEvents: number;
  allowedAttempts: number;
  blockedAttempts: number;
  uniqueRoutes: number;
  topBlockedRoutes: { route: string; count: number }[];
  eventsByType: Record<string, number>;
  periodStart: string;
  periodEnd: string;
};

// ── Sanitização de metadata ─────────────────────────────────────────────────

const SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "api_key",
  "cpf",
  "cnpj",
  "credit_card",
  "card_number",
  "conta_bancaria",
  "agencia",
  "chave_pix",
  "authorization",
  "cookie",
];

function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ── Funções de auditoria (somente escrita, imutável) ────────────────────────

/**
 * Registra um evento de acesso completo em support_access_events.
 * Função imutável — apenas cria registros, nunca atualiza nem exclui.
 */
export async function recordAccessEvent(
  params: AccessEventParams,
): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const sanitizedMetadata = params.metadata
    ? sanitizeMetadata(params.metadata)
    : {};

  const { data, error } = await (supabase as any)
    .from("support_access_events")
    .insert({
      law_firm_id: params.lawFirmId,
      access_request_id: params.accessRequestId ?? null,
      session_id: params.sessionId ?? null,
      event_type: params.eventType,
      actor_id: params.actorId,
      actor_type: params.actorType ?? "operator",
      metadata: sanitizedMetadata,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[assisted-access/audit] recordAccessEvent", error);
    return null;
  }

  return data?.id as string;
}

/**
 * Registra uma tentativa de acesso (permitida ou bloqueada).
 * Cria eventos do tipo "tentativa_permitida" ou "tentativa_bloqueada".
 */
export async function recordAccessAttempt(
  params: AccessAttemptParams,
  allowed: boolean,
): Promise<string | null> {
  const eventType = allowed
    ? "tentativa_permitida"
    : "tentativa_bloqueada";

  const metadata: Record<string, unknown> = {
    route: params.route ?? null,
    method: params.method ?? null,
    endpoint: params.endpoint ?? null,
    module: params.module ?? null,
    action: params.action ?? null,
    entity_id: params.entityId ?? null,
    allowed,
  };

  if (!allowed && params.reason) {
    metadata.block_reason = params.reason;
  }

  return recordAccessEvent({
    lawFirmId: params.lawFirmId,
    eventType: eventType as (typeof EVENT_TYPES)[number],
    actorId: params.actorId,
    actorType: params.actorType ?? "operator",
    accessRequestId: params.accessRequestId ?? null,
    sessionId: params.sessionId ?? null,
    metadata,
  });
}

/**
 * Retorna o log de auditoria para uma solicitação (e opcionalmente sessão).
 * Usado para exibição na interface.
 */
export async function getAccessAuditLog(
  requestId: string,
  sessionId?: string,
): Promise<any[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  let query = (supabase as any)
    .from("support_access_events")
    .select("*")
    .eq("access_request_id", requestId)
    .order("created_at", { ascending: true });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[assisted-access/audit] getAccessAuditLog", error);
    return [];
  }

  return data ?? [];
}

/**
 * Retorna um resumo de auditoria para um tenant em um período.
 */
export async function getAccessAuditSummary(
  lawFirmId: string,
  dateRange: { from: string; to: string },
): Promise<AuditSummary> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      totalEvents: 0,
      allowedAttempts: 0,
      blockedAttempts: 0,
      uniqueRoutes: 0,
      topBlockedRoutes: [],
      eventsByType: {},
      periodStart: dateRange.from,
      periodEnd: dateRange.to,
    };
  }

  const { data, error } = await (supabase as any)
    .from("support_access_events")
    .select("event_type, metadata, created_at")
    .eq("law_firm_id", lawFirmId)
    .gte("created_at", dateRange.from)
    .lte("created_at", dateRange.to)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[assisted-access/audit] getAccessAuditSummary", error);
    return {
      totalEvents: 0,
      allowedAttempts: 0,
      blockedAttempts: 0,
      uniqueRoutes: 0,
      topBlockedRoutes: [],
      eventsByType: {},
      periodStart: dateRange.from,
      periodEnd: dateRange.to,
    };
  }

  const events = data ?? [];

  let allowedAttempts = 0;
  let blockedAttempts = 0;
  const routeCounts: Record<string, number> = {};
  const eventsByType: Record<string, number> = {};

  for (const event of events) {
    const type = event.event_type as string;
    eventsByType[type] = (eventsByType[type] ?? 0) + 1;

    if (type === "tentativa_permitida") {
      allowedAttempts++;
    } else if (type === "tentativa_bloqueada") {
      blockedAttempts++;
      const meta = (event.metadata as Record<string, unknown>) ?? {};
      const route = (meta.route as string) ?? "desconhecida";
      routeCounts[route] = (routeCounts[route] ?? 0) + 1;
    }
  }

  const topBlockedRoutes = Object.entries(routeCounts)
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: events.length,
    allowedAttempts,
    blockedAttempts,
    uniqueRoutes: Object.keys(routeCounts).length,
    topBlockedRoutes,
    eventsByType,
    periodStart: dateRange.from,
    periodEnd: dateRange.to,
  };
}
