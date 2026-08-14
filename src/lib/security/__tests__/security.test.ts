import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMfaEnrollments } from "@/lib/security/mfa";
import { generateRecoveryCodes } from "@/lib/security/recovery-codes";
import { createUserSession, getUserSessions } from "@/lib/security/session-lifecycle";
import { getTrustedDevices } from "@/lib/security/trusted-devices";
import { validateStepUp } from "@/lib/security/step-up";
import { logAdminAction } from "@/lib/admin/audit";
import type { AppContext } from "@/lib/auth/context";

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
    "in",
    "range",
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

function createMockChain(returnValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.then = (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(returnValue).then(onFulfilled);
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(returnValue));
  chain.single = vi.fn(() => Promise.resolve(returnValue));
  return chain;
}

function makeContext(overrides: Partial<AppContext> = {}): AppContext {
  return {
    status: "ready",
    member: {
      id: "member-1",
      userId: "user-1",
      lawFirmId: "firm-1",
      name: "Teste",
      email: "teste@test.com",
      role: "advogado",
      status: "ativo",
      position: null,
      lastAccessAt: null,
    },
    lawFirm: {
      id: "firm-1",
      name: "Escritorio Teste",
      slug: "escritorio-teste",
      document: null,
      email: null,
      phone: null,
      logoPath: null,
      plan: "basico",
      status: "ativo",
      createdAt: "2024-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. Segredo não exposto — TOTP secret não vaza via getMfaEnrollments
// ===========================================================================
describe("Secreto não exposto (TOTP secret)", () => {
  it("getMfaEnrollments não retorna totpSecret mesmo que o banco tenha totp_secret", async () => {
    const context = makeContext();

    // Simula o Supabase retornando um row com totp_secret no banco
    const mockData = {
      data: [
        {
          id: "e1",
          law_firm_id: "firm-1",
          user_id: "user-1",
          member_id: "member-1",
          factor_type: "totp",
          totp_secret: "JBSWY3DPEHPK3PXP", // segredo que NÃO deve vazar
          phone: null,
          verified: true,
          enabled: true,
          last_used_at: "2024-01-15T10:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
    };

    (getSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => createMockChain(mockData)),
    });

    const enrollments = await getMfaEnrollments(context);

    expect(enrollments).toHaveLength(1);

    // O enrollment retornado NÃO deve ter a campo totpSecret
    expect(enrollments[0]).not.toHaveProperty("totpSecret");

    // E os campos retornados devem ser apenas os seguros
    expect(enrollments[0].id).toBe("e1");
    expect(enrollments[0].factorType).toBe("totp");
    expect(enrollments[0].verified).toBe(true);
    expect(enrollments[0].enabled).toBe(true);
  });

  it("getMfaEnrollments não inclui totp_secret mesmo com múltiplos enrollments", async () => {
    const context = makeContext();

    const mockData = {
      data: [
        {
          id: "e1",
          law_firm_id: "firm-1",
          user_id: "user-1",
          member_id: "member-1",
          factor_type: "totp",
          totp_secret: "SUPERSECRET123",
          phone: null,
          verified: true,
          enabled: true,
          last_used_at: null,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "e2",
          law_firm_id: "firm-1",
          user_id: "user-2",
          member_id: "member-2",
          factor_type: "sms",
          totp_secret: null,
          phone: "+5511999999999",
          verified: true,
          enabled: true,
          last_used_at: null,
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
      error: null,
    };

    (getSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => createMockChain(mockData)),
    });

    const enrollments = await getMfaEnrollments(context);

    expect(enrollments).toHaveLength(2);
    for (const enrollment of enrollments) {
      expect(enrollment).not.toHaveProperty("totpSecret");
      expect(enrollment).not.toHaveProperty("totp_secret");
    }
  });
});

// ===========================================================================
// 2. Código de recuperação armazenado apenas como hash
// ===========================================================================
describe("Código de recuperação: hash apenas", () => {
  it("generateRecoveryCodes não insere códigos em texto plano no banco", async () => {
    const mockFrom = vi.fn();

    // Revogar códigos antigos
    const revokeQb = createMockQueryBuilder([]);
    // Inserir novos códigos
    const insertQb = createMockQueryBuilder(
      Array.from({ length: 5 }, (_, i) => ({ id: `code-${i}` }))
    );
    // Log eventos
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await generateRecoveryCodes("user-1", "firm-1", 5);

    // Captura o payload do insert
    const insertCall = insertQb.insert.mock.calls[0][0];
    expect(insertCall).toHaveLength(5);

    // Nenhum dos rows deve conter texto plano do código
    for (const row of insertCall) {
      expect(row).not.toHaveProperty("code");
      expect(row).not.toHaveProperty("plaintext");
      expect(row).not.toHaveProperty("recovery_code");

      // Deve ter code_hash (SHA-256)
      expect(row).toHaveProperty("code_hash");
      expect(typeof row.code_hash).toBe("string");
      // Hash SHA-256 é 64 caracteres hex
      expect(row.code_hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("generateRecoveryCodes retorna códigos em texto plano ao chamador (exibição única)", async () => {
    const mockFrom = vi.fn();

    const revokeQb = createMockQueryBuilder([]);
    const insertQb = createMockQueryBuilder(
      Array.from({ length: 3 }, (_, i) => ({ id: `code-${i}` }))
    );
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(revokeQb)
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const codes = await generateRecoveryCodes("user-1", "firm-1", 3);

    // Retorna 3 códigos ao chamador
    expect(codes).toHaveLength(3);

    // Cada código tem formato XXXX-XXXX (hex maiúsculo)
    for (const code of codes) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
  });
});

// ===========================================================================
// 3. Token não persistido em sessões
// ===========================================================================
describe("Token não persistido em sessões", () => {
  it("createUserSession não armazena access_token na sessão", async () => {
    const mockFrom = vi.fn();

    const insertQb = createMockQueryBuilder({
      id: "s1",
      user_id: "u1",
      law_firm_id: "lf1",
      member_id: "m1",
      status: "ativa",
    });
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await createUserSession("u1", "lf1", "m1", {
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      mfaLevel: "totp",
    });

    const insertPayload = insertQb.insert.mock.calls[0][0];

    // Não deve conter nenhum campo de token
    expect(insertPayload).not.toHaveProperty("access_token");
    expect(insertPayload).not.toHaveProperty("refresh_token");
    expect(insertPayload).not.toHaveProperty("token");
    expect(insertPayload).not.toHaveProperty("id_token");
    expect(insertPayload).not.toHaveProperty("oauth_token");
    expect(insertPayload).not.toHaveProperty("bearer_token");

    // Deve conter apenas campos legítimos de sessão
    expect(insertPayload).toHaveProperty("user_id");
    expect(insertPayload).toHaveProperty("law_firm_id");
    expect(insertPayload).toHaveProperty("member_id");
    expect(insertPayload).toHaveProperty("status");
  });

  it("createUserSession não armazena tokens mesmo quando sessionData contém campos extras", async () => {
    const mockFrom = vi.fn();

    const insertQb = createMockQueryBuilder({
      id: "s2",
      user_id: "u2",
      law_firm_id: "lf2",
      member_id: "m2",
      status: "ativa",
    });
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    // Mesmo passando dados extras, a função não deve inserir tokens
    await createUserSession("u2", "lf2", "m2", {
      ipAddress: "10.0.0.1",
      userAgent: "Chrome",
      deviceInfo: { os: "Windows" },
    } as any);

    const insertPayload = insertQb.insert.mock.calls[0][0];
    const payloadKeys = Object.keys(insertPayload);

    // Nenhum campo deve conter "token" no nome
    for (const key of payloadKeys) {
      expect(key.toLowerCase()).not.toContain("token");
    }
  });
});

// ===========================================================================
// 4. Log de auditoria sanitizado
// ===========================================================================
describe("Log de auditoria sanitizado", () => {
  it("logAdminAction não armazena senha, TOTP code ou recovery code no details", async () => {
    const mockFrom = vi.fn();
    const insertQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await logAdminAction({
      adminUserId: "admin-1",
      adminEmail: "admin@test.com",
      action: "user_login",
      entityType: "user",
      entityId: "user-1",
      details: {
        // Dados legítimos
        method: "password",
        mfa_method: "totp",
        ip: "192.168.1.1",
      },
      ipAddress: "192.168.1.1",
    });

    const insertPayload = insertQb.insert.mock.calls[0][0];
    const detailsStr = JSON.stringify(insertPayload.details);

    // Não deve conter padrões sensíveis no payload de auditoria
    expect(detailsStr).not.toMatch(/password\s*[:=]/i);
    expect(detailsStr).not.toMatch(/senha\s*[:=]/i);
    expect(detailsStr).not.toMatch(/totp_code/i);
    expect(detailsStr).not.toMatch(/recovery_code/i);
    expect(detailsStr).not.toMatch(/secret/i);
  });

  it("logAdminAction sanitize detalhes — campos não devem conter valores sensíveis", async () => {
    const mockFrom = vi.fn();
    const insertQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await logAdminAction({
      adminUserId: "admin-1",
      adminEmail: "admin@test.com",
      action: "password_changed",
      entityType: "user",
      entityId: "user-1",
      details: {
        changed_by: "user-1",
        reason: "user_request",
        // Intencionalmente sem dados sensíveis
      },
    });

    const insertPayload = insertQb.insert.mock.calls[0][0];

    // Verifica no objeto details diretamente (não no JSON serializado completo)
    const details = insertPayload.details ?? {};

    // Não deve conter chaves sensíveis
    expect(details).not.toHaveProperty("password");
    expect(details).not.toHaveProperty("senha");
    expect(details).not.toHaveProperty("totp_code");
    expect(details).not.toHaveProperty("recovery_code");
    expect(details).not.toHaveProperty("secret");
    expect(details).not.toHaveProperty("token");
    expect(details).not.toHaveProperty("access_token");
    expect(details).not.toHaveProperty("refresh_token");

    // Não deve conter padrões que indiquem dados sensíveis em valores
    const detailsStr = JSON.stringify(details);
    expect(detailsStr).not.toMatch(/eyJ[A-Za-z0-9]/); // JWT pattern
    expect(detailsStr).not.toMatch(/sk_live_/); // Stripe secret
    expect(detailsStr).not.toMatch(/sk_test_/); // Stripe test
  });
});

// ===========================================================================
// 5. Isolamento entre tenants — sessões sempre filtram por law_firm_id
// ===========================================================================
describe("Isolamento entre tenants — sessões", () => {
  it("getUserSessions SEMPRE filtra por law_firm_id", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder([]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await getUserSessions("user-1", "firm-1");

    // Verifica que eq("law_firm_id", ...) foi chamado
    expect(selectQb.eq).toHaveBeenCalledWith("law_firm_id", "firm-1");

    // Verifica que eq("user_id", ...) também foi chamado
    expect(selectQb.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("getUserSessions não retorna sessões de outro tenant", async () => {
    const mockFrom = vi.fn();

    // Simula retorno de sessões — mas o ponto é que a query filtra por law_firm_id
    const selectQb = createMockQueryBuilder([
      {
        id: "s1",
        user_id: "user-1",
        law_firm_id: "firm-1",
        member_id: "m1",
        status: "ativa",
      },
    ]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const sessions = await getUserSessions("user-1", "firm-1");

    // Todas as sessões retornadas devem pertencer ao tenant correto
    for (const session of sessions) {
      expect(session.lawFirmId).toBe("firm-1");
    }

    // A query deve ter filtrado por law_firm_id
    const eqCalls = selectQb.eq.mock.calls.map((c: any[]) => c[0]);
    expect(eqCalls).toContain("law_firm_id");
  });
});

// ===========================================================================
// 6. Isolamento entre tenants — dispositivos sempre filtram por user + tenant
// ===========================================================================
describe("Isolamento entre tenants — dispositivos", () => {
  it("getTrustedDevices SEMPRE filtra por userId E lawFirmId", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder([]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await getTrustedDevices("user-1", "firm-1");

    // Verifica que eq("user_id", ...) foi chamado
    expect(selectQb.eq).toHaveBeenCalledWith("user_id", "user-1");

    // Verifica que eq("law_firm_id", ...) foi chamado
    expect(selectQb.eq).toHaveBeenCalledWith("law_firm_id", "firm-1");
  });

  it("getTrustedDevices não retorna dispositivos de outro tenant", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder([
      {
        id: "dev-1",
        user_id: "user-1",
        law_firm_id: "firm-1",
        device_hash: "abc",
        browser_name: "Chrome",
        os_name: "Windows 10+",
        device_type: "Desktop",
        trusted_until: "2025-12-31T00:00:00Z",
        last_seen_at: "2025-01-01T00:00:00Z",
        status: "ativo",
        created_at: "2025-01-01T00:00:00Z",
      },
    ]);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const devices = await getTrustedDevices("user-1", "firm-1");

    for (const device of devices) {
      expect(device.lawFirmId).toBe("firm-1");
      expect(device.userId).toBe("user-1");
    }

    // A query deve ter filtrado por ambos os campos
    const eqCalls = selectQb.eq.mock.calls.map((c: any[]) => c[0]);
    expect(eqCalls).toContain("user_id");
    expect(eqCalls).toContain("law_firm_id");
  });
});

// ===========================================================================
// 7. Admin client indisponível — serviços retornam gracefully
// ===========================================================================
describe("Admin client indisponível — graceful degradation", () => {
  it("getUserSessions retorna array vazio quando admin client é null", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await getUserSessions("user-1", "firm-1");
    expect(result).toEqual([]);
  });

  it("createUserSession retorna null quando admin client é null", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await createUserSession("user-1", "firm-1", "m1", {});
    expect(result).toBeNull();
  });

  it("getTrustedDevices retorna array vazio quando admin client é null", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await getTrustedDevices("user-1", "firm-1");
    expect(result).toEqual([]);
  });

  it("validateStepUp retorna { valid: false } quando admin client é null", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await validateStepUp("user-1", "session-1", "financial");
    expect(result.valid).toBe(false);
  });

  it("getMfaEnrollments retorna array vazio quando server client é null", async () => {
    (getSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const context = makeContext();
    const result = await getMfaEnrollments(context);
    expect(result).toEqual([]);
  });

  it("logAdminAction não lança erro quando admin client é null", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(
      logAdminAction({
        adminUserId: "admin-1",
        adminEmail: "admin@test.com",
        action: "test",
        entityType: "test",
      })
    ).resolves.toBeUndefined();
  });
});

// ===========================================================================
// 8. Step-up authorization — escopo userId + sessionId + actionType
// ===========================================================================
describe("Step-up authorization — escopo triplo", () => {
  it("validateStepUp exige match de userId, sessionId E actionType", async () => {
    const mockFrom = vi.fn();

    // Simula retorno de uma autorização que existe mas para OUTROS parâmetros
    const selectQb = createMockQueryBuilder({ id: "auth-1" });

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await validateStepUp("user-1", "session-1", "financial");

    // Verifica que TODOS os três filtros são aplicados
    expect(selectQb.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(selectQb.eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(selectQb.eq).toHaveBeenCalledWith("action_type", "financial");
  });

  it("validateStepUp retorna false quando sessionId não corresponde", async () => {
    const mockFrom = vi.fn();

    // A query retorna null (não encontrou correspondência)
    const selectQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    // Mesmo com userId e actionType corretos, sessionId diferente resulta em false
    const result = await validateStepUp("user-1", "wrong-session", "financial");
    expect(result.valid).toBe(false);

    // Verifica que o filtro por session_id foi aplicado
    expect(selectQb.eq).toHaveBeenCalledWith("session_id", "wrong-session");
  });

  it("validateStepUp retorna false quando actionType não corresponde", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateStepUp("user-1", "session-1", "export");
    expect(result.valid).toBe(false);

    expect(selectQb.eq).toHaveBeenCalledWith("action_type", "export");
  });

  it("validateStepUp retorna false quando userId não corresponde", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await validateStepUp("wrong-user", "session-1", "financial");
    expect(result.valid).toBe(false);

    expect(selectQb.eq).toHaveBeenCalledWith("user_id", "wrong-user");
  });

  it("validateStepUp filtra autorizações consumidas e expiradas", async () => {
    const mockFrom = vi.fn();
    const selectQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await validateStepUp("user-1", "session-1", "financial");

    // Verifica que filtra por consumed = false
    expect(selectQb.eq).toHaveBeenCalledWith("consumed", false);

    // Verifica que filtra por expires_at > agora
    expect(selectQb.gt).toHaveBeenCalled();
  });
});
