/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  FORBIDDEN_ACTIONS,
  ASSISTED_ACTIONS,
  ASSISTED_MODULES,
  SESSION_STATUSES,
  MAX_DURATION_MINUTES,
} from "./constants";
// types from constants used inline

// ── Tipos ───────────────────────────────────────────────────────────────────

export type SessionValidationResult = {
  valid: boolean;
  session?: any;
  error?: string;
};

export type ActionCheckResult = {
  allowed: boolean;
  reason?: string;
};

// ── Validação de sessão ─────────────────────────────────────────────────────

/**
 * Valida se uma sessão está ativa, não expirada, no tenant e operador corretos.
 */
export async function validateSession(
  sessionId: string,
  lawFirmId: string,
  operatorId: string,
): Promise<SessionValidationResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { valid: false, error: "supabase_indisponivel" };

  const result = await (supabase as any)
    .from("support_access_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  const session = result.data as Record<string, unknown> | null;
  const error = result.error;

  if (error || !session) {
    return { valid: false, error: "sessao_nao_encontrada" };
  }

  if (session.law_firm_id !== lawFirmId) {
    return { valid: false, error: "tenant_incorreto" };
  }

  if (session.operator_id !== operatorId) {
    return { valid: false, error: "operador_incorreto" };
  }

  const activeStatuses: string[] = [SESSION_STATUSES.ativa, SESSION_STATUSES.aguardando_inicio];
  if (!activeStatuses.includes(session.status as string)) {
    return { valid: false, error: `sessao_${session.status}` };
  }

  if (session.expires_at && new Date(session.expires_at as string) < new Date()) {
    await (supabase as any)
      .from("support_access_sessions")
      .update({ status: SESSION_STATUSES.expirada, ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    return { valid: false, error: "sessao_expirada" };
  }

  return { valid: true, session };
}

// ── Verificação de ações ────────────────────────────────────────────────────

/**
 * Verifica se uma ação pode ser executada dentro do escopo da sessão.
 */
export async function canPerformAction(
  sessionId: string,
  module: string,
  action: string,
  entityId?: string,
): Promise<ActionCheckResult> {
  // Ações proibidas nunca são permitidas
  if (isActionForbidden(action)) {
    return { allowed: false, reason: "acao_proibida" };
  }

  // Verificar se o módulo é válido
  if (!ASSISTED_MODULES.includes(module as any)) {
    return { allowed: false, reason: "modulo_invalido" };
  }

  // Verificar se a ação é válida
  if (!ASSISTED_ACTIONS.includes(action as any)) {
    return { allowed: false, reason: "acao_invalida" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { allowed: false, reason: "supabase_indisponivel" };

  // Buscar a sessão e seu escopo
  const { data: session, error } = await supabase
    .from("support_access_sessions")
    .select("access_request:support_access_requests(approved_modules, approved_actions, restrictions)")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return { allowed: false, reason: "sessao_nao_encontrada" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = (session as any).access_request;
  if (!request) {
    return { allowed: false, reason: "solicitacao_nao_encontrada" };
  }

  const approvedModules: string[] = request.approved_modules ?? [];
  const approvedActions: string[] = request.approved_actions ?? ASSISTED_ACTIONS as unknown as string[];
  const restrictions: string[] = request.restrictions ?? [];

  // Verificar se o módulo está no escopo aprovado
  if (!approvedModules.includes(module)) {
    return { allowed: false, reason: "modulo_fora_escopo" };
  }

  // Verificar se a ação está nas ações aprovadas
  if (!approvedActions.includes(action)) {
    return { allowed: false, reason: "acao_fora_escopo" };
  }

  // Verificar restrições específicas
  const restrictionKey = `${module}:${action}`;
  const moduleOnlyRestriction = `modulo:${module}`;
  const actionOnlyRestriction = `acao:${action}`;

  if (
    restrictions.includes(restrictionKey) ||
    restrictions.includes(moduleOnlyRestriction) ||
    restrictions.includes(actionOnlyRestriction)
  ) {
    return { allowed: false, reason: "restricao_aplicada" };
  }

  return { allowed: true };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica se uma ação está na lista de ações proibidas.
 */
export function isActionForbidden(action: string): boolean {
  return (FORBIDDEN_ACTIONS as readonly string[]).includes(action);
}

/**
 * Mascara dados sensíveis para modo assistido (CPF, CNPJ, tokens etc).
 */
export function maskSensitiveData(
  data: Record<string, unknown>,
  session: { access_request?: { approved_modules?: string[] } | null },
): Record<string, unknown> {
  const masked = { ...data };

  const maskedFields = [
    "cpf",
    "cnpj",
    "document",
    "documento",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "api_key",
    "password",
    "senha",
    "credit_card",
    "card_number",
    "conta_bancaria",
    "agencia",
    "chave_pix",
  ];

  for (const field of maskedFields) {
    if (masked[field] !== undefined && masked[field] !== null) {
      const value = String(masked[field]);
      if (value.length > 4) {
        masked[field] = value.slice(0, 3) + "*".repeat(Math.min(value.length - 3, 12));
      } else {
        masked[field] = "***";
      }
    }
  }

  // Para objetos aninhados
  for (const [key, value] of Object.entries(masked)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveData(
        value as Record<string, unknown>,
        session,
      );
    }
  }

  return masked;
}

/**
 * Retorna os minutos restantes de uma sessão.
 */
export function getSessionTimeRemaining(
  session: { expires_at: string; status: string },
): number {
  if (
    session.status !== SESSION_STATUSES.ativa &&
    session.status !== SESSION_STATUSES.aguardando_inicio &&
    session.status !== SESSION_STATUSES.suspensa
  ) {
    return 0;
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60));
}

/**
 * Marca como expiradas todas as sessões cujo expires_at já passou.
 */
export async function expireOverdueSessions(): Promise<number> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return 0;

  const now = new Date().toISOString();

  const result = await (supabase as any)
    .from("support_access_sessions")
    .update({
      status: SESSION_STATUSES.expirada,
      ended_at: now,
    })
    .in("status", [SESSION_STATUSES.ativa, SESSION_STATUSES.aguardando_inicio, SESSION_STATUSES.suspensa])
    .lt("expires_at", now)
    .select("id");

  const data = result.data;
  const error = result.error;

  if (error) {
    console.error("[assisted-access/service] expireOverdueSessions", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Valida se a duração solicitada está dentro do limite.
 */
export function validateDuration(minutes: number): boolean {
  return minutes > 0 && minutes <= MAX_DURATION_MINUTES;
}

/**
 * Retorna o timestamp de expiração a partir da duração.
 */
export function getExpiresAt(durationMinutes: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + durationMinutes);
  return now.toISOString();
}
