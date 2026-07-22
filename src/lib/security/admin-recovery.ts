/**
 * Serviço de recuperação administrativa.
 * Fornece ferramentas para administradores super-ajudarem usuários
 * que perderam o acesso à conta: diagnóstico, desbloqueio de MFA,
 * geração de códigos de recuperação, forçar sign-out e reset de senha.
 * Todas as operações requerem autenticação de superadmin.
 * Todas as ações são registradas na trilha de auditoria.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateRecoveryCodes, getRecoveryCodeCount } from "@/lib/security/recovery-codes";
import { resetMfaLockout, isMfaLockedOut } from "@/lib/security/mfa-challenge";

type AnyClient = { from(table: string): any };
type AdminAuthClient = { auth: { admin: { signOut(userId: string, scope: string): Promise<any>; getUserById(userId: string): Promise<any>; generateLink(params: any): Promise<any>; updateUserById(userId: string, data: any): Promise<any>; } } };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminRecoveryStatus = {
  mfa: {
    hasEnrollment: boolean;
    enabled: boolean;
    lockedOut: boolean;
    lockoutExpiresAt?: string;
  };
  recoveryCodes: { activeCount: number };
  trustedDevices: { activeCount: number };
  sessions: { activeCount: number };
  overallStatus:
    | "ok"
    | "mfa_locked"
    | "mfa_not_configured"
    | "no_recovery_codes"
    | "multiple_issues";
};

export type AdminRecoveryAction = {
  action: string;
  targetUserId: string;
  adminUserId: string;
  justification: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JUSTIFICATION_MIN_LENGTH = 10;

/**
 * Valida a justificativa mínima para ações de recuperação.
 */
function isValidJustification(justification: string): boolean {
  return Boolean(justification && justification.trim().length >= JUSTIFICATION_MIN_LENGTH);
}

/**
 * Registra um evento de auditoria para ações de recuperação administrativa.
 */
async function logRecoveryAuditEvent(
  client: AnyClient,
  params: {
    adminUserId: string;
    targetUserId: string;
    lawFirmId: string;
    action: string;
    justification: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    entity_type: "user",
    entity_id: params.targetUserId,
    entity_name: null,
    details: {
      justification: params.justification.trim(),
      law_firm_id: params.lawFirmId,
      ...params.metadata,
    },
    ip_address: null,
  });
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Retorna diagnóstico completo do status de acesso de um usuário.
 * Coleta dados de MFA, códigos de recuperação, dispositivos confiáveis,
 * sessões ativas e monta um status geral consolidado.
 */
export async function getAdminRecoveryStatus(
  targetUserId: string,
  lawFirmId: string
): Promise<AdminRecoveryStatus> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return {
      mfa: { hasEnrollment: false, enabled: false, lockedOut: false },
      recoveryCodes: { activeCount: 0 },
      trustedDevices: { activeCount: 0 },
      sessions: { activeCount: 0 },
      overallStatus: "ok",
    };
  }

  // --- MFA enrollment ---
  const { data: enrollments } = await client
    .from("mfa_enrollments" as any)
    .select("id, enabled, verified")
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  const enrollmentList = (enrollments ?? []) as any[];
  const hasEnrollment = enrollmentList.length > 0;
  const mfaEnabled = enrollmentList.some((e) => e.verified && e.enabled);

  // --- MFA lockout ---
  const lockoutStatus = await isMfaLockedOut(targetUserId);

  // --- Recovery codes ---
  const activeCount = await getRecoveryCodeCount(targetUserId);

  // --- Trusted devices ---
  const { count: trustedDevicesCount } = await client
    .from("trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo");

  // --- Active sessions ---
  const { count: sessionsCount } = await client
    .from("active_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  // --- Overall status ---
  const issues: string[] = [];

  if (lockoutStatus.locked) {
    issues.push("mfa_locked");
  }

  if (!mfaEnabled) {
    issues.push("mfa_not_configured");
  }

  if (activeCount === 0) {
    issues.push("no_recovery_codes");
  }

  let overallStatus: AdminRecoveryStatus["overallStatus"] = "ok";

  if (issues.length > 1) {
    overallStatus = "multiple_issues";
  } else if (issues.length === 1) {
    overallStatus = issues[0] as AdminRecoveryStatus["overallStatus"];
  }

  return {
    mfa: {
      hasEnrollment,
      enabled: mfaEnabled,
      lockedOut: lockoutStatus.locked,
      lockoutExpiresAt: lockoutStatus.expiresAt,
    },
    recoveryCodes: { activeCount },
    trustedDevices: { activeCount: trustedDevicesCount ?? 0 },
    sessions: { activeCount: sessionsCount ?? 0 },
    overallStatus,
  };
}

