/**
 * Gerencia o estado "pendente MFA" armazenado em cookie assinado.
 *
 * Após credenciais válidas, o Supabase cria a sessão, mas o app
 * bloqueia acesso ao dashboard até que o desafio MFA seja resolvido.
 * O estado é serializado como JSON, assinado com HMAC-SHA-256 e
 * armazenado em cookie httpOnly, secure, sameSite=strict.
 */

import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingMfaState = {
  user_id: string;
  law_firm_id: string;
  member_id: string;
  role: string;
  created_at: number; // Date.now()
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = "__mfa_pending";
const MAX_AGE_SECONDS = 10 * 60; // 10 minutos

function getSigningKey(): Uint8Array {
  const secret = process.env.MFA_PENDING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("MFA pending secret não configurado.");
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getSigningKey().buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serializa o estado pendente e seta o cookie.
 */
export async function setPendingMfaState(state: PendingMfaState): Promise<void> {
  const payload = JSON.stringify(state);
  const signature = await sign(payload);
  const cookieValue = `${Buffer.from(payload).toString("base64url")}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/entrar/mfa",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Lê e valida o cookie de estado pendente.
 * Retorna null se ausente, expirado ou com assinatura inválida.
 */
export async function getPendingMfaState(): Promise<PendingMfaState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const b64Payload = raw.slice(0, dotIdx);
  const receivedSig = raw.slice(dotIdx + 1);

  let payload: string;
  try {
    payload = Buffer.from(b64Payload, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expectedSig = await sign(payload);
  if (receivedSig !== expectedSig) return null;

  let state: PendingMfaState;
  try {
    state = JSON.parse(payload);
  } catch {
    return null;
  }

  // Verifica TTL
  const elapsed = Date.now() - state.created_at;
  if (elapsed > MAX_AGE_SECONDS * 1000) return null;

  return state;
}

/**
 * Remove o cookie de estado pendente (após validação bem-sucedida ou cancelamento).
 */
export async function clearPendingMfaState(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/entrar/mfa",
    maxAge: 0,
  });
}
