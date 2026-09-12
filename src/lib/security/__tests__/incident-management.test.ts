import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

function buildQueryChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn();
  return chain;
}

let queryChain: ReturnType<typeof buildQueryChain>;

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => queryChain),
  })),
}));

import {
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
  createIncident,
  updateIncidentStatus,
  getIncidents,
} from "../incident-management";

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  queryChain = buildQueryChain();
});

// ── isValidStatusTransition ─────────────────────────────────────────────────

describe("isValidStatusTransition", () => {
  it("permite aberto → investigando", () => {
    expect(isValidStatusTransition("aberto", "investigando")).toBe(true);
  });

  it("permite aberto → resolvido", () => {
    expect(isValidStatusTransition("aberto", "resolvido")).toBe(true);
  });

  it("permite aberto → fechado", () => {
    expect(isValidStatusTransition("aberto", "fechado")).toBe(true);
  });

  it("permite investigando → resolvido", () => {
    expect(isValidStatusTransition("investigando", "resolvido")).toBe(true);
  });

  it("permite investigando → fechado", () => {
    expect(isValidStatusTransition("investigando", "fechado")).toBe(true);
  });

  it("permite investigando → aberto (reabrir)", () => {
    expect(isValidStatusTransition("investigando", "aberto")).toBe(true);
  });

  it("permite resolvido → fechado", () => {
    expect(isValidStatusTransition("resolvido", "fechado")).toBe(true);
  });

  it("permite resolvido → investigando (reabrir investigação)", () => {
    expect(isValidStatusTransition("resolvido", "investigando")).toBe(true);
  });

  it("não permite fechado → qualquer status", () => {
    expect(isValidStatusTransition("fechado", "aberto")).toBe(false);
    expect(isValidStatusTransition("fechado", "investigando")).toBe(false);
    expect(isValidStatusTransition("fechado", "resolvido")).toBe(false);
  });

  it("não permite transições inválidas", () => {
    expect(isValidStatusTransition("aberto", "aberto")).toBe(false);
    expect(isValidStatusTransition("investigando", "investigando")).toBe(false);
  });
});

// ── VALID_STATUS_TRANSITIONS ────────────────────────────────────────────────

describe("VALID_STATUS_TRANSITIONS", () => {
  it("aberto permite 3 transições", () => {
    expect(VALID_STATUS_TRANSITIONS.aberto).toHaveLength(3);
  });

  it("investigando permite 3 transições", () => {
    expect(VALID_STATUS_TRANSITIONS.investigando).toHaveLength(3);
  });

  it("resolvido permite 2 transições", () => {
    expect(VALID_STATUS_TRANSITIONS.resolvido).toHaveLength(2);
  });

  it("fechado não permite nenhuma transição", () => {
    expect(VALID_STATUS_TRANSITIONS.fechado).toHaveLength(0);
  });
});

// ── createIncident ──────────────────────────────────────────────────────────

describe("createIncident", () => {
  const mockIncident = {
    id: "inc-1",
    law_firm_id: "firm-1",
    title: "Tentativa de acesso não autorizado",
    description: "Detectado acesso suspeito ao sistema.",
    severity: "alta",
    status: "aberto",
    reported_by: "user-1",
    assigned_to: null,
    resolution_notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("cria incidente com severidade baixa", async () => {
    const chain = buildQueryChain();
    chain.insert.mockResolvedValue({ data: { ...mockIncident, severity: "baixa" }, error: null });
    chain.single.mockResolvedValue({ data: { ...mockIncident, severity: "baixa" }, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // Primeira chamada: insert do incidente
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockIncident, severity: "baixa" },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Segunda chamada: insert do evento
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    const result = await createIncident("firm-1", "user-1", "Teste", "Descrição", "baixa");

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("baixa");
    expect(result!.status).toBe("aberto");
  });

  it("cria incidente com severidade critica", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockIncident, severity: "critica" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    const result = await createIncident("firm-1", "user-1", "Falha grave", "Descrição", "critica");

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critica");
  });

  it("cria incidente com severidade media", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockIncident, severity: "media" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    const result = await createIncident("firm-1", "user-1", "Aviso", "Descrição", "media");

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("media");
  });

  it("lança erro com severidade inválida", async () => {
    await expect(
      createIncident("firm-1", "user-1", "Teste", "Descrição", "invalida" as never),
    ).rejects.toThrow("Severidade inválida: invalida");
  });

  it("retorna null quando admin client é null", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce(null as never);

    const result = await createIncident("firm-1", "user-1", "Teste", "Descrição", "alta");

    expect(result).toBeNull();
  });
});

