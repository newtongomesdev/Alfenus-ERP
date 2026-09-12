import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createUserSession,
  refreshSession,
  revokeSession,
  revokeAllUserSessions,
  expireOldSessions,
  getSessionWithDetails,
  getUserSessions,
  markSessionSuspicious,
} from "@/lib/security/session-lifecycle";

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
    "lt",
    "range",
  ];
  for (const method of methods) {
    qb[method] = vi.fn().mockReturnValue(qb);
  }
  qb.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
    resolve({ data, error });
  };
  return qb;
}

/**
 * Creates a mock `from` that returns different query builders per call
 * for the same table, based on a sequential list of data/error tuples.
 *
 * Usage:
 *   createSequentialMockFrom({
 *     user_sessions: [
 *       [sessionData],          // 1st call to from("user_sessions")
 *       [null],                 // 2nd call (update)
 *     ],
 *     session_events: [
 *       [null],                 // 1st call (insert)
 *     ],
 *     admin_audit_logs: [
 *       [null],
 *     ],
 *   });
 */
function createSequentialMockFrom(
  spec: Record<string, Array<[unknown, unknown?]>>
) {
  const counters: Record<string, number> = {};

  return vi.fn((table: string) => {
    if (!(table in counters)) counters[table] = 0;
    const idx = counters[table]++;
    const entry = spec[table]?.[idx] ?? [null];
    return createMockQueryBuilder(entry[0], entry[1] ?? null);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createUserSession
// ---------------------------------------------------------------------------
describe("createUserSession", () => {
  const sessionRow = {
    id: "s1",
    user_id: "u1",
    law_firm_id: "lf1",
    member_id: "m1",
    ip_address: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    mfa_level: "totp",
    device_info: { os: "Windows" },
    status: "ativa",
    last_activity_at: "2025-01-01T00:00:00.000Z",
    expires_at: "2025-01-01T08:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
  };

  it("cria sessão com campos corretos", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionRow]],
      session_events: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await createUserSession("u1", "lf1", "m1", {
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      mfaLevel: "totp",
      deviceInfo: { os: "Windows" },
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("s1");
    expect(result!.userId).toBe("u1");
    expect(result!.lawFirmId).toBe("lf1");
    expect(result!.memberId).toBe("m1");
    expect(result!.ipAddress).toBe("192.168.1.1");
    expect(result!.userAgent).toBe("Mozilla/5.0");
    expect(result!.mfaLevel).toBe("totp");
    expect(result!.deviceInfo).toEqual({ os: "Windows" });
    expect(result!.status).toBe("ativa");
  });

  it("usa status 'ativa' por padrão", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionRow]],
      session_events: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await createUserSession("u1", "lf1", "m1", {});

    expect(result).not.toBeNull();
    expect(result!.status).toBe("ativa");

    // Verifica que o insert foi chamado com status "ativa"
    const userSessionsQb = mockFrom.mock.results[0].value;
    const insertCall = userSessionsQb.insert.mock.calls[0][0];
    expect(insertCall.status).toBe("ativa");
  });

  it("registra evento 'criada' após inserção", async () => {
    const sessionRowForEvent = {
      ...sessionRow,
      ip_address: "10.0.0.1",
      user_agent: "Chrome",
      mfa_level: "sms",
    };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionRowForEvent]],
      session_events: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await createUserSession("u1", "lf1", "m1", {
      ipAddress: "10.0.0.1",
      userAgent: "Chrome",
      mfaLevel: "sms",
    });

    const sessionEventsQb = mockFrom.mock.results[1].value;
    const eventInsertCall = sessionEventsQb.insert.mock.calls[0][0];
    expect(eventInsertCall.event_type).toBe("criada");
    expect(eventInsertCall.session_id).toBe("s1");
    expect(eventInsertCall.ip_address).toBe("10.0.0.1");
    expect(eventInsertCall.user_agent).toBe("Chrome");
    expect(eventInsertCall.metadata).toEqual({ mfa_level: "sms" });
  });

  it("retorna null quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await createUserSession("u1", "lf1", "m1", {});

    expect(result).toBeNull();
  });

  it("usa expiresAt fornecido quando disponível", async () => {
    const customExpiry = "2025-06-15T12:00:00.000Z";
    const mockFrom = createSequentialMockFrom({
      user_sessions: [
        [
          {
            ...sessionRow,
            expires_at: customExpiry,
          },
        ],
      ],
      session_events: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await createUserSession("u1", "lf1", "m1", {
      expiresAt: customExpiry,
    });

    const userSessionsQb = mockFrom.mock.results[0].value;
    const insertCall = userSessionsQb.insert.mock.calls[0][0];
    expect(insertCall.expires_at).toBe(customExpiry);
  });
});

