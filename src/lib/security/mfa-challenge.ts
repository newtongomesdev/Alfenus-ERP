import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/security/totp";

// ---------------------------------------------------------------------------
// Constantes de rate limiting
// ---------------------------------------------------------------------------

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const ATTEMPT_WINDOW_MINUTES = 15;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MfaAttempt = {
  id: string;
  userId: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type MfaAttemptResult = {
  success: boolean;
  lockedOut?: boolean;
  attemptsRemaining?: number;
};

export type MfaChallengeStatus = {
  required: boolean;
  enrolled: boolean;
  enabled: boolean;
  lockedOut: boolean;
  lockoutExpiresAt?: string;
  attemptsUsed: number;
  maxAttempts: number;
};

// ---------------------------------------------------------------------------
// Armazenamento em memoria para tentativas (resetado ao reiniciar o servidor)
// ---------------------------------------------------------------------------

const attemptStore = new Map<
  string,
  { attempts: MfaAttempt[]; lockoutExpiresAt?: Date }
>();

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function getAttempts(userId: string): MfaAttempt[] {
  return attemptStore.get(userId)?.attempts ?? [];
}

function getLockoutExpires(userId: string): Date | undefined {
  return attemptStore.get(userId)?.lockoutExpiresAt;
}

function countRecentFailures(userId: string): number {
  const now = Date.now();
  const windowMs = ATTEMPT_WINDOW_MINUTES * 60 * 1000;
  return getAttempts(userId).filter(
    (a) =>
      !a.success &&
      new Date(a.createdAt).getTime() > now - windowMs
  ).length;
}

// ---------------------------------------------------------------------------
// Funcoes publicas
// ---------------------------------------------------------------------------

/**
 * Verifica um desafio MFA TOTP durante o fluxo de login.
 * Em caso de sucesso: atualiza last_used_at e registra evento de auditoria.
 * Em caso de falha: incrementa contador, verifica lockout e retorna estado.
 */
export async function verifyMfaChallenge(
  userId: string,
  token: string
): Promise<MfaAttemptResult> {
  const lockoutStatus = await isMfaLockedOut(userId);
  if (lockoutStatus.locked) {
    return { success: false, lockedOut: true, attemptsRemaining: 0 };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { success: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Busca a enrollment MFA habilitada do usuario
  const { data: enrollment, error: enrollmentError } = await admin
    .from("mfa_enrollments" as any)
    .select("id, secret, verified, enabled")
    .eq("user_id", userId)
    .eq("enabled", true)
    .eq("verified", true)
    .limit(1)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    return { success: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Verifica o token TOTP
  const valid = await verifyToken((enrollment as any).secret, token);

  if (valid) {
    // Atualiza last_used_at
    await admin
      .from("mfa_enrollments" as any)
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", (enrollment as any).id);

    // Registra tentativa bem-sucedida
    await recordMfaAttempt(userId, true);

    // Limpa tentativas anteriores e lockout em caso de sucesso
    attemptStore.delete(userId);

    // Registra evento de auditoria
    await admin.from("admin_audit_logs" as any).insert({
      admin_user_id: userId,
      admin_email: null,
      action: "mfa_challenge_success",
      entity_type: "mfa_enrollment",
      entity_id: (enrollment as any).id,
      entity_name: null,
      details: {},
      ip_address: null,
    });

    return { success: true };
  }

  // Falha — registra tentativa e verifica lockout
  await recordMfaAttempt(userId, false);
  const failures = countRecentFailures(userId);

  const attemptsRemaining = MAX_ATTEMPTS - failures;

  if (failures >= MAX_ATTEMPTS) {
    const lockoutExpiresAt = new Date(
      Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
    );
    const current = attemptStore.get(userId) ?? { attempts: [] };
    attemptStore.set(userId, {
      ...current,
      lockoutExpiresAt,
    });

    return { success: false, lockedOut: true, attemptsRemaining: 0 };
  }

  return { success: false, attemptsRemaining };
}

/**
 * Retorna o status atual do desafio MFA para um usuario.
 */
export async function getMfaChallengeStatus(
  userId: string
): Promise<MfaChallengeStatus> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      required: false,
      enrolled: false,
      enabled: false,
      lockedOut: false,
      attemptsUsed: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  // Verifica se o usuario tem enrollment MFA
  const { data: enrollments } = await admin
    .from("mfa_enrollments" as any)
    .select("id, verified, enabled")
    .eq("user_id", userId);

  const enrolledList = (enrollments ?? []) as any[];
  const enrolled = enrolledList.length > 0;
  const enabled = enrolledList.some((e) => e.verified && e.enabled);

  // Verifica politica de seguranca (via membro)
  const { data: member } = await admin
    .from("law_firm_members" as any)
    .select("law_firm_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let required = false;
  if (member) {
    const { data: policy } = await admin
      .from("security_policies" as any)
      .select("mfa_required")
      .eq("law_firm_id", (member as any).law_firm_id)
      .maybeSingle();
    required = (policy as any)?.mfa_required ?? false;
  }

  // Verifica lockout
  const lockoutStatus = await isMfaLockedOut(userId);
  const failures = countRecentFailures(userId);

  return {
    required,
    enrolled,
    enabled,
    lockedOut: lockoutStatus.locked,
    lockoutExpiresAt: lockoutStatus.expiresAt,
    attemptsUsed: failures,
    maxAttempts: MAX_ATTEMPTS,
  };
}

/**
 * Registra uma tentativa de MFA (sucesso ou falha).
 * Armazena em memoria com metadados de IP e user agent.
 */
export async function recordMfaAttempt(
  userId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const attempt: MfaAttempt = {
    id: crypto.randomUUID(),
    userId,
    success,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    createdAt: new Date().toISOString(),
  };

  const current = attemptStore.get(userId) ?? { attempts: [] };
  current.attempts.push(attempt);

  // Limpa tentativas antigas fora da janela
  const windowMs = ATTEMPT_WINDOW_MINUTES * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  current.attempts = current.attempts.filter(
    (a) => new Date(a.createdAt).getTime() > cutoff
  );

  attemptStore.set(userId, current);
}

/**
 * Verifica se o usuario esta bloqueado por exceder max tentativas falhas.
 */
export async function isMfaLockedOut(
  userId: string
): Promise<{ locked: boolean; expiresAt?: string }> {
  const store = attemptStore.get(userId);
  if (!store?.lockoutExpiresAt) {
    return { locked: false };
  }

  const now = new Date();
  if (now >= store.lockoutExpiresAt) {
    // Lockout expirado — limpa
    delete store.lockoutExpiresAt;
    attemptStore.set(userId, store);
    return { locked: false };
  }

  return {
    locked: true,
    expiresAt: store.lockoutExpiresAt.toISOString(),
  };
}

/**
 * Limpa o lockout de um usuario (usado apos reset admin ou login bem-sucedido).
 */
export async function resetMfaLockout(userId: string): Promise<void> {
  const store = attemptStore.get(userId);
  if (store) {
    delete store.lockoutExpiresAt;
    store.attempts = [];
    attemptStore.set(userId, store);
  }
}

/**
 * Limpa todo o armazenamento de tentativas (utilizado em testes).
 */
export function clearAttemptStore(): void {
  attemptStore.clear();
}

/**
 * Simula um estado de lockout para um usuário (utilizado em testes).
 * Define lockoutExpiresAt diretamente no armazenamento.
 */
export function simulateLockout(userId: string, expiresAt: Date): void {
  const current = attemptStore.get(userId) ?? { attempts: [] };
  current.lockoutExpiresAt = expiresAt;
  attemptStore.set(userId, current);
}
