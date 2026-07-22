/**
 * Serviço de reset de MFA por administrador.
 * Permite que um admin desative o MFA de outro membro da mesma escritoria,
 * revogando códigos de recuperação, dispositivos confiáveis e limpando lockouts.
 * Todas as operações são registradas na trilha de auditoria.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { can, type Role } from "@/lib/auth/permissions";
import { revokeAllRecoveryCodes } from "@/lib/security/recovery-codes";
import { revokeAllTrustedDevices } from "@/lib/security/trusted-devices";
import { resetMfaLockout } from "@/lib/security/mfa-challenge";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminMfaResetResult = {
  success: boolean;
  error?: string;
  resetAt?: string;
  affectedUserId: string;
  actions: string[];
};

export type AdminMfaResetAuditEntry = {
  adminUserId: string;
  targetUserId: string;
  lawFirmId: string;
  justification: string;
  actionsPerformed: string[];
  timestamp: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JUSTIFICATION_MIN_LENGTH = 10;

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Valida se o admin pode resetar o MFA de outro membro.
 * - Admin não pode resetar o próprio MFA via admin
 * - Alvo deve estar na mesma escritoria
 * - Admin deve ter a permissão security.mfa.reset_user
 */
export async function canAdminResetMfa(
  adminUserId: string,
  targetUserId: string,
  lawFirmId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (adminUserId === targetUserId) {
    return { allowed: false, reason: "Não é possível resetar o próprio MFA via admin." };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return { allowed: false, reason: "Serviço indisponível." };
  }

  // Verifica que o alvo pertence à mesma escritoria
  const { data: targetMember } = await client
    .from("law_firm_members")
    .select("id, user_id, law_firm_id")
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo")
    .maybeSingle();

  if (!targetMember) {
    return { allowed: false, reason: "Usuário alvo não encontrado na escritoria." };
  }

  // Verifica que o admin também pertence à mesma escritoria e obtém seu role
  const { data: adminMember } = await client
    .from("law_firm_members")
    .select("id, user_id, role, law_firm_id")
    .eq("user_id", adminUserId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo")
    .maybeSingle();

  if (!adminMember) {
    return { allowed: false, reason: "Administrador não encontrado na escritoria." };
  }

  // Verifica permissão no nível de role
  if (!can((adminMember as any).role as Role, "security.mfa.reset_user")) {
    return { allowed: false, reason: "Sem permissão para resetar MFA de outros membros." };
  }

  return { allowed: true };
}

/**
 * Retorna o status atual do MFA para um usuário específico.
 */
export async function getMfaResetStatus(
  targetUserId: string,
  lawFirmId: string
): Promise<{
  hasEnrollment: boolean;
  enrollmentEnabled: boolean;
  activeRecoveryCodes: number;
  trustedDevices: number;
  lastUsedAt: string | null;
}> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return {
      hasEnrollment: false,
      enrollmentEnabled: false,
      activeRecoveryCodes: 0,
      trustedDevices: 0,
      lastUsedAt: null,
    };
  }

  // Busca enrollments MFA
  const { data: enrollments } = await client
    .from("mfa_enrollments" as any)
    .select("id, enabled, verified, last_used_at")
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  const enrollmentList = (enrollments ?? []) as any[];
  const hasEnrollment = enrollmentList.length > 0;
  const enrollmentEnabled = enrollmentList.some((e) => e.verified && e.enabled);

  // Último uso do MFA
  const lastUsedAt = enrollmentList
    .filter((e) => e.last_used_at)
    .sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime())[0]
    ?.last_used_at ?? null;

  // Códigos de recuperação ativos
  const { count: activeRecoveryCodes } = await client
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("status", "ativo");

  // Dispositivos confiáveis ativos
  const { count: trustedDevices } = await client
    .from("trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo");

  return {
    hasEnrollment,
    enrollmentEnabled,
    activeRecoveryCodes: activeRecoveryCodes ?? 0,
    trustedDevices: trustedDevices ?? 0,
    lastUsedAt,
  };
}

/**
 * Executa o reset completo do MFA de um usuário por um administrador.
 *
 * Ações realizadas:
 * 1. Desativa enrollments MFA ativos
 * 2. Revoga todos os códigos de recuperação
 * 3. Revoga todos os dispositivos confiáveis
 * 4. Limpa o lockout do MFA
 * 5. Registra evento de auditoria
 */
export async function adminResetMfa(
  targetUserId: string,
  lawFirmId: string,
  adminUserId: string,
  justification: string
): Promise<AdminMfaResetResult> {
  // Validação: admin não pode resetar o próprio MFA
  if (adminUserId === targetUserId) {
    return {
      success: false,
      error: "Não é possível resetar o próprio MFA via admin.",
      affectedUserId: targetUserId,
      actions: [],
    };
  }

  // Validação: justificativa obrigatória e mínima de 10 caracteres
  if (!justification || justification.trim().length < JUSTIFICATION_MIN_LENGTH) {
    return {
      success: false,
      error: "Justificativa é obrigatória e deve ter pelo menos 10 caracteres.",
      affectedUserId: targetUserId,
      actions: [],
    };
  }

  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return {
      success: false,
      error: "Serviço indisponível.",
      affectedUserId: targetUserId,
      actions: [],
    };
  }

  const actionsPerformed: string[] = [];
  const now = new Date().toISOString();

  try {
    // 1. Desativa enrollments MFA habilitados
    const { data: disabledEnrollments } = await client
      .from("mfa_enrollments" as any)
      .update({ enabled: false })
      .eq("user_id", targetUserId)
      .eq("law_firm_id", lawFirmId)
      .eq("enabled", true)
      .select("id");

    if (disabledEnrollments && disabledEnrollments.length > 0) {
      actionsPerformed.push("mfa_enrollments_disabled");
    }

    // 2. Revoga todos os códigos de recuperação
    await revokeAllRecoveryCodes(targetUserId, lawFirmId);
    actionsPerformed.push("recovery_codes_revoked");

    // 3. Revoga todos os dispositivos confiáveis
    await revokeAllTrustedDevices(targetUserId, lawFirmId, adminUserId);
    actionsPerformed.push("trusted_devices_revoked");

    // 4. Limpa o lockout do MFA
    await resetMfaLockout(targetUserId);
    actionsPerformed.push("mfa_lockout_reset");

    // 5. Registra evento de auditoria
    await client.from("admin_audit_logs" as any).insert({
      admin_user_id: adminUserId,
      action: "mfa_reset",
      entity_type: "mfa_enrollment",
      entity_id: targetUserId,
      details: {
        justification: justification.trim(),
        law_firm_id: lawFirmId,
        actions_performed: actionsPerformed,
      },
    });

    return {
      success: true,
      resetAt: now,
      affectedUserId: targetUserId,
      actions: actionsPerformed,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao resetar MFA.",
      affectedUserId: targetUserId,
      actions: actionsPerformed,
    };
  }
}
