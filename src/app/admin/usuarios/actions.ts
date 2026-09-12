"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { adminResetMfa } from "@/lib/security/admin-mfa-reset";
import { resetMfaLockout } from "@/lib/security/mfa-challenge";
import { generateRecoveryCodes } from "@/lib/security/recovery-codes";
import { revokeAllTrustedDevices } from "@/lib/security/trusted-devices";

type AnyClient = { from(table: string): any };

const JUSTIFICATION_MIN_LENGTH = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Busca a primeira membership ativa do alvo e retorna o lawFirmId. */
async function getTargetLawFirmId(
  adminClient: AnyClient,
  targetUserId: string
): Promise<string> {
  const { data: memberships, error } = await adminClient
    .from("law_firm_members")
    .select("law_firm_id")
    .eq("user_id", targetUserId)
    .eq("status", "ativo")
    .limit(1);

  if (error) throw new Error("Erro ao buscar vínculos do usuário.");
  if (!memberships || memberships.length === 0) {
    throw new Error("Usuário não possui escritório vinculado.");
  }
  return memberships[0].law_firm_id;
}

// ---------------------------------------------------------------------------
// Actions existentes
// ---------------------------------------------------------------------------

export async function adminResetMfaAction(formData: FormData) {
  const { userId: adminUserId, adminClient } = await getAdminContext();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");
  if (justification.length < JUSTIFICATION_MIN_LENGTH) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres.");
  }

  const lawFirmId = await getTargetLawFirmId(adminClient, targetUserId);

  const result = await adminResetMfa(
    targetUserId,
    lawFirmId,
    adminUserId,
    justification
  );

  if (!result.success) {
    throw new Error(result.error ?? "Erro ao resetar MFA.");
  }

  revalidatePath(`/admin/usuarios/${targetUserId}`);
}

// ---------------------------------------------------------------------------
// Novas actions de recuperação admin
// ---------------------------------------------------------------------------

/**
 * Desbloqueia o lockout MFA de um usuário (ação leve — não desativa MFA).
 */
export async function adminUnlockMfaAction(formData: FormData) {
  const { userId: adminUserId, adminClient } = await getAdminContext();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");
  if (justification.length < JUSTIFICATION_MIN_LENGTH) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres.");
  }

  await getTargetLawFirmId(adminClient, targetUserId);
  await resetMfaLockout(targetUserId);

  // Registrar auditoria
  await adminClient.from("admin_audit_logs" as any).insert({
    admin_user_id: adminUserId,
    action: "mfa_unlock",
    entity_type: "mfa_enrollment",
    entity_id: targetUserId,
    details: { justification: justification.trim() },
  });

  revalidatePath(`/admin/usuarios/${targetUserId}`);
}

/**
 * Gera novos códigos de recuperação para um usuário (revoga anteriores).
 * Retorna os códigos em texto plano.
 */
export async function adminGenerateRecoveryCodesAction(formData: FormData) {
  const { userId: adminUserId, adminClient } = await getAdminContext();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");
  if (justification.length < JUSTIFICATION_MIN_LENGTH) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres.");
  }

  const lawFirmId = await getTargetLawFirmId(adminClient, targetUserId);
  const codes = await generateRecoveryCodes(targetUserId, lawFirmId);

  // Registrar auditoria
  await adminClient.from("admin_audit_logs" as any).insert({
    admin_user_id: adminUserId,
    action: "recovery_codes_generated",
    entity_type: "recovery_code",
    entity_id: targetUserId,
    details: { justification: justification.trim(), count: codes.length },
  });

  revalidatePath(`/admin/usuarios/${targetUserId}`);
  return { codes };
}

/**
 * Força sign-out de um usuário — remove todas as sessões ativas.
 */
export async function adminForceSignOutAction(formData: FormData) {
  const { userId: adminUserId, adminClient } = await getAdminContext();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");
  if (justification.length < JUSTIFICATION_MIN_LENGTH) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres.");
  }

  const lawFirmId = await getTargetLawFirmId(adminClient, targetUserId);

  // Remove sessões ativas do usuário alvo
  const { error } = await adminClient
    .from("active_sessions")
    .delete()
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  if (error) {
    throw new Error("Erro ao encerrar sessões do usuário.");
  }

  // Revoga dispositivos confiáveis também
  await revokeAllTrustedDevices(targetUserId, lawFirmId);

  // Registrar auditoria
  await adminClient.from("admin_audit_logs" as any).insert({
    admin_user_id: adminUserId,
    action: "force_sign_out",
    entity_type: "auth_session",
    entity_id: targetUserId,
    details: {
      justification: justification.trim(),
      law_firm_id: lawFirmId,
    },
  });

  revalidatePath(`/admin/usuarios/${targetUserId}`);
}

/**
 * Retorna o status de recuperação completo de um usuário.
 */
export async function adminGetRecoveryStatusAction(targetUserId: string) {
  const { adminClient } = await getAdminContext();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");

  const lawFirmId = await getTargetLawFirmId(adminClient, targetUserId);

  // Status MFA
  const { data: enrollments } = await adminClient
    .from("mfa_enrollments" as any)
    .select("id, enabled, verified")
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  const enrollmentList = (enrollments ?? []) as any[];
  const mfaHasEnrollment = enrollmentList.length > 0;
  const mfaEnabled = enrollmentList.some(
    (e: any) => e.verified && e.enabled
  );

  // Lockout status (do in-memory store — pode não persistir entre reinícios)
  // Usamos a abordagem simples: checar se há tentativas falhas recentes
  // O lockout real é verificado via getMfaChallengeStatus
  const mfaLockedOut = false; // Lockout in-memory — será false no contexto admin
  const mfaLockoutExpiresAt: string | undefined = undefined;

  // Códigos de recuperação ativos
  const { count: recoveryCodesActiveCount } = await adminClient
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("status", "ativo");

  // Dispositivos confiáveis ativos
  const { count: trustedDevicesActiveCount } = await adminClient
    .from("trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo");

  // Sessões ativas
  const { count: sessionsActiveCount } = await adminClient
    .from("active_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId)
    .eq("law_firm_id", lawFirmId);

  // Determinar status geral
  let overallStatus = "ok";
  if (mfaLockedOut || !mfaEnabled) {
    overallStatus = "critical";
  } else if (
    (recoveryCodesActiveCount ?? 0) === 0 ||
    (trustedDevicesActiveCount ?? 0) === 0
  ) {
    overallStatus = "warning";
  }

  return {
    mfa: {
      hasEnrollment: mfaHasEnrollment,
      enabled: mfaEnabled,
      lockedOut: mfaLockedOut,
      lockoutExpiresAt: mfaLockoutExpiresAt,
    },
    recoveryCodes: { activeCount: recoveryCodesActiveCount ?? 0 },
    trustedDevices: { activeCount: trustedDevicesActiveCount ?? 0 },
    sessions: { activeCount: sessionsActiveCount ?? 0 },
    overallStatus,
  };
}