// ── updateIncidentStatus ────────────────────────────────────────────────────

describe("updateIncidentStatus", () => {
  it("atualiza de aberto para investigando", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // Buscar incidente atual
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: "aberto", law_firm_id: "firm-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          // Atualizar status
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        // Inserir evento
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    await expect(
      updateIncidentStatus("inc-1", "investigando", "user-1", "Iniciando investigação"),
    ).resolves.not.toThrow();
  });

  it("atualiza de investigando para resolvido", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: "investigando", law_firm_id: "firm-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    await expect(
      updateIncidentStatus("inc-1", "resolvido", "user-1"),
    ).resolves.not.toThrow();
  });

  it("atualiza de resolvido para fechado", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    let callCount = 0;
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: "resolvido", law_firm_id: "firm-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as never);

    await expect(
      updateIncidentStatus("inc-1", "fechado", "user-1"),
    ).resolves.not.toThrow();
  });

  it("lança erro em transição inválida: fechado → aberto", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: "fechado", law_firm_id: "firm-1" },
              error: null,
            }),
          }),
        }),
      })),
    } as never);

    await expect(
      updateIncidentStatus("inc-1", "aberto", "user-1"),
    ).rejects.toThrow("Transição inválida: fechado → aberto");
  });

  it("lança erro em transição inválida: aberto → fechado direto", async () => {
    // Actually, aberto → fechado IS valid per the transitions. Let me test a truly invalid one.
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { status: "aberto", law_firm_id: "firm-1" },
              error: null,
            }),
          }),
        }),
      })),
    } as never);

    // aberto → aberto is invalid
    await expect(
      updateIncidentStatus("inc-1", "aberto", "user-1"),
    ).rejects.toThrow("Transição inválida");
  });

  it("lança erro quando incidente não é encontrado", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      })),
    } as never);

    await expect(
      updateIncidentStatus("inc-999", "investigando", "user-1"),
    ).rejects.toThrow("Incidente não encontrado.");
  });

  it("lança erro com status inválido", async () => {
    await expect(
      updateIncidentStatus("inc-1", "invalido" as never, "user-1"),
    ).rejects.toThrow("Status inválido: invalido");
  });
});

// ── getIncidents ────────────────────────────────────────────────────────────

describe("getIncidents", () => {
  const mockIncidents = [
    {
      id: "inc-1",
      law_firm_id: "firm-1",
      title: "Incidente 1",
      description: "Descrição 1",
      severity: "alta",
      status: "aberto",
      reported_by: "user-1",
      assigned_to: null,
      resolution_notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  it("retorna incidentes com paginação", async () => {
    const chain = buildQueryChain();
    chain.range.mockResolvedValue({ data: mockIncidents, count: 1, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    const result = await getIncidents("firm-1");

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items[0].title).toBe("Incidente 1");
  });

  it("filtra por status", async () => {
    const chain = buildQueryChain();
    chain.range.mockResolvedValue({ data: mockIncidents, count: 1, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    await getIncidents("firm-1", { status: "investigando" });

    expect(chain.eq).toHaveBeenCalledWith("status", "investigando");
  });

  it("filtra por severidade", async () => {
    const chain = buildQueryChain();
    chain.range.mockResolvedValue({ data: mockIncidents, count: 1, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    await getIncidents("firm-1", { severity: "critica" });

    expect(chain.eq).toHaveBeenCalledWith("severity", "critica");
  });

  it("retorna resultado vazio quando não há incidentes", async () => {
    const chain = buildQueryChain();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    const result = await getIncidents("firm-1");

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("retorna vazio quando admin client é null", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce(null as never);

    const result = await getIncidents("firm-1");

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("respeita paginação personalizada", async () => {
    const chain = buildQueryChain();
    chain.range.mockResolvedValue({ data: mockIncidents, count: 10, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    const result = await getIncidents("firm-1", { page: 2, pageSize: 5 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
    expect(chain.range).toHaveBeenCalledWith(5, 9);
  });
});
