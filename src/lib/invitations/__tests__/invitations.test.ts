import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  INVITATION_STATUSES,
  INVITATION_STATUS_LABELS,
  INVITATION_STATUS_COLORS,
} from "@/lib/onboarding/constants";

// ── Chainable mock builder ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainable(result: any): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop, _receiver) {
      if (prop === "then") {
        return (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject);
      }
      if (typeof prop === "symbol") return undefined;
      if (prop === "maybeSingle" || prop === "single" || prop === "count") {
        return () => Promise.resolve(result);
      }
      return (...args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSupabaseClient(tableResults: Record<string, any>): any {
  return {
    from: vi.fn((table: string) => {
      const result = tableResults[table] ?? {};
      return chainable(result);
    }),
  };
}

// ── Mock context ──────────────────────────────────────────────────────────────

const mockReadyContext = {
  status: "ready" as const,
  member: {
    id: "member-1",
    userId: "user-1",
    lawFirmId: "firm-1",
    name: "Teste",
    email: "teste@teste.com",
    role: "proprietario" as const,
    status: "ativo",
    position: null,
    lastAccessAt: null,
  },
  lawFirm: {
    id: "firm-1",
    name: "Escritório Teste",
    slug: "escritorio-teste",
    document: null,
    email: null,
    phone: null,
    logoPath: null,
    plan: "profissional",
    status: "ativo",
    createdAt: new Date().toISOString(),
  },
};

const mockMissingEnvContext = {
  status: "missing-env" as const,
  member: null,
  lawFirm: null,
};

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/auth/context", () => ({
  getAppContext: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({
  can: vi.fn().mockReturnValue(true),
}));

// ── Mock references ───────────────────────────────────────────────────────────

const mockRedirect = vi.mocked((await import("next/navigation")).redirect);
const mockGetSupabaseServerClient = vi.mocked(
  (await import("@/lib/supabase/server")).getSupabaseServerClient,
);
const mockGetAppContext = vi.mocked(
  (await import("@/lib/auth/context")).getAppContext,
);
const mockCan = vi.mocked(
  (await import("@/lib/auth/permissions")).can,
);

const {
  cancelInvitationAction,
  resendInvitationAction,
  checkInviteLimitAction,
} = await import("@/lib/invitations/actions");

// ── Constantes ────────────────────────────────────────────────────────────────

describe("INVITATION_STATUSES", () => {
  it("possui exatamente 6 statuses", () => {
    expect(INVITATION_STATUSES).toHaveLength(6);
  });

  it("contém todos os statuses válidos", () => {
    expect([...INVITATION_STATUSES]).toEqual([
      "pendente",
      "visualizado",
      "aceito",
      "expirado",
      "cancelado",
      "recusado",
    ]);
  });
});

describe("INVITATION_STATUS_LABELS", () => {
  it("possui labels para todos os 6 statuses", () => {
    for (const status of INVITATION_STATUSES) {
      expect(INVITATION_STATUS_LABELS).toHaveProperty(status);
      expect(typeof INVITATION_STATUS_LABELS[status]).toBe("string");
    }
  });

  it("labels são strings não vazias", () => {
    expect(INVITATION_STATUS_LABELS.pendente).toBe("Pendente");
    expect(INVITATION_STATUS_LABELS.visualizado).toBe("Visualizado");
    expect(INVITATION_STATUS_LABELS.aceito).toBe("Aceito");
    expect(INVITATION_STATUS_LABELS.expirado).toBe("Expirado");
    expect(INVITATION_STATUS_LABELS.cancelado).toBe("Cancelado");
    expect(INVITATION_STATUS_LABELS.recusado).toBe("Recusado");
  });
});

describe("INVITATION_STATUS_COLORS", () => {
  it("possui cores para todos os 6 statuses", () => {
    for (const status of INVITATION_STATUSES) {
      expect(INVITATION_STATUS_COLORS).toHaveProperty(status);
      expect(typeof INVITATION_STATUS_COLORS[status]).toBe("string");
      expect(INVITATION_STATUS_COLORS[status].length).toBeGreaterThan(0);
    }
  });
});

// ── cancelInvitationAction ────────────────────────────────────────────────────

