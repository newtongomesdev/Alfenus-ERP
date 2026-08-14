import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requestStepUp,
  validateStepUp,
  consumeStepUpAuthorization,
  revokeStepUpAuthorizations,
  getActiveStepUps,
} from "../step-up";

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const qb: Record<string, any> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "maybeSingle",
    "single",
    "order",
    "limit",
    "update",
    "insert",
    "gt",
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
// requestStepUp
// ---------------------------------------------------------------------------
describe("requestStepUp", () => {
  it("cria autorização step-up com campos corretos", async () => {
    // Primeira chamada: busca existente (nenhuma encontrada)
    const selectQb = createMockQueryBuilder(null);
    // Segunda chamada: insert + select + single
    const insertQb = createMockQueryBuilder({ expires_at: "2025-01-01T00:05:00.000Z" });
    // Terceira chamada: audit log
    const auditQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(auditQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requestStepUp(
      "user-1",
      "firm-1",
      "session-1",
      "financial",
      "totp",
      "192.168.1.1"
    );

    expect(result.granted).toBe(true);
    // expiresAt é calculado internamente com new Date() + 5min
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const diff = Math.abs(new Date(result.expiresAt).getTime() - Date.now());
    expect(diff).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);

    // Verifica que select foi chamado para buscar existente
    expect(selectQb.select).toHaveBeenCalledWith("id, expires_at");
    expect(selectQb.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(selectQb.eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(selectQb.eq).toHaveBeenCalledWith("action_type", "financial");
    expect(selectQb.eq).toHaveBeenCalledWith("consumed", false);
    expect(selectQb.gt).toHaveBeenCalled();
    expect(selectQb.maybeSingle).toHaveBeenCalled();

    // Verifica que insert foi chamado com os campos corretos
    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        law_firm_id: "firm-1",
        session_id: "session-1",
        action_type: "financial",
        auth_method: "totp",
        ip_address: "192.168.1.1",
        consumed: false,
      })
    );

    // Verifica que audit log foi inserido
    expect(auditQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "user-1",
        action: "step_up_granted",
        entity_type: "step_up_authorization",
      })
    );
  });

  it("retorna autorização existente se já houver uma válida", async () => {
    const existingExpiresAt = "2025-12-31T23:59:59.000Z";

    const selectQb = createMockQueryBuilder({
      id: "existing-auth",
      expires_at: existingExpiresAt,
    });
    const insertQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(selectQb)
      .mockReturnValue(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requestStepUp(
      "user-1",
      "firm-1",
      "session-1",
      "financial",
      "totp"
    );

    expect(result.granted).toBe(true);
    expect(result.expiresAt).toBe(existingExpiresAt);

    // Insert não deve ser chamado quando existe autorização válida
    expect(insertQb.insert).not.toHaveBeenCalled();
  });

  it("retorna granted=false quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await requestStepUp(
      "user-1",
      "firm-1",
      "session-1",
      "financial",
      "totp"
    );

    expect(result.granted).toBe(false);
    expect(result.expiresAt).toBe("");
  });
});

