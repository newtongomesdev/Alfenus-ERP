import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  detectRisk,
  getRiskFlags,
  resolveRiskFlag,
  getRiskSummary,
} from "../risk-detection";
import type { RiskDetectionContext } from "../risk-detection";

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

const mockFrom = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

const noRiskCtx: RiskDetectionContext = {
  isNewDevice: false,
  isUnknownIp: false,
  hasMultipleSessions: false,
  recentFailedAttempts: 0,
  usedRecoveryCode: false,
  recentMfaReset: false,
};

function flagRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "flag-1",
    user_id: "user-1",
    law_firm_id: "firm-1",
    session_id: "session-1",
    risk_type: "novo_dispositivo",
    risk_level: "atencao",
    description: "Test flag",
    metadata: null,
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function setupAdmin() {
  (getSupabaseAdminClient as any).mockReturnValue({ from: mockFrom });
}

// ── detectRisk ───────────────────────────────────────────────────────────────

describe("detectRisk", () => {
  it("retorna array vazio quando não há riscos", async () => {
    setupAdmin();
    const result = await detectRisk("u1", "f1", "s1", noRiskCtx);
    expect(result.flags).toEqual([]);
    expect(result.highestRisk).toBe("informativo");
  });

  it("detecta novo dispositivo", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "novo_dispositivo", risk_level: "atencao" }),
      ),
    );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      isNewDevice: true,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("novo_dispositivo");
    expect(result.flags[0].riskLevel).toBe("atencao");
  });

  it("detecta IP desconhecido", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "ip_desconhecido", risk_level: "atencao" }),
      ),
    );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      isUnknownIp: true,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("ip_desconhecido");
  });

  it("detecta falhas repetidas", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "tentativas_falha", risk_level: "atencao" }),
      ),
    );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      recentFailedAttempts: 3,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("tentativas_falha");
    expect(result.flags[0].riskLevel).toBe("atencao");
  });

  it("detecta alto risco com muitas falhas", async () => {
    setupAdmin();
    mockFrom
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "tentativas_falha", risk_level: "alto_risco" }),
        ),
      )
      .mockReturnValueOnce(createMockQueryBuilder(null));
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      recentFailedAttempts: 5,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("tentativas_falha");
    expect(result.flags[0].riskLevel).toBe("alto_risco");
    expect(result.highestRisk).toBe("alto_risco");
  });

  it("detecta código de recuperação usado", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "codigo_recuperacao", risk_level: "atencao" }),
      ),
    );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      usedRecoveryCode: true,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("codigo_recuperacao");
  });

  it("detecta múltiplas sessões", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "multiplas_sessoes", risk_level: "informativo" }),
      ),
    );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      hasMultipleSessions: true,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("multiplas_sessoes");
    expect(result.flags[0].riskLevel).toBe("informativo");
  });

  it("detecta reset de MFA recente", async () => {
    setupAdmin();
    mockFrom
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "reset_mfa_recente", risk_level: "alto_risco" }),
        ),
      )
      .mockReturnValueOnce(createMockQueryBuilder(null));
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      recentMfaReset: true,
    });
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].riskType).toBe("reset_mfa_recente");
    expect(result.flags[0].riskLevel).toBe("alto_risco");
  });

  it("retorna nível mais alto entre múltiplas flags", async () => {
    setupAdmin();
    mockFrom
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "novo_dispositivo", risk_level: "atencao" }),
        ),
      )
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "tentativas_falha", risk_level: "atencao" }),
        ),
      );
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      isNewDevice: true,
      recentFailedAttempts: 3,
    });
    expect(result.flags).toHaveLength(2);
    expect(result.highestRisk).toBe("atencao");
  });

  it("retorna higherestRisk correto para informativo/atencao/alto_risco", async () => {
    setupAdmin();

    mockFrom.mockReturnValueOnce(
      createMockQueryBuilder(
        flagRow({ risk_type: "multiplas_sessoes", risk_level: "informativo" }),
      ),
    );
    let result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      hasMultipleSessions: true,
    });
    expect(result.highestRisk).toBe("informativo");

    mockFrom
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "multiplas_sessoes", risk_level: "informativo" }),
        ),
      )
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "novo_dispositivo", risk_level: "atencao" }),
        ),
      );
    result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      hasMultipleSessions: true,
      isNewDevice: true,
    });
    expect(result.highestRisk).toBe("atencao");

    mockFrom
      .mockReturnValueOnce(
        createMockQueryBuilder(
          flagRow({ risk_type: "reset_mfa_recente", risk_level: "alto_risco" }),
        ),
      )
      .mockReturnValueOnce(createMockQueryBuilder(null));
    result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      recentMfaReset: true,
    });
    expect(result.highestRisk).toBe("alto_risco");
  });

  it("retorna arrays vazios quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as any).mockReturnValue(null);
    const result = await detectRisk("u1", "f1", "s1", {
      ...noRiskCtx,
      isNewDevice: true,
    });
    expect(result.flags).toEqual([]);
    expect(result.highestRisk).toBe("informativo");
  });
});