describe("cancelInvitationAction", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
    mockGetSupabaseServerClient.mockReset();
    mockGetAppContext.mockReset();
    mockCan.mockReset();
    mockCan.mockReturnValue(true);
  });

  it("cancela um convite pendente com sucesso", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-1", law_firm_id: "firm-1", status: "pendente" },
          error: null,
        },
      }),
    );

    await expect(cancelInvitationAction("inv-1")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/equipe?cancelado=1");
  });

  it("redireciona com erro quando contexto está missing-env", async () => {
    mockGetAppContext.mockResolvedValue(mockMissingEnvContext);

    await expect(cancelInvitationAction("inv-1")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/equipe?erro=ambiente");
  });

  it("cancela convite com status visualizado", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-2", law_firm_id: "firm-1", status: "visualizado" },
          error: null,
        },
      }),
    );

    await expect(cancelInvitationAction("inv-2")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/equipe?cancelado=1");
  });

  it("falha ao tentar cancelar convite com status aceito", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-3", law_firm_id: "firm-1", status: "aceito" },
          error: null,
        },
      }),
    );

    await expect(cancelInvitationAction("inv-3")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/equipe?erro=convite_cancelavel",
    );
  });
});

// ── resendInvitationAction ────────────────────────────────────────────────────

describe("resendInvitationAction", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
    mockGetSupabaseServerClient.mockReset();
    mockGetAppContext.mockReset();
    mockCan.mockReset();
    mockCan.mockReturnValue(true);
  });

  it("reenvia um convite com sucesso", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-1", law_firm_id: "firm-1", status: "pendente" },
          error: null,
        },
        audit_logs: { count: 2 },
      }),
    );

    await expect(resendInvitationAction("inv-1")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/equipe?reenviado=1");
  });

  it("falha ao reenviar convite cancelado", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-4", law_firm_id: "firm-1", status: "cancelado" },
          error: null,
        },
      }),
    );

    await expect(resendInvitationAction("inv-4")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/equipe?erro=convite_reenviavel",
    );
  });

  it("falha ao reenviar convite aceito", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-5", law_firm_id: "firm-1", status: "aceito" },
          error: null,
        },
      }),
    );

    await expect(resendInvitationAction("inv-5")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/equipe?erro=convite_reenviavel",
    );
  });

  it("respeita o limite de 5 reenvios", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        team_invitations: {
          data: { id: "inv-6", law_firm_id: "firm-1", status: "pendente" },
          error: null,
        },
        audit_logs: { count: 5 },
      }),
    );

    await expect(resendInvitationAction("inv-6")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/equipe?erro=limite_reenvios",
    );
  });
});

// ── checkInviteLimitAction ────────────────────────────────────────────────────

describe("checkInviteLimitAction", () => {
  beforeEach(() => {
    mockGetSupabaseServerClient.mockReset();
    mockGetAppContext.mockReset();
  });

  it("retorna allowed: false quando ambiente não está configurado", async () => {
    mockGetAppContext.mockResolvedValue(mockMissingEnvContext);

    const result = await checkInviteLimitAction();
    expect(result).toEqual({ allowed: false, limit: 0, current: 0 });
  });

  it("retorna allowed: false quando supabase não está disponível", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(null);

    const result = await checkInviteLimitAction();
    expect(result).toEqual({ allowed: false, limit: 0, current: 0 });
  });

  it("retorna allowed quando dentro do limite", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        law_firm_members: { count: 3 },
        audit_logs: { count: 0 },
        law_firms: { data: { plan: "profissional" }, error: null },
        plan_limits: { data: { limit_value: 10 } },
      }),
    );

    const result = await checkInviteLimitAction();
    expect(result.limit).toBe(10);
    expect(result.current).toBe(3);
    expect(result.allowed).toBe(true);
  });

  it("retorna allowed: false quando no limite", async () => {
    mockGetAppContext.mockResolvedValue(mockReadyContext);
    mockGetSupabaseServerClient.mockResolvedValue(
      buildSupabaseClient({
        law_firm_members: { count: 5 },
        audit_logs: { count: 5 },
        law_firms: { data: { plan: "profissional" }, error: null },
        plan_limits: { data: { limit_value: 10 } },
      }),
    );

    const result = await checkInviteLimitAction();
    expect(result.limit).toBe(10);
    expect(result.current).toBe(10);
    expect(result.allowed).toBe(false);
  });
});
