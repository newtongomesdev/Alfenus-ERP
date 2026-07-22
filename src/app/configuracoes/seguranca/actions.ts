"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { upsertSecurityPolicy } from "@/lib/security/policies";
import { terminateSession as terminateSessionQuery, terminateAllSessions } from "@/lib/security/sessions";
import { generateSecret, generateQRCodeUri, verifyToken } from "@/lib/security/totp";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  regenerateRecoveryCodes,
  getRecoveryCodeCount,
  validateRecoveryCode,
} from "@/lib/security/recovery-codes";
import {
  revokeTrustedDevice,
  revokeAllTrustedDevices,
} from "@/lib/security/trusted-devices";
import { isMfaRequired } from "@/lib/security/mfa-policies";
import {
  verifyReauthentication,
  getReauthenticationStatus,
} from "@/lib/security/reauthentication";

export async function saveSecurityPolicyAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  await upsertSecurityPolicy(context, {
    mfaRequired: formData.get("mfaRequired") === "on",
    mfaMinRole: String(formData.get("mfaMinRole") ?? "advogado"),
    passwordMinLength: Number(formData.get("passwordMinLength") ?? 8),
    passwordExpiryDays: Number(formData.get("passwordExpiryDays") ?? 0),
    passwordRequireUppercase: formData.get("passwordRequireUppercase") === "on",
    passwordRequireNumber: formData.get("passwordRequireNumber") === "on",
    passwordRequireSymbol: formData.get("passwordRequireSymbol") === "on",
    sessionTimeoutMinutes: Number(formData.get("sessionTimeoutMinutes") ?? 480),
    ipRestrictionEnabled: formData.get("ipRestrictionEnabled") === "on",
  });

  revalidatePath("/configuracoes/seguranca");
}

export async function terminateSessionAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("ID da sessao invalido");

  await terminateSessionQuery(context, sessionId);
  revalidatePath("/configuracoes/seguranca");
}

export async function terminateAllSessionsAction() {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  if (!context.member) throw new Error("Membro nao encontrado");
  await terminateAllSessions(context, context.member.userId);
  revalidatePath("/configuracoes/seguranca");
}

// ---------------------------------------------------------------------------
// MFA Enrollment
// ---------------------------------------------------------------------------

export async function startMfaEnrollmentAction(): Promise<{
  secret: string;
  qrUri: string;
  enrollmentId: string;
}> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  // Desabilitar enrollments TOTP anteriores nao verificados
  await supabase
    .from("mfa_enrollments")
    .delete()
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("factor_type", "totp")
    .eq("verified", false);

  const secret = generateSecret();
  const email = context.member.email;
  const qrUri = generateQRCodeUri(secret, email, context.lawFirm.name);

  const { data, error } = await supabase
    .from("mfa_enrollments")
    .insert({
      law_firm_id: context.lawFirm.id,
      user_id: context.member.userId,
      member_id: context.member.id,
      factor_type: "totp",
      secret,
      verified: false,
      enabled: false,
    })
    .select("id")
    .single();

  if (error) throw new Error("Erro ao criar enrollment MFA.");
  if (!data) throw new Error("Enrollment MFA nao criado.");

  return { secret, qrUri, enrollmentId: data.id };
}

export async function verifyMfaEnrollmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const token = String(formData.get("token") ?? "");
  if (!enrollmentId) throw new Error("ID do enrollment invalido");
  if (!token) throw new Error("Codigo de verificacao obrigatorio");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  const { data: enrollment, error: fetchError } = await supabase
    .from("mfa_enrollments")
    .select("id, secret, verified")
    .eq("id", enrollmentId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("factor_type", "totp")
    .single();

  if (fetchError || !enrollment) throw new Error("Enrollment nao encontrado.");
  if (enrollment.verified) throw new Error("Enrollment ja verificado.");
  if (!enrollment.secret) throw new Error("Secret do enrollment invalido.");

  const valid = await verifyToken(enrollment.secret, token);
  if (!valid) throw new Error("Codigo invalido. Verifique o aplicativo autenticador.");

  const { error: updateError } = await supabase
    .from("mfa_enrollments")
    .update({ verified: true, enabled: true })
    .eq("id", enrollment.id);

  if (updateError) throw new Error("Erro ao ativar MFA.");

  revalidatePath("/configuracoes/seguranca");
}

export async function disableMfaAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  if (!enrollmentId) throw new Error("ID do enrollment invalido");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  await supabase
    .from("mfa_enrollments")
    .update({ enabled: false })
    .eq("id", enrollmentId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId);

  revalidatePath("/configuracoes/seguranca");
}

// ---------------------------------------------------------------------------
// Recovery Codes
// ---------------------------------------------------------------------------

export async function regenerateRecoveryCodesAction(): Promise<{
  success: boolean;
  codes: string[];
}> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  if (!can(context.member.role, "security.mfa.manage_own")) {
    throw new Error("Permissao negada");
  }

  const codes = await regenerateRecoveryCodes(
    context.member.userId,
    context.lawFirm.id
  );

  revalidatePath("/configuracoes/seguranca");
  return { success: true, codes };
}

export async function getRecoveryCodeCountAction(): Promise<number> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");

  return getRecoveryCodeCount(context.member.userId);
}

// ---------------------------------------------------------------------------
// Trusted Devices
// ---------------------------------------------------------------------------

