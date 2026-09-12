import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DEFAULT_MAX_AGE_MINUTES = 5;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ReauthenticationStatus = {
  authenticated: boolean;
  authenticatedAt?: string;
  expiresAt?: string;
};

// ---------------------------------------------------------------------------
// Armazenamento em memoria (server-side session state)
// ---------------------------------------------------------------------------

const reauthStore = new Map<
  string,
  { authenticatedAt: Date; expiresAt: Date }
>();

// ---------------------------------------------------------------------------
// Funcoes publicas
// ---------------------------------------------------------------------------

/**
 * Verifica a reautenticacao do usuario validando a senha via Supabase Auth.
 * Em caso de sucesso, registra o timestamp de reautenticacao em memoria.
 * Nunca armazena a senha em texto plano.
 */
export async function verifyReauthentication(
  userId: string,
  password: string
): Promise<{ success: boolean }> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { success: false };
  }

  // Busca o email do usuario para validar via signInWithPassword
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);

  if (userError || !userData?.user?.email) {
    return { success: false };
  }

  // Valida credenciais via Supabase Auth — nao armazena a senha
  const { error: signInError } = await admin.auth.signInWithPassword({
    email: userData.user.email,
    password,
  });

  if (signInError) {
    return { success: false };
  }

  // Registra o momento da reautenticacao
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + DEFAULT_MAX_AGE_MINUTES * 60 * 1000
  );

  reauthStore.set(userId, { authenticatedAt: now, expiresAt });

  return { success: true };
}

/**
 * Verifica se o usuario reautenticou recentemente dentro da janela permitida.
 * Usado para permitir acoes sensiveis sem forcar re-login completo.
 */
export async function isReauthenticationFresh(
  userId: string,
  maxAgeMinutes: number = DEFAULT_MAX_AGE_MINUTES
): Promise<boolean> {
  const entry = reauthStore.get(userId);
  if (!entry) return false;

  const now = new Date();

  // Verifica se nao expirou
  if (now >= entry.expiresAt) {
    reauthStore.delete(userId);
    return false;
  }

  // Verifica se esta dentro do maxAge personalizado
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  if (now.getTime() - entry.authenticatedAt.getTime() > maxAgeMs) {
    reauthStore.delete(userId);
    return false;
  }

  return true;
}

/**
 * Retorna o status atual da reautenticacao do usuario.
 */
export async function getReauthenticationStatus(
  userId: string
): Promise<ReauthenticationStatus> {
  const entry = reauthStore.get(userId);
  if (!entry) {
    return { authenticated: false };
  }

  const now = new Date();
  if (now >= entry.expiresAt) {
    reauthStore.delete(userId);
    return { authenticated: false };
  }

  return {
    authenticated: true,
    authenticatedAt: entry.authenticatedAt.toISOString(),
    expiresAt: entry.expiresAt.toISOString(),
  };
}

/**
 * Limpa o registro de reautenticacao do usuario (usado ao fazer sign out).
 */
export async function clearReauthentication(userId: string): Promise<void> {
  reauthStore.delete(userId);
}
