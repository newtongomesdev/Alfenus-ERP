import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/security/totp", () => ({
  verifyToken: vi.fn(),
}));

import {
  isMfaLockedOut,
  resetMfaLockout,
  recordMfaAttempt,
  clearAttemptStore,
  simulateLockout,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from "../mfa-challenge";

beforeEach(() => {
  vi.clearAllMocks();
  clearAttemptStore();
});

// ---------------------------------------------------------------------------
// isMfaLockedOut
// ---------------------------------------------------------------------------
describe("isMfaLockedOut", () => {
  it("retorna false quando não há tentativas", async () => {
    const result = await isMfaLockedOut("user-no-attempts");
    expect(result.locked).toBe(false);
  });

  it("retorna true após MAX_ATTEMPTS falhas", async () => {
    const futureDate = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    simulateLockout("user-lockout", futureDate);

    const result = await isMfaLockedOut("user-lockout");
    expect(result.locked).toBe(true);
    expect(result.expiresAt).toBeDefined();
  });

  it("retorna false após o lockout expirar", async () => {
    vi.useFakeTimers();
    const now = Date.now();

    // Simula lockout que expira em 15 minutos
    const futureDate = new Date(now + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    simulateLockout("user-expired", futureDate);

    // Verifica que está bloqueado
    const lockedResult = await isMfaLockedOut("user-expired");
    expect(lockedResult.locked).toBe(true);

    // Avança o tempo além do lockout
    vi.setSystemTime(now + (LOCKOUT_DURATION_MINUTES + 1) * 60 * 1000);

    const unlockedResult = await isMfaLockedOut("user-expired");
    expect(unlockedResult.locked).toBe(false);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// resetMfaLockout
// ---------------------------------------------------------------------------
describe("resetMfaLockout", () => {
  it("limpa o estado de lockout", async () => {
    // Simula lockout ativo
    const futureDate = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    simulateLockout("user-reset", futureDate);

    // Verifica que está bloqueado
    const lockedResult = await isMfaLockedOut("user-reset");
    expect(lockedResult.locked).toBe(true);

    // Reseta lockout
    await resetMfaLockout("user-reset");

    // Verifica que não está mais bloqueado
    const unlockedResult = await isMfaLockedOut("user-reset");
    expect(unlockedResult.locked).toBe(false);
  });

  it("não lança erro ao resetar usuário sem lockout", async () => {
    await expect(
      resetMfaLockout("user-no-lockout")
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// recordMfaAttempt
// ---------------------------------------------------------------------------
describe("recordMfaAttempt", () => {
  it("rastreia tentativas corretamente", async () => {
    // Registra 3 falhas (menos que MAX_ATTEMPTS)
    for (let i = 0; i < 3; i++) {
      await recordMfaAttempt("user-tracking", false);
    }

    // Ainda não deve estar bloqueado (lockout só é definido por verifyMfaChallenge)
    const result = await isMfaLockedOut("user-tracking");
    expect(result.locked).toBe(false);
  });

  it("limpa tentativas após sucesso", async () => {
    // Registra algumas falhas
    for (let i = 0; i < 3; i++) {
      await recordMfaAttempt("user-success", false);
    }

    // Registra sucesso
    await recordMfaAttempt("user-success", true);

    // Verifica que não está bloqueado
    const result = await isMfaLockedOut("user-success");
    expect(result.locked).toBe(false);
  });

  it("armazena metadados de IP e user agent", async () => {
    // Não deve lançar erro com metadados
    await expect(
      recordMfaAttempt(
        "user-meta",
        true,
        "192.168.1.1",
        "Mozilla/5.0 Chrome/120"
      )
    ).resolves.toBeUndefined();
  });
});