// ---------------------------------------------------------------------------
// refreshSession
// ---------------------------------------------------------------------------
describe("refreshSession", () => {
  it("atualiza last_activity_at", async () => {
    const currentSession = { ip_address: "192.168.1.1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [
        [currentSession], // 1st: select (maybeSingle)
        [null], // 2nd: update
      ],
      session_events: [[null]], // 3rd: insert event
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await refreshSession("s1");

    // Verifica que select foi chamado para buscar sessão
    const selectQb = mockFrom.mock.results[0].value;
    expect(selectQb.select).toHaveBeenCalled();

    // Verifica que update foi chamado
    const updateQb = mockFrom.mock.results[1].value;
    expect(updateQb.update).toHaveBeenCalled();
    const updateCall = updateQb.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("last_activity_at");
  });

  it("detecta mudança de IP e registra evento", async () => {
    const currentSession = { ip_address: "192.168.1.1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [
        [currentSession], // select
        [null], // update
      ],
      session_events: [[null], [null]], // ip_alterado + atividade
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await refreshSession("s1", "10.0.0.99");

    // Deve ter registrado evento de IP alterado
    const sessionEventsQb1 = mockFrom.mock.results[2].value;
    const sessionEventsQb2 = mockFrom.mock.results[3].value;
    const allEventCalls = [
      ...sessionEventsQb1.insert.mock.calls,
      ...sessionEventsQb2.insert.mock.calls,
    ];
    const ipAlteredEvent = allEventCalls.find(
      (call: any[]) => call[0].event_type === "ip_alterado"
    );
    expect(ipAlteredEvent).toBeDefined();
    expect(ipAlteredEvent![0].metadata).toEqual({
      previous_ip: "192.168.1.1",
      new_ip: "10.0.0.99",
    });

    // Deve também registrar evento de atividade
    const activityEvent = allEventCalls.find(
      (call: any[]) => call[0].event_type === "atividade"
    );
    expect(activityEvent).toBeDefined();
  });

  it("não faz nada quando sessão não existe", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[null]], // select returns null
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await refreshSession("nonexistent");

    // select foi chamado (maybeSingle retorna null)
    const selectQb = mockFrom.mock.results[0].value;
    expect(selectQb.maybeSingle).toHaveBeenCalled();
    // Somente 1 call to from (select) — nenhum update
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// revokeSession
// ---------------------------------------------------------------------------
describe("revokeSession", () => {
  it("define status como 'revogada'", async () => {
    const session = { id: "s1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [
        [session], // select
        [null], // update
      ],
      session_events: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeSession("s1", "admin1", "motivo teste");

    const updateQb = mockFrom.mock.results[1].value;
    expect(updateQb.update).toHaveBeenCalledWith({ status: "revogada" });
  });

  it("retorna revoked=true após sucesso", async () => {
    const session = { id: "s1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]],
      session_events: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeSession("s1", "admin1", "motivo");

    expect(result.revoked).toBe(true);
  });

  it("retorna revoked=false quando sessão não existe", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[null]], // maybeSingle returns null
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeSession("nonexistent", "admin1", "motivo");

    expect(result.revoked).toBe(false);
  });

  it("registra evento de revogação", async () => {
    const session = { id: "s1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]],
      session_events: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeSession("s1", "admin1", "acesso indevido");

    const sessionEventsQb = mockFrom.mock.results[2].value;
    const eventCall = sessionEventsQb.insert.mock.calls[0][0];
    expect(eventCall.event_type).toBe("revogada");
    expect(eventCall.session_id).toBe("s1");
    expect(eventCall.metadata).toEqual({
      revoked_by: "admin1",
      reason: "acesso indevido",
    });
  });

  it("registra log de auditoria", async () => {
    const session = { id: "s1", status: "ativa" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]],
      session_events: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeSession("s1", "admin1", "motivo");

    const auditQb = mockFrom.mock.results[3].value;
    const auditCall = auditQb.insert.mock.calls[0][0];
    expect(auditCall.admin_user_id).toBe("admin1");
    expect(auditCall.action).toBe("session_revoked");
    expect(auditCall.entity_type).toBe("user_session");
    expect(auditCall.entity_id).toBe("s1");
    expect(auditCall.details).toEqual({ reason: "motivo" });
  });
});

// ---------------------------------------------------------------------------
// revokeAllUserSessions
// ---------------------------------------------------------------------------
describe("revokeAllUserSessions", () => {
  it("revoga todas as sessões ativas do usuário", async () => {
    const activeSessions = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[activeSessions], [null]], // select, update
      session_events: [[null], [null], [null]], // 3 events
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeAllUserSessions("u1", "lf1", "admin1", "segurança");

    expect(result).toBe(3);
    const updateQb = mockFrom.mock.results[1].value;
    expect(updateQb.update).toHaveBeenCalledWith({ status: "revogada" });
  });

  it("exclui sessão específica quando excludeSessionId é fornecido", async () => {
    const activeSessions = [{ id: "s1" }, { id: "s3" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[activeSessions], [null]],
      session_events: [[null], [null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeAllUserSessions(
      "u1",
      "lf1",
      "admin1",
      "segurança",
      "s2"
    );

    expect(result).toBe(2);
    // Verifica que neq foi chamado para excluir a sessão
    const selectQb = mockFrom.mock.results[0].value;
    expect(selectQb.neq).toHaveBeenCalledWith("id", "s2");
  });

  it("retorna número de sessões revogadas", async () => {
    const activeSessions = [{ id: "s1" }, { id: "s2" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[activeSessions], [null]],
      session_events: [[null], [null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeAllUserSessions("u1", "lf1", "admin1");

    expect(result).toBe(2);
  });

  it("retorna 0 quando não há sessões ativas", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[[]]], // empty list
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await revokeAllUserSessions("u1", "lf1", "admin1");

    expect(result).toBe(0);
  });

  it("registra evento para cada sessão revogada", async () => {
    const activeSessions = [{ id: "s1" }, { id: "s2" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[activeSessions], [null]],
      session_events: [[null], [null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeAllUserSessions("u1", "lf1", "admin1", "motivo");

    // Collect all insert calls from session_events query builders
    const eventQbs = mockFrom.mock.results
      .filter((r: any) => r.value?.insert)
      .map((r: any) => r.value);

    const allInsertCalls: any[] = [];
    for (const qb of eventQbs) {
      allInsertCalls.push(...qb.insert.mock.calls);
    }

    // At least 2 event inserts
    const eventInserts = allInsertCalls.filter(
      (c: any[]) => c[0]?.event_type === "revogada"
    );
    expect(eventInserts.length).toBe(2);
    expect(eventInserts[0][0].session_id).toBe("s1");
    expect(eventInserts[1][0].session_id).toBe("s2");
  });

  it("registra log de auditoria com contagem correta", async () => {
    const activeSessions = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[activeSessions], [null]],
      session_events: [[null], [null], [null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeAllUserSessions("u1", "lf1", "admin1", "motivo", "s2");

    // Find the admin_audit_logs query builder
    const auditQbs = mockFrom.mock.results
      .filter((r: any) => {
        // The audit log qb is the last one with insert
        return r.value?.insert?.mock?.calls?.some?.(
          (c: any[]) => c[0]?.admin_user_id === "admin1"
        );
      })
      .map((r: any) => r.value);

    expect(auditQbs.length).toBeGreaterThanOrEqual(1);
    const auditCall = auditQbs[0].insert.mock.calls[0][0];
    expect(auditCall.admin_user_id).toBe("admin1");
    expect(auditCall.action).toBe("sessions_revoked_all");
    expect(auditCall.entity_type).toBe("user_session");
    expect(auditCall.entity_id).toBe("u1");
    expect(auditCall.details.sessions_revoked).toBe(3);
    expect(auditCall.details.reason).toBe("motivo");
    expect(auditCall.details.excluded_session).toBe("s2");
  });
});

// ---------------------------------------------------------------------------
// expireOldSessions
// ---------------------------------------------------------------------------
describe("expireOldSessions", () => {
  it("expira sessões que passaram do expires_at", async () => {
    const expiredSessions = [{ id: "s1" }, { id: "s2" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[expiredSessions], [null]], // select, update
      session_events: [[null], [null]], // 2 events
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await expireOldSessions();

    expect(result).toBe(2);
    const updateQb = mockFrom.mock.results[1].value;
    expect(updateQb.update).toHaveBeenCalledWith({ status: "expirada" });
  });

  it("retorna número de sessões expiradas", async () => {
    const expiredSessions = [{ id: "s1" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[expiredSessions], [null]],
      session_events: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await expireOldSessions();

    expect(result).toBe(1);
  });

  it("retorna 0 quando não há sessões expiradas", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[[]]], // empty
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await expireOldSessions();

    expect(result).toBe(0);
  });

  it("registra evento 'expirada' para cada sessão", async () => {
    const expiredSessions = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[expiredSessions], [null]],
      session_events: [[null], [null], [null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await expireOldSessions();

    // Collect all event inserts
    const allInsertCalls: any[] = [];
    for (const r of mockFrom.mock.results) {
      if (r.value?.insert?.mock?.calls) {
        allInsertCalls.push(...r.value.insert.mock.calls);
      }
    }

    const expiryEvents = allInsertCalls.filter(
      (c: any[]) => c[0]?.event_type === "expirada"
    );
    expect(expiryEvents.length).toBe(3);
    expect(expiryEvents[0][0].session_id).toBe("s1");
    expect(expiryEvents[1][0].session_id).toBe("s2");
    expect(expiryEvents[2][0].session_id).toBe("s3");
  });
});

// ---------------------------------------------------------------------------
// getSessionWithDetails
// ---------------------------------------------------------------------------
describe("getSessionWithDetails", () => {
  const sessionData = {
    id: "s1",
    user_id: "u1",
    law_firm_id: "lf1",
    member_id: "m1",
    ip_address: "192.168.1.1",
    user_agent: "Chrome",
    mfa_level: "totp",
    device_info: { os: "Windows" },
    status: "ativa",
    last_activity_at: "2025-01-01T00:00:00.000Z",
    expires_at: "2025-01-01T08:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
  };

  it("retorna sessão com eventos e flags de risco", async () => {
    const eventsData = [
      {
        id: "e1",
        session_id: "s1",
        event_type: "criada",
        ip_address: "192.168.1.1",
        user_agent: "Chrome",
        metadata: null,
        created_at: "2025-01-01T00:00:00.000Z",
      },
    ];

    const riskData = [
      {
        id: "r1",
        risk_type: "ip_suspeito",
        risk_level: "alto_risco",
        description: "IP de localização incomum",
        created_at: "2025-01-01T01:00:00.000Z",
      },
    ];

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionData]],
      session_events: [[eventsData]],
      risk_flags: [[riskData]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getSessionWithDetails("s1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("s1");
    expect(result!.userId).toBe("u1");
    expect(result!.events).toHaveLength(1);
    expect(result!.events[0].eventType).toBe("criada");
    expect(result!.riskFlags).toHaveLength(1);
    expect(result!.riskFlags[0].riskType).toBe("ip_suspeito");
    expect(result!.riskFlags[0].riskLevel).toBe("alto_risco");
  });

  it("retorna null quando sessão não existe", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getSessionWithDetails("nonexistent");

    expect(result).toBeNull();
  });

  it("retorna array vazio de eventos quando não há eventos", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionData]],
      session_events: [[null]],
      risk_flags: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getSessionWithDetails("s1");

    expect(result).not.toBeNull();
    expect(result!.events).toEqual([]);
    expect(result!.riskFlags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getUserSessions
// ---------------------------------------------------------------------------
describe("getUserSessions", () => {
  const sessionsData = [
    {
      id: "s1",
      user_id: "u1",
      law_firm_id: "lf1",
      member_id: "m1",
      ip_address: "192.168.1.1",
      user_agent: "Chrome",
      mfa_level: "totp",
      device_info: null,
      status: "ativa",
      last_activity_at: "2025-01-01T00:00:00.000Z",
      expires_at: "2025-01-01T08:00:00.000Z",
      created_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "s2",
      user_id: "u1",
      law_firm_id: "lf1",
      member_id: "m1",
      ip_address: "10.0.0.1",
      user_agent: "Firefox",
      mfa_level: null,
      device_info: null,
      status: "revogada",
      last_activity_at: "2024-12-31T00:00:00.000Z",
      expires_at: "2024-12-31T08:00:00.000Z",
      created_at: "2024-12-31T00:00:00.000Z",
    },
  ];

  it("retorna lista de sessões do usuário", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[sessionsData]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getUserSessions("u1", "lf1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s1");
    expect(result[0].status).toBe("ativa");
    expect(result[1].id).toBe("s2");
    expect(result[1].status).toBe("revogada");
  });

  it("retorna array vazio quando não há sessões", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,

    });

    const result = await getUserSessions("u1", "lf1");

    expect(result).toEqual([]);
  });

  it("retorna array vazio quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await getUserSessions("u1", "lf1");

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// markSessionSuspicious
// ---------------------------------------------------------------------------
describe("markSessionSuspicious", () => {
  it("define status como 'suspeita'", async () => {
    const session = { user_id: "u1", law_firm_id: "lf1" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]], // select, update
      session_events: [[null]],
      risk_flags: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markSessionSuspicious("s1", "user_agent incomum");

    const updateQb = mockFrom.mock.results[1].value;
    expect(updateQb.update).toHaveBeenCalledWith({ status: "suspeita" });
  });

  it("cria flag de risco associada", async () => {
    const session = { user_id: "u1", law_firm_id: "lf1" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]],
      session_events: [[null]],
      risk_flags: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markSessionSuspicious("s1", "localização incomum");

    // call order: user_sessions select(0), user_sessions update(1), session_events(2), risk_flags(3), admin_audit_logs(4)
    const riskQb = mockFrom.mock.results[3].value;
    const riskCall = riskQb.insert.mock.calls[0][0];
    expect(riskCall.user_id).toBe("u1");
    expect(riskCall.law_firm_id).toBe("lf1");
    expect(riskCall.session_id).toBe("s1");
    expect(riskCall.risk_type).toBe("user_agent_suspeito");
    expect(riskCall.risk_level).toBe("alto_risco");
    expect(riskCall.description).toContain("localização incomum");
    expect(riskCall.resolved).toBe(false);
  });

  it("registra evento 'marcada_suspeita'", async () => {
    const session = { user_id: "u1", law_firm_id: "lf1" };

    const mockFrom = createSequentialMockFrom({
      user_sessions: [[session], [null]],
      session_events: [[null]],
      risk_flags: [[null]],
      admin_audit_logs: [[null]],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markSessionSuspicious("s1", "atividade anômala");

    // session_events is the 2nd call
    const eventQb = mockFrom.mock.results[2].value;
    const eventCall = eventQb.insert.mock.calls[0][0];
    expect(eventCall.event_type).toBe("marcada_suspeita");
    expect(eventCall.session_id).toBe("s1");
    expect(eventCall.metadata).toEqual({ reason: "atividade anômala" });
  });

  it("não faz nada quando sessão não existe", async () => {
    const mockFrom = createSequentialMockFrom({
      user_sessions: [[null]], // maybeSingle returns null
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markSessionSuspicious("nonexistent", "motivo");

    const selectQb = mockFrom.mock.results[0].value;
    expect(selectQb.maybeSingle).toHaveBeenCalled();
    // Only 1 call (select returned null, so no further calls)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