export async function revokeTrustedDeviceAction(formData: FormData): Promise<void> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");

  const deviceId = String(formData.get("device_id") ?? "");
  if (!deviceId) throw new Error("ID do dispositivo invalido");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  // Verificar propriedade do dispositivo
  const { data: device, error } = await supabase
    .from("trusted_devices")
    .select("user_id")
    .eq("id", deviceId)
    .maybeSingle();

  if (error || !device) throw new Error("Dispositivo nao encontrado.");
  if ((device as any).user_id !== context.member.userId) {
    throw new Error("Voce nao tem permissao para revogar este dispositivo.");
  }

  await revokeTrustedDevice(deviceId, context.member.userId, context.member.userId);
  revalidatePath("/configuracoes/seguranca");
}

export async function revokeAllTrustedDevicesAction(): Promise<void> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  await revokeAllTrustedDevices(
    context.member.userId,
    context.lawFirm.id,
    context.member.userId
  );

  revalidatePath("/configuracoes/seguranca");
}

// ---------------------------------------------------------------------------
// MFA Policy
// ---------------------------------------------------------------------------

export async function saveMfaPolicyAction(formData: FormData): Promise<void> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  if (
    context.member.role !== "proprietario" &&
    context.member.role !== "administrador"
  ) {
    throw new Error("Apenas proprietario e administrador podem configurar politicas MFA.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  const enforcementMode = String(formData.get("enforcement_mode") ?? "desabilitado");
  const requiredRolesRaw = formData.get("required_roles");
  const requiredRoles = requiredRolesRaw
    ? JSON.parse(String(requiredRolesRaw))
    : [];
  const gracePeriodDays = Number(formData.get("grace_period_days") ?? 0);
  const enforcementStartAt = formData.get("enforcement_start_at")
    ? String(formData.get("enforcement_start_at"))
    : null;
  const allowTrustedDevices = formData.get("allow_trusted_devices") !== "false";
  const trustedDeviceDurationDays = Number(
    formData.get("trusted_device_duration_days") ?? 30
  );
  const requireStepUp = formData.get("require_step_up") !== "false";

  const { error } = await supabase
    .from("security_policies")
    .upsert(
      {
        law_firm_id: context.lawFirm.id,
        enforcement_mode: enforcementMode,
        required_roles: requiredRoles,
        grace_period_days: gracePeriodDays,
        enforcement_start_at: enforcementStartAt,
        trusted_device_duration_days: trustedDeviceDurationDays,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "law_firm_id" }
    );

  if (error) throw new Error("Erro ao salvar politica MFA.");

  revalidatePath("/configuracoes/seguranca");
}

// ---------------------------------------------------------------------------
// Disable MFA with verification
// ---------------------------------------------------------------------------

export async function disableMfaWithVerificationAction(
  formData: FormData
): Promise<{ success: boolean }> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  if (!can(context.member.role, "security.mfa.manage_own")) {
    throw new Error("Permissao negada");
  }

  // Verificar se MFA e obrigatorio pela politica
  const mfaRequired = await isMfaRequired(
    context.member.userId,
    context.member.role,
    context.lawFirm.id
  );
  if (mfaRequired) {
    throw new Error(
      "Nao e possivel desabilitar MFA enquanto ele for obrigatorio pela politica do escritorio."
    );
  }

  const totpCode = String(formData.get("totp_code") ?? "");
  const recoveryCode = String(formData.get("recovery_code") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");

  if (!enrollmentId) throw new Error("ID do enrollment invalido");

  // Verificar via TOTP ou codigo de recuperacao
  let verified = false;

  if (totpCode) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) throw new Error("Servidor indisponivel");

    const { data: enrollment } = await supabase
      .from("mfa_enrollments")
      .select("secret")
      .eq("id", enrollmentId)
      .eq("user_id", context.member.userId)
      .single();

    if (enrollment?.secret) {
      verified = await verifyToken(enrollment.secret, totpCode);
    }
  } else if (recoveryCode) {
    verified = await validateRecoveryCode(
      context.member.userId,
      context.lawFirm.id,
      recoveryCode
    );
  }

  if (!verified) {
    throw new Error("Codigo de verificacao invalido.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  await supabase
    .from("mfa_enrollments")
    .update({ enabled: false })
    .eq("id", enrollmentId)
    .eq("user_id", context.member.userId);

  revalidatePath("/configuracoes/seguranca");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get Active MFA Enrollment ID
// ---------------------------------------------------------------------------

export async function getActiveEnrollmentIdAction(): Promise<string | null> {
  const context = await getAppContext();
  if (context.status !== "ready") return null;
  if (!context.member) return null;
  if (!context.lawFirm) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("mfa_enrollments")
    .select("id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("factor_type", "totp")
    .eq("enabled", true)
    .maybeSingle();

  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Reauthentication
// ---------------------------------------------------------------------------

export async function verifyReauthenticationAction(
  formData: FormData
): Promise<{ success: boolean; expiresAt: string }> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");

  const password = String(formData.get("password") ?? "");
  if (!password) throw new Error("Senha obrigatoria para reautenticacao.");

  const result = await verifyReauthentication(context.member.userId, password);
  if (!result.success) {
    throw new Error("Senha incorreta.");
  }

  // Buscar status para obter expiresAt
  const status = await getReauthenticationStatus(context.member.userId);

  return {
    success: true,
    expiresAt: status.expiresAt ?? new Date().toISOString(),
  };
}
