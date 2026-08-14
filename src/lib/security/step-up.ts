/**
 * Serviço de step-up authentication.
 * Gerencia autorizações temporárias para ações sensíveis,
 * exigindo reautenticação adicional (MFA) com expiração de 5 minutos.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepUpAction =
  | "financial"
  | "export"
  | "permission_change"
  | "sensitive_document"
  | "support_access"
  | "delete_account"
  | "change_password"
  | "reset_mfa";

export type StepUpAuthMethod =
  | "password"
  | "totp"
  | "sms"
  | "webauthn";

export type StepUpAuthorization = {
  id: string;
  userId: string;
  lawFirmId: string;
  sessionId: string;
  actionType: StepUpAction;
  authMethod: StepUpAuthMethod;
  ipAddress: string | null;
  consumed: boolean;
  expiresAt: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Janela de validade de uma autorização step-up (5 minutos). */
const STEP_UP_EXPIRY_MINUTES = 5;

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Solicita uma nova autorização step-up.
 * Cria um registro com janela de 5 minutos a partir de agora.
 * Se já existir uma autorização válida para a mesma combinação,
 * retorna a existente em vez de criar outra.
 */
export async function requestStepUp(
  userId: string,
  lawFirmId: string,
  sessionId: string,
  actionType: StepUpAction,
  authMethod: StepUpAuthMethod,
  ipAddress?: string
): Promise<{ granted: boolean; expiresAt: string }> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return { granted: false, expiresAt: "" };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + STEP_UP_EXPIRY_MINUTES * 60 * 1000);

  // Verifica se já existe uma autorização válida (não consumida, não expirada)
  const { data: existing } = await client
    .from("step_up_authorizations" as any)
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("action_type", actionType)
    .eq("consumed", false)
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (existing) {
    return { granted: true, expiresAt: existing.expires_at };
  }

  const { data, error } = await client
    .from("step_up_authorizations" as any)
    .insert({
      user_id: userId,
      law_firm_id: lawFirmId,
      session_id: sessionId,
      action_type: actionType,
      auth_method: authMethod,
      ip_address: ipAddress ?? null,
      consumed: false,
      expires_at: expiresAt.toISOString(),
    })
    .select("expires_at")
    .single();

  if (error) throw error;

  // Registra evento de auditoria
  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: userId,
    action: "step_up_granted",
    entity_type: "step_up_authorization",
    entity_id: data?.id ?? null,
    details: {
      action_type: actionType,
      auth_method: authMethod,
      session_id: sessionId,
      ip_address: ipAddress ?? null,
    },
    ip_address: ipAddress ?? null,
  });

  return { granted: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Valida se existe uma autorização step-up ativa (não consumida e não expirada)
 * para a combinação user+session+action.
 */
export async function validateStepUp(
  userId: string,
  sessionId: string,
  actionType: StepUpAction
): Promise<{ valid: boolean }> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return { valid: false };

  const now = new Date().toISOString();

  const { data } = await client
    .from("step_up_authorizations" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("action_type", actionType)
    .eq("consumed", false)
    .gt("expires_at", now)
    .maybeSingle();

  return { valid: !!data };
}

/**
 * Consome (marca como usada) uma autorização step-up válida.
 * Deve ser chamada após a ação sensível ser executada com sucesso.
 */
export async function consumeStepUpAuthorization(
  userId: string,
  sessionId: string,
  actionType: StepUpAction
): Promise<{ consumed: boolean }> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return { consumed: false };

  const now = new Date().toISOString();

  const { data, error } = await client
    .from("step_up_authorizations" as any)
    .update({ consumed: true })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("action_type", actionType)
    .eq("consumed", false)
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (data) {
    await client.from("admin_audit_logs" as any).insert({
      admin_user_id: userId,
      action: "step_up_consumed",
      entity_type: "step_up_authorization",
      entity_id: data.id,
      details: {
        action_type: actionType,
        session_id: sessionId,
      },
    });
  }

  return { consumed: !!data };
}

/**
 * Revoga todas as autorizações step-up ativas de um usuário.
 * Usado ao alterar senha, resetar MFA ou fazer logout.
 */
export async function revokeStepUpAuthorizations(
  userId: string,
  reason?: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  // Busca autorizações ativas antes de revogar (para log)
  const { data: active } = await client
    .from("step_up_authorizations" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("consumed", false)
    .gt("expires_at", now);

  if (!active || active.length === 0) return;

  const { error } = await client
    .from("step_up_authorizations" as any)
    .update({ consumed: true })
    .eq("user_id", userId)
    .eq("consumed", false)
    .gt("expires_at", now);

  if (error) throw error;

  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: userId,
    action: "step_up_revoked_all",
    entity_type: "step_up_authorization",
    entity_id: userId,
    details: {
      reason: reason ?? "revoke_all",
      count: active.length,
    },
  });
}

/**
 * Lista todas as autorizações step-up ativas de um usuário
 * (não consumidas e não expiradas).
 */
export async function getActiveStepUps(
  userId: string
): Promise<StepUpAuthorization[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const now = new Date().toISOString();

  const { data } = await client
    .from("step_up_authorizations" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("consumed", false)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    lawFirmId: row.law_firm_id,
    sessionId: row.session_id,
    actionType: row.action_type as StepUpAction,
    authMethod: row.auth_method as StepUpAuthMethod,
    ipAddress: row.ip_address,
    consumed: row.consumed,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}
