import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth/context", () => ({
  getAppContext: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateRecoveryCodes,
  hashCode,
  validateRecoveryCode,
  getRecoveryCodeCount,
  formatCodesForDisplay,
  generateCode,
} from "../recovery-codes";

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const qb: Record<string, any> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "in",
    "maybeSingle",
    "single",
    "order",
    "limit",
    "update",
    "insert",
  ];
  for (const method of methods) {
    qb[method] = vi.fn().mockReturnValue(qb);
  }
  qb.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
  ) => {
    resolve({ data, error });
  };
  return qb;
}

const mockFrom = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// hashCode
// ---------------------------------------------------------------------------
describe("hashCode", () => {
  it("produz hash SHA-256 consistente para o mesmo código", async () => {
    const hash1 = await hashCode("ABCD-1234");
    const hash2 = await hashCode("ABCD-1234");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produz hashes diferentes para códigos diferentes", async () => {
    const hash1 = await hashCode("AAAA-AAAA");
    const hash2 = await hashCode("BBBB-BBBB");
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// generateCode / generateRecoveryCodes
// ---------------------------------------------------------------------------
describe("generateRecoveryCodes", () => {
  it("gera a quantidade correta de códigos (padrão 10)", async () => {
    // Mock para revogar códigos anteriores (retorna vazio)
    const revokeQb = createMockQueryBuilder([]);
    // Mock para inserir códigos
    const insertQb = createMockQueryBuilder(
      Array.from({ length: 10 }, (_, i) => ({ id: `code-${i}` }))
    );
    // Mock para log de eventos (10 eventos)
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeQb)  // select para buscar códigos antigos
      .mockReturnValueOnce(insertQb)  // insert dos novos códigos
      .mockReturnValue(logQb);        // logs de eventos (múltiplas chamadas)

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const codes = await generateRecoveryCodes("user-1", "firm-1");
    expect(codes).toHaveLength(10);
  });

  it("gera a quantidade especificada de códigos", async () => {
    const revokeQb = createMockQueryBuilder([]);
    const insertQb = createMockQueryBuilder(
      Array.from({ length: 5 }, (_, i) => ({ id: `code-${i}` }))
    );
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const codes = await generateRecoveryCodes("user-1", "firm-1", 5);
    expect(codes).toHaveLength(5);
  });

  it("cada código tem formato XXXX-XXXX", async () => {
    const revokeQb = createMockQueryBuilder([]);
    const insertQb = createMockQueryBuilder(
      Array.from({ length: 5 }, (_, i) => ({ id: `code-${i}` }))
    );
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const codes = await generateRecoveryCodes("user-1", "firm-1", 5);
    for (const code of codes) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
  });

  it("revoga códigos ativos de lotes anteriores", async () => {
    const revokeSelectQb = createMockQueryBuilder([
      { id: "old-1", batch_id: "batch-old" },
    ]);
    const revokeUpdateQb = createMockQueryBuilder(null);
    const insertQb = createMockQueryBuilder([{ id: "new-1" }]);
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeSelectQb)
      .mockReturnValueOnce(revokeUpdateQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await generateRecoveryCodes("user-1", "firm-1", 1);

    // Verifica que o update foi chamado para revogar
    expect(revokeUpdateQb.update).toHaveBeenCalledWith({ status: "revogado" });
  });
});

// ---------------------------------------------------------------------------
// formatCodesForDisplay
// ---------------------------------------------------------------------------
describe("formatCodesForDisplay", () => {
  it("formata códigos corretamente (maiúsculos)", () => {
    const codes = ["abcd-1234", "efgh-5678"];
    const formatted = formatCodesForDisplay(codes);
    expect(formatted).toEqual(["ABCD-1234", "EFGH-5678"]);
  });

  it("retorna array vazio para input vazio", () => {
    expect(formatCodesForDisplay([])).toEqual([]);
  });

  it("mantém códigos já em maiúsculas", () => {
    const codes = ["ABCD-1234"];
    expect(formatCodesForDisplay(codes)).toEqual(["ABCD-1234"]);
  });
});

// ---------------------------------------------------------------------------
// validateRecoveryCode
// ---------------------------------------------------------------------------
describe("validateRecoveryCode", () => {
  it("retorna true para código válido e ativo", async () => {
    const codeHash = await hashCode("ABCD-1234");
    const queryQb = createMockQueryBuilder({
      id: "rec-1",
      user_id: "user-1",
    });
    const updateQb = createMockQueryBuilder(null);
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(queryQb)  // busca código
      .mockReturnValueOnce(updateQb) // atualiza status
      .mockReturnValue(logQb);       // log evento

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateRecoveryCode("user-1", "firm-1", "ABCD-1234");
    expect(result).toBe(true);
  });

  it("retorna false para código utilizado", async () => {
    const queryQb = createMockQueryBuilder(null); // maybeSingle retorna null

    mockFrom.mockReturnValueOnce(queryQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateRecoveryCode("user-1", "firm-1", "USED-CODE");
    expect(result).toBe(false);
  });

  it("retorna false para código inexistente", async () => {
    const queryQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(queryQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateRecoveryCode(
      "user-1",
      "firm-1",
      "XXXX-XXXX"
    );
    expect(result).toBe(false);
  });

  it("retorna false quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await validateRecoveryCode("user-1", "firm-1", "ABCD-1234");
    expect(result).toBe(false);
  });

  it("normaliza código para maiúsculas antes de validar", async () => {
    const queryQb = createMockQueryBuilder({
      id: "rec-1",
      user_id: "user-1",
    });
    const updateQb = createMockQueryBuilder(null);
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(queryQb)
      .mockReturnValueOnce(updateQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    // Código em minúsculas deve funcionar
    const result = await validateRecoveryCode("user-1", "firm-1", "abcd-1234");
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRecoveryCodeCount
// ---------------------------------------------------------------------------
describe("getRecoveryCodeCount", () => {
  it("retorna a contagem correta de códigos ativos", async () => {
    // getRecoveryCodeCount desestrutura { count } do resultado da query
    const countQb = createMockQueryBuilder(null);
    countQb.then = (
      resolve: (value: { count: number }) => unknown,
    ) => {
      resolve({ count: 7 });
    };

    mockFrom.mockReturnValueOnce(countQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const count = await getRecoveryCodeCount("user-1");
    expect(count).toBe(7);
  });

  it("retorna 0 quando não há códigos ativos", async () => {
    const countQb = createMockQueryBuilder(null);
    countQb.then = (
      resolve: (value: { count: number }) => unknown,
    ) => {
      resolve({ count: 0 });
    };

    mockFrom.mockReturnValueOnce(countQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const count = await getRecoveryCodeCount("user-1");
    expect(count).toBe(0);
  });

  it("retorna 0 quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const count = await getRecoveryCodeCount("user-1");
    expect(count).toBe(0);
  });
});