/**
 * Desbloqueio leve de MFA — apenas limpa o lockout sem desabilitar MFA,
 * sem revogar códigos de recuperação ou dispositivos confiáveis.
 * Registra evento de auditoria.
 */
export async function adminUnlockMfaOnly(
  targetUserId: string,
  lawFirmId: string,
  adminUserId: string,
  justification: string
): Promise<{ success: boolean; error?: string; timestamp?: string }> {
  if (!isValidJustification(justification)) {
    return {
      success: false,
      error: "Justificativa é obrigatória e deve ter pelo menos 10 caracteres.",
    };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return { success: false, error: "Serviço indisponível." };
  }

  try {
    await resetMfaLockout(targetUserId);

    const now = new Date().toISOString();

    await logRecoveryAuditEvent(client, {
      adminUserId,
      targetUserId,
      lawFirmId,
      action: "admin_unlock_mfa_only",
      justification,
      metadata: { lockoutCleared: true },
    });

    return { success: true, timestamp: now };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao desbloquear MFA.",
    };
  }
}

/**
 * Gera novos códigos de recuperação para um usuário.
 * Retorna os códigos em texto plano (para serem exibidos ao admin ou
 * enviados por canal seguro). Registra evento de auditoria.
 */
export async function adminGenerateRecoveryCodes(
  targetUserId: string,
  lawFirmId: string,
  adminUserId: string,
  justification: string
): Promise<{ success: boolean; codes?: string[]; error?: string; timestamp?: string }> {
  if (!isValidJustification(justification)) {
    return {
      success: false,
      error: "Justificativa é obrigatória e deve ter pelo menos 10 caracteres.",
    };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return { success: false, error: "Serviço indisponível." };
  }

  try {
    const codes = await generateRecoveryCodes(targetUserId, lawFirmId);

    const now = new Date().toISOString();

    await logRecoveryAuditEvent(client, {
      adminUserId,
      targetUserId,
      lawFirmId,
      action: "admin_generate_recovery_codes",
      justification,
      metadata: { codesGenerated: codes.length },
    });

    return { success: true, codes, timestamp: now };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao gerar códigos de recuperação.",
    };
  }
}

/**
 * Força o sign-out de um usuário invalidando todas as sessões ativas.
 * Remove todos os registros de `active_sessions` e opcionalmente
 * revoga todos os refresh tokens via Supabase Admin API.
 * Registra evento de auditoria.
 */
