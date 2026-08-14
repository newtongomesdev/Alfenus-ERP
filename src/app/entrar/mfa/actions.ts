"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyMfaChallenge, isMfaLockedOut } from "@/lib/security/mfa-challenge";
import { validateRecoveryCode } from "@/lib/security/recovery-codes";
import {
  getPendingMfaState,
  clearPendingMfaState,
  type PendingMfaState,
} from "@/app/entrar/mfa/pending-state";
import { recordErrorEvent } from "@/lib/observability/error-events";

// ---------------------------------------------------------------------------
// Types de retorno
// ---------------------------------------------------------------------------

export type MfaVerifyResult = {
  success: boolean;
  error?: string;
  lockedOut?: boolean;
  lockoutExpiresAt?: string;
  attemptsRemaining?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getPendingStateOrThrow(): Promise<PendingMfaState> {
  const state = await getPendingMfaState();
  if (!state) {
    throw new Error("NO_PENDING_STATE");
  }
  return state;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Verifica o código TOTP de 6 dígitos durante o fluxo de login MFA.
 * Se válido: cria sessão ativa, registra auditoria, limpa estado pendente e redireciona ao dashboard.
 * Se inválido: retorna erro com tentativas restantes ou lockout.
 */
export async function verifyMfaLoginAction(
  code: string,
  _prevState: MfaVerifyResult | undefined,
  _formData: FormData
): Promise<MfaVerifyResult> {
  // Validar formato do código (6 dígitos numéricos)
  const cleanCode = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: "Código inválido. Insira os 6 dígitos do seu autenticador." };
  }

  let state: PendingMfaState;
  try {
    state = await getPendingStateOrThrow();
  } catch {
    return {
      success: false,
      error: "Sessão de verificação expirada. Faça login novamente.",
    };
  }

  // Verificar lockout antes de tentar
  const lockoutStatus = await isMfaLockedOut(state.user_id);
  if (lockoutStatus.locked) {
    return {
      success: false,
      lockedOut: true,
      lockoutExpiresAt: lockoutStatus.expiresAt,
      attemptsRemaining: 0,
      error: "Conta temporariamente bloqueada por excesso de tentativas.",
    };
  }

  // Verificar TOTP
  const result = await verifyMfaChallenge(state.user_id, cleanCode);

  if (result.lockedOut) {
    return {
      success: false,
      lockedOut: true,
      lockoutExpiresAt: undefined, // O verifyMfaChallenge já setou internamente
      attemptsRemaining: 0,
      error: "Conta temporariamente bloqueada por excesso de tentativas. Aguarde 15 minutos.",
    };
  }

  if (!result.success) {
    const attemptsLeft = result.attemptsRemaining ?? 0;
    return {
      success: false,
      attemptsRemaining: attemptsLeft,
      error: attemptsLeft <= 2
        ? `Código incorreto. Você tem ${attemptsLeft} tentativa(s) restante(s) antes do bloqueio.`
        : "Código incorreto. Tente novamente.",
    };
  }

  // Sucesso: criar sessão ativa e auditoria
  await finalizeSession(state);

  // Limpar estado pendente
  await clearPendingMfaState();

  redirect("/dashboard");
}

/**
 * Verifica um código de recuperação durante o fluxo de login MFA.
 * Se válido: cria sessão ativa, limpa estado pendente e redireciona ao dashboard.
 * Se inválido: retorna erro genérico.
 */
export async function verifyRecoveryCodeLoginAction(
  code: string,
  _prevState: MfaVerifyResult | undefined,
  _formData: FormData
): Promise<MfaVerifyResult> {
  const cleanCode = code.replace(/\s/g, "").toUpperCase();
  if (cleanCode.length < 4) {
    return { success: false, error: "Código de recuperação inválido." };
  }

  let state: PendingMfaState;
  try {
    state = await getPendingStateOrThrow();
  } catch {
    return {
      success: false,
      error: "Sessão de verificação expirada. Faça login novamente.",
    };
  }

  // Verificar lockout
  const lockoutStatus = await isMfaLockedOut(state.user_id);
  if (lockoutStatus.locked) {
    return {
      success: false,
      lockedOut: true,
      lockoutExpiresAt: lockoutStatus.expiresAt,
      attemptsRemaining: 0,
      error: "Conta temporariamente bloqueada por excesso de tentativas.",
    };
  }

  // Validar código de recuperação
  const valid = await validateRecoveryCode(state.user_id, state.law_firm_id, cleanCode);

  if (!valid) {
    return {
      success: false,
      error: "Código de recuperação inválido ou já utilizado.",
    };
  }

  // Sucesso: criar sessão ativa e auditoria
  await finalizeSession(state);

  // Limpar estado pendente
  await clearPendingMfaState();

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Interno: criar sessão ativa + auditoria
// ---------------------------------------------------------------------------

async function finalizeSession(state: PendingMfaState): Promise<void> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return;

  try {
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0] ??
      headerStore.get("x-real-ip") ??
      "unknown";
    const ua = headerStore.get("user-agent") ?? "unknown";

    await (adminClient as any).from("active_sessions").insert({
      law_firm_id: state.law_firm_id,
      user_id: state.user_id,
      member_id: state.member_id,
      session_token: crypto.randomUUID(),
      ip_address: ip,
      user_agent: ua,
    });

    // Registrar auditoria de login com MFA
    await (adminClient as any).from("audit_logs").insert({
      law_firm_id: state.law_firm_id,
      actor_id: state.user_id,
      action: "sign_in_mfa",
      entity_type: "auth_session",
      entity_id: state.member_id,
      metadata: {
        ip,
        user_agent: ua,
        mfa_method: "totp",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    await recordErrorEvent({
      source: "server",
      message: "Erro ao criar sessão ativa após MFA",
      path: "/entrar/mfa",
      method: "POST",
      routePath: "/entrar/mfa",
      metadata: {
        kind: "mfa-session-creation",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

/**
 * Verifica o status atual do lockout MFA para exibir na UI.
 */
export async function getMfaLockoutStatus(): Promise<{
  locked: boolean;
  expiresAt?: string;
}> {
  const state = await getPendingMfaState();
  if (!state) return { locked: false };

  const status = await isMfaLockedOut(state.user_id);
  return {
    locked: status.locked,
    expiresAt: status.expiresAt,
  };
}