// ── getRiskFlags ─────────────────────────────────────────────────────────────

describe("getRiskFlags", () => {
  it("retorna lista de flags", async () => {
    setupAdmin();
    const rows = [
      flagRow({ id: "f1", risk_type: "novo_dispositivo" }),
      flagRow({ id: "f2", risk_type: "ip_desconhecido" }),
    ];
    mockFrom.mockReturnValueOnce(createMockQueryBuilder(rows));
    const result = await getRiskFlags("u1", "f1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("f1");
    expect(result[0].riskType).toBe("novo_dispositivo");
    expect(result[1].id).toBe("f2");
    expect(result[1].riskType).toBe("ip_desconhecido");
  });

  it("retorna array vazio quando não há flags", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(createMockQueryBuilder([]));
    const result = await getRiskFlags("u1", "f1");
    expect(result).toEqual([]);
  });

  it("retorna array vazio quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as any).mockReturnValue(null);
    const result = await getRiskFlags("u1", "f1");
    expect(result).toEqual([]);
  });

  it("aplica filtro de status corretamente", async () => {
    setupAdmin();
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValueOnce(qb);
    await getRiskFlags("u1", "f1", { resolved: false });
    expect(qb.eq).toHaveBeenCalledWith("resolved", false);
  });
});

// ── resolveRiskFlag ──────────────────────────────────────────────────────────

describe("resolveRiskFlag", () => {
  it("marca flag como resolvida", async () => {
    setupAdmin();
    mockFrom
      .mockReturnValueOnce(createMockQueryBuilder(null))
      .mockReturnValueOnce(createMockQueryBuilder(null));
    await expect(resolveRiskFlag("flag-1", "admin-1")).resolves.toBeUndefined();
  });

  it("lança erro quando update falha", async () => {
    setupAdmin();
    const error = { message: "Update failed" };
    mockFrom.mockReturnValueOnce(createMockQueryBuilder(null, error));
    await expect(resolveRiskFlag("flag-1", "admin-1")).rejects.toBe(error);
  });
});

// ── getRiskSummary ───────────────────────────────────────────────────────────

describe("getRiskSummary", () => {
  it("retorna contagem correta por nível", async () => {
    setupAdmin();
    const rows = [
      { risk_level: "informativo", resolved: false },
      { risk_level: "informativo", resolved: true },
      { risk_level: "atencao", resolved: false },
      { risk_level: "atencao", resolved: false },
      { risk_level: "alto_risco", resolved: false },
    ];
    mockFrom.mockReturnValueOnce(createMockQueryBuilder(rows));
    const result = await getRiskSummary("f1");
    expect(result.total).toBe(5);
    expect(result.byLevel.informativo).toBe(2);
    expect(result.byLevel.atencao).toBe(2);
    expect(result.byLevel.alto_risco).toBe(1);
    expect(result.unresolved).toBe(4);
  });

  it("retorna zeros quando não há flags", async () => {
    setupAdmin();
    mockFrom.mockReturnValueOnce(createMockQueryBuilder([]));
    const result = await getRiskSummary("f1");
    expect(result.total).toBe(0);
    expect(result.byLevel).toEqual({
      informativo: 0,
      atencao: 0,
      alto_risco: 0,
    });
    expect(result.unresolved).toBe(0);
  });

  it("retorna zeros quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as any).mockReturnValue(null);
    const result = await getRiskSummary("f1");
    expect(result.total).toBe(0);
    expect(result.byLevel).toEqual({
      informativo: 0,
      atencao: 0,
      alto_risco: 0,
    });
    expect(result.unresolved).toBe(0);
  });
});
