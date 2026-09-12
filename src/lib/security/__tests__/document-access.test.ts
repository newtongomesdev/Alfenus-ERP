import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

// Cadeia de query mockada: select → eq → eq → order → limit → range
function buildQueryChain(result?: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.single = vi.fn();
  // Torna a chain "thenable" para simular o fetch do Supabase
  if (result) {
    (chain as any).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
  }
  return chain;
}

let queryChain: ReturnType<typeof buildQueryChain>;

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => queryChain),
  })),
}));

import {
  logDocumentAccess,
  getDocumentAccessLogs,
  getDocumentAccessStats,
} from "../document-access";

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  queryChain = buildQueryChain();
});

// ── logDocumentAccess ───────────────────────────────────────────────────────

describe("logDocumentAccess", () => {
  it("insere um registro de acesso com todos os campos", async () => {
    await logDocumentAccess(
      "firm-1",
      "user-1",
      "doc-1",
      "view",
      {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        details: { source: "menu" },
      },
    );

    expect(queryChain.insert).toHaveBeenCalledWith({
      law_firm_id: "firm-1",
      user_id: "user-1",
      document_id: "doc-1",
      action: "view",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0",
      metadata: { source: "menu" },
    });
  });

  it("insere registro para ação de download", async () => {
    await logDocumentAccess("firm-1", "user-1", "doc-1", "download");

    expect(queryChain.insert).toHaveBeenCalledWith({
      law_firm_id: "firm-1",
      user_id: "user-1",
      document_id: "doc-1",
      action: "download",
      ip_address: null,
      user_agent: null,
      metadata: {},
    });
  });

  it("insere registro para ação de edit", async () => {
    await logDocumentAccess("firm-1", "user-1", "doc-1", "edit");

    expect(queryChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "edit" }),
    );
  });

  it("insere registro para ação de share", async () => {
    await logDocumentAccess("firm-1", "user-1", "doc-1", "share");

    expect(queryChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "share" }),
    );
  });
});

// ── getDocumentAccessLogs ───────────────────────────────────────────────────

describe("getDocumentAccessLogs", () => {
  it("retorna logs filtrados por escritório", async () => {
    const mockLogs = [
      {
        id: "log-1",
        law_firm_id: "firm-1",
        user_id: "user-1",
        document_id: "doc-1",
        action: "view",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = buildQueryChain({ data: mockLogs, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    const logs = await getDocumentAccessLogs("firm-1");

    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe("log-1");
    expect(logs[0].action).toBe("view");
    expect(logs[0].lawFirmId).toBe("firm-1");
    expect(chain.eq).toHaveBeenCalledWith("law_firm_id", "firm-1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  it("filtra por documentId quando informado", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = buildQueryChain({ data: [], error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    await getDocumentAccessLogs("firm-1", "doc-5");

    expect(chain.eq).toHaveBeenCalledWith("document_id", "doc-5");
  });

  it("respeita o limite personalizado", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = buildQueryChain({ data: [], error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    await getDocumentAccessLogs("firm-1", undefined, 10);

    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("retorna array vazio quando não há dados", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = buildQueryChain({ data: null, error: null });
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => chain),
    } as never);

    const logs = await getDocumentAccessLogs("firm-1");

    expect(logs).toEqual([]);
  });

  it("retorna array vazio quando admin client é null", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce(null as never);

    const logs = await getDocumentAccessLogs("firm-1");

    expect(logs).toEqual([]);
  });
});

// ── getDocumentAccessStats ──────────────────────────────────────────────────

describe("getDocumentAccessStats", () => {
  it("calcula estatísticas corretamente com múltiplos acessos", async () => {
    const mockLogs = [
      { document_id: "doc-1", user_id: "user-1", action: "view" },
      { document_id: "doc-1", user_id: "user-2", action: "download" },
      { document_id: "doc-2", user_id: "user-1", action: "view" },
      { document_id: "doc-1", user_id: "user-1", action: "edit" },
      { document_id: "doc-3", user_id: "user-3", action: "share" },
    ];

    // queryChain.select retorna a query chain, e depois precisamos resolver
    // A cadeia é: from().select().eq() → retorna queryChain, que é thenable via Promise
    queryChain.select.mockReturnValue(queryChain);
    // eq precisa ser chamado e depois a query final precisa ser awaitable
    // Vamos fazer a chain retornar a promise final
    const finalChain = buildQueryChain();
    finalChain.select.mockReturnValue(finalChain);
    finalChain.eq.mockResolvedValue({ data: mockLogs, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => finalChain),
    } as never);

    const stats = await getDocumentAccessStats("firm-1");

    expect(stats.totalAccesses).toBe(5);

    // Doc-1 é o mais acessado (3 acessos)
    expect(stats.mostAccessedDocs[0]).toEqual({
      documentId: "doc-1",
      accessCount: 3,
    });

    // User-1 é o mais ativo (3 acessos)
    expect(stats.activeUsers[0]).toEqual({
      userId: "user-1",
      accessCount: 3,
    });

    // Contagem por ação
    expect(stats.accessesByAction).toEqual({
      view: 2,
      download: 1,
      edit: 1,
      share: 1,
    });
  });

  it("retorna estatísticas vazias quando não há acessos", async () => {
    const finalChain = buildQueryChain();
    finalChain.select.mockReturnValue(finalChain);
    finalChain.eq.mockResolvedValue({ data: [], error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => finalChain),
    } as never);

    const stats = await getDocumentAccessStats("firm-1");

    expect(stats.totalAccesses).toBe(0);
    expect(stats.mostAccessedDocs).toEqual([]);
    expect(stats.activeUsers).toEqual([]);
    expect(stats.accessesByAction).toEqual({
      view: 0,
      download: 0,
      edit: 0,
      share: 0,
    });
  });

  it("retorna estatísticas vazias quando admin client é null", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce(null as never);

    const stats = await getDocumentAccessStats("firm-1");

    expect(stats.totalAccesses).toBe(0);
    expect(stats.mostAccessedDocs).toEqual([]);
    expect(stats.activeUsers).toEqual([]);
  });

  it("limita documentos mais acessados a 10", async () => {
    const mockLogs = Array.from({ length: 15 }, (_, i) => ({
      document_id: `doc-${i}`,
      user_id: "user-1",
      action: "view" as const,
    }));

    const finalChain = buildQueryChain();
    finalChain.select.mockReturnValue(finalChain);
    finalChain.eq.mockResolvedValue({ data: mockLogs, error: null });

    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(getSupabaseAdminClient).mockReturnValueOnce({
      from: vi.fn(() => finalChain),
    } as never);

    const stats = await getDocumentAccessStats("firm-1");

    expect(stats.mostAccessedDocs.length).toBeLessThanOrEqual(10);
    expect(stats.activeUsers.length).toBeLessThanOrEqual(10);
  });
});