// ---------------------------------------------------------------------------
// validateStepUp
// ---------------------------------------------------------------------------
describe("validateStepUp", () => {
  it("retorna true para autorização válida e não consumida", async () => {
    const selectQb = createMockQueryBuilder({ id: "auth-1" });

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateStepUp("user-1", "session-1", "financial");

    expect(result.valid).toBe(true);
    expect(selectQb.select).toHaveBeenCalledWith("id");
    expect(selectQb.maybeSingle).toHaveBeenCalled();
  });

  it("retorna false quando não há autorização", async () => {
    const selectQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateStepUp("user-1", "session-1", "financial");

    expect(result.valid).toBe(false);
  });

  it("retorna false quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await validateStepUp("user-1", "session-1", "financial");

    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// consumeStepUpAuthorization
// ---------------------------------------------------------------------------
describe("consumeStepUpAuthorization", () => {
  it("marca autorização como consumida", async () => {
    const updateQb = createMockQueryBuilder({ id: "auth-1" });
    const auditQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(updateQb)
      .mockReturnValue(auditQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await consumeStepUpAuthorization(
      "user-1",
      "session-1",
      "financial"
    );

    expect(result.consumed).toBe(true);

    // Verifica que update marcou consumed como true
    expect(updateQb.update).toHaveBeenCalledWith({ consumed: true });
    expect(updateQb.select).toHaveBeenCalledWith("id");
    expect(updateQb.maybeSingle).toHaveBeenCalled();

    // Verifica que audit log foi inserido
    expect(auditQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "user-1",
        action: "step_up_consumed",
        entity_type: "step_up_authorization",
      })
    );
  });

  it("retorna false quando não há autorização válida", async () => {
    const updateQb = createMockQueryBuilder(null);
    const auditQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(updateQb)
      .mockReturnValue(auditQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await consumeStepUpAuthorization(
      "user-1",
      "session-1",
      "financial"
    );

    expect(result.consumed).toBe(false);

    // Audit log não deve ser inserido quando não há autorização
    expect(auditQb.insert).not.toHaveBeenCalled();
  });

  it("lança erro quando update falha", async () => {
    const dbError = new Error("Update failed");
    const updateQb = createMockQueryBuilder(null, dbError);

    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await expect(
      consumeStepUpAuthorization("user-1", "session-1", "financial")
    ).rejects.toThrow("Update failed");
  });
});

// ---------------------------------------------------------------------------
// revokeStepUpAuthorizations
// ---------------------------------------------------------------------------
describe("revokeStepUpAuthorizations", () => {
  it("revoga todas as autorizações ativas do usuário", async () => {
    const activeList = [
      { id: "auth-1" },
      { id: "auth-2" },
      { id: "auth-3" },
    ];

    const selectQb = createMockQueryBuilder(activeList);
    const updateQb = createMockQueryBuilder(null);
    const auditQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb)
      .mockReturnValue(auditQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeStepUpAuthorizations("user-1", "password_changed");

    // Verifica que update marcou todas como consumidas
    expect(updateQb.update).toHaveBeenCalledWith({ consumed: true });

    // Verifica que audit log foi inserido com a contagem correta
    expect(auditQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "user-1",
        action: "step_up_revoked_all",
        entity_type: "step_up_authorization",
        entity_id: "user-1",
        details: {
          reason: "password_changed",
          count: 3,
        },
      })
    );
  });

  it("não faz nada quando não há autorizações ativas", async () => {
    const selectQb = createMockQueryBuilder([]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeStepUpAuthorizations("user-1");

    // Apenas a primeira chamada (select) deve ocorrer; update e audit não
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(selectQb.select).toHaveBeenCalled();
  });

  it("não faz nada quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    // Não deve lançar erro
    await revokeStepUpAuthorizations("user-1");
  });
});

// ---------------------------------------------------------------------------
// getActiveStepUps
// ---------------------------------------------------------------------------
describe("getActiveStepUps", () => {
  it("retorna lista de autorizações ativas", async () => {
    const activeAuths = [
      {
        id: "auth-1",
        user_id: "user-1",
        law_firm_id: "firm-1",
        session_id: "session-1",
        action_type: "financial",
        auth_method: "totp",
        ip_address: "192.168.1.1",
        consumed: false,
        expires_at: "2025-12-31T23:59:59.000Z",
        created_at: "2025-12-31T23:54:59.000Z",
      },
      {
        id: "auth-2",
        user_id: "user-1",
        law_firm_id: "firm-1",
        session_id: "session-2",
        action_type: "export",
        auth_method: "sms",
        ip_address: null,
        consumed: false,
        expires_at: "2025-12-31T23:58:00.000Z",
        created_at: "2025-12-31T23:53:00.000Z",
      },
    ];

    const selectQb = createMockQueryBuilder(activeAuths);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getActiveStepUps("user-1");

    expect(result).toHaveLength(2);

    // Verifica mapeamento snake_case → camelCase
    expect(result[0]).toEqual({
      id: "auth-1",
      userId: "user-1",
      lawFirmId: "firm-1",
      sessionId: "session-1",
      actionType: "financial",
      authMethod: "totp",
      ipAddress: "192.168.1.1",
      consumed: false,
      expiresAt: "2025-12-31T23:59:59.000Z",
      createdAt: "2025-12-31T23:54:59.000Z",
    });

    expect(result[1]).toEqual({
      id: "auth-2",
      userId: "user-1",
      lawFirmId: "firm-1",
      sessionId: "session-2",
      actionType: "export",
      authMethod: "sms",
      ipAddress: null,
      consumed: false,
      expiresAt: "2025-12-31T23:58:00.000Z",
      createdAt: "2025-12-31T23:53:00.000Z",
    });

    // Verifica que select e order foram chamados
    expect(selectQb.select).toHaveBeenCalledWith("*");
    expect(selectQb.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("retorna array vazio quando não há autorizações", async () => {
    const selectQb = createMockQueryBuilder([]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getActiveStepUps("user-1");

    expect(result).toEqual([]);
  });

  it("retorna array vazio quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await getActiveStepUps("user-1");

    expect(result).toEqual([]);
  });
});