export async function adminForceSignOut(
  targetUserId: string,
  lawFirmId: string,
  adminUserId: string,
  justification: string
): Promise<{ success: boolean; sessionsRevoked?: number; error?: string; timestamp?: string }> {
  if (!isValidJustification(justification)) {
    return {
      success: false,
      error: "Justificativa é obrigatória e deve ter pelo menos 10 caracteres.",
    };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return { success: false, error: "Serviço indisponível." };
  }

  try {
    // Conta sessões ativas antes de revogar
    const { count: sessionsCount } = await client
      .from("active_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("law_firm_id", lawFirmId);

    // Remove todas as sessões ativas
    await client
      .from("active_sessions")
      .delete()
      .eq("user_id", targetUserId)
      .eq("law_firm_id", lawFirmId);

    // Revoga todos os refresh tokens via Supabase Admin API
    try {
      await (client as unknown as AdminAuthClient).auth.admin.signOut(targetUserId, "global" as any);
    } catch {
      // signOut do Supabase Auth Admin pode não estar disponível em todas as versões;
      // tratamos como best-effort.
    }

    const now = new Date().toISOString();

    await logRecoveryAuditEvent(client, {
      adminUserId,
      targetUserId,
      lawFirmId,
      action: "admin_force_sign_out",
      justification,
      metadata: { sessionsRevoked: sessionsCount ?? 0 },
    });

    return {
      success: true,
      sessionsRevoked: sessionsCount ?? 0,
      timestamp: now,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao forçar sign-out.",
    };
  }
}

/**
 * Força o reset de senha de um usuário.
 * Utiliza a Supabase Admin API para gerar um link de redefinição de senha.
 * A senha temporária NUNCA é armazenada em texto plano.
 * Registra evento de auditoria.
 */
export async function adminResetPassword(
  targetUserId: string,
  lawFirmId: string,
  adminUserId: string,
  justification: string
): Promise<{
  success: boolean;
  resetLink?: string;
  email?: string;
  error?: string;
  timestamp?: string;
}> {
  if (!isValidJustification(justification)) {
    return {
      success: false,
      error: "Justificativa é obrigatória e deve ter pelo menos 10 caracteres.",
    };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return { success: false, error: "Serviço indisponível." };
  }

  try {
    // Obtém dados do usuário para gerar o link de reset
    const { data: userData, error: userError } = await (client as unknown as AdminAuthClient).auth.admin.getUserById(
      targetUserId
    );

    if (userError || !userData?.user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const userEmail = userData.user.email;

    // Gera link de redefinição de senha via Supabase Auth Admin
    const { data: linkData, error: linkError } =
      await (client as unknown as AdminAuthClient).auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
        password: crypto.randomUUID(),
      });

    // Se generateLink não estiver disponível, usamos a abordagem alternativa
    let resetLink: string | undefined;

    if (!linkError && linkData?.properties?.action_link) {
      resetLink = linkData.properties.action_link;
    } else {
      // Fallback: usa updateUser para forçar reset
      const tempPassword = crypto.randomUUID();
      const { error: updateError } = await (client as unknown as AdminAuthClient).auth.admin.updateUserById(
        targetUserId,
        { password: tempPassword }
      );

      if (updateError) {
        return {
          success: false,
          error: "Não foi possível gerar link de redefinição de senha.",
        };
      }

      // O usuário precisará usar "Esqueci minha senha" para definir nova senha
      resetLink = null as unknown as string;
    }

    const now = new Date().toISOString();

    await logRecoveryAuditEvent(client, {
      adminUserId,
      targetUserId,
      lawFirmId,
      action: "admin_reset_password",
      justification,
      metadata: { email: userEmail },
    });

    return {
      success: true,
      resetLink: resetLink ?? undefined,
      email: userEmail,
      timestamp: now,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao resetar senha.",
    };
  }
}

/**
 * Retorna histórico recente de ações de recuperação administrativa
 * realizadas sobre um usuário específico.
 */
export async function getAdminRecoveryHistory(
  targetUserId: string,
  lawFirmId: string,
  limit: number = 50
): Promise<AdminRecoveryAction[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const { data } = await client
    .from("admin_audit_logs" as any)
    .select("*")
    .eq("entity_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const recoveryActions = [
    "admin_unlock_mfa_only",
    "admin_generate_recovery_codes",
    "admin_force_sign_out",
    "admin_reset_password",
    "mfa_reset",
  ];

  return (data ?? [])
    .filter((row: any) => recoveryActions.includes(row.action))
    .filter((row: any) => {
      const details = row.details as Record<string, unknown> | null;
      return details?.law_firm_id === lawFirmId;
    })
    .map((row: any) => {
      const details = (row.details as Record<string, unknown>) ?? {};
      return {
        action: row.action,
        targetUserId: row.entity_id,
        adminUserId: row.admin_user_id,
        justification: (details.justification as string) ?? "",
        timestamp: row.created_at,
        metadata: {
          law_firm_id: details.law_firm_id,
          ...details,
        },
      };
    });
}
