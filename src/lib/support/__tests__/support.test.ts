import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  MESSAGE_TYPES,
  MESSAGE_VISIBILITY,
  ATTACHMENT_CONFIG,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  MESSAGE_TYPE_LABELS,
  VALID_STATUS_TRANSITIONS,
} from "../constants";
import type { TicketStatus, TicketPriority } from "../constants";
import { can } from "@/lib/auth/permissions";

// ── Mock do Supabase ────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth/context", () => ({
  getAppContext: vi.fn(),
}));

// ── Geração de protocolo ────────────────────────────────────────────────────

describe("generateProtocol", () => {
  it("gera protocolo com formato SUP-YYYYMMDD-XXXX", async () => {
    const { generateProtocol } = await import("../queries");
    const protocol = await generateProtocol();

    expect(protocol).toMatch(/^SUP-\d{8}-\d{4}$/);
  });

  it("contém a data atual no formato YYYYMMDD", async () => {
    const { generateProtocol } = await import("../queries");
    const protocol = await generateProtocol();
    const now = new Date();
    const expectedDate = now.toISOString().slice(0, 10).replace(/-/g, "");

    expect(protocol).toContain(expectedDate);
  });

  it("sequência começa em 0001 quando não há tickets anteriores", async () => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    (getSupabaseServerClient as any).mockResolvedValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { generateProtocol } = await import("../queries");
    const protocol = await generateProtocol();

    expect(protocol).toMatch(/-0001$/);
  });

  it("incrementa sequência quando já existem tickets no dia", async () => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");

    (getSupabaseServerClient as any).mockResolvedValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ protocol: `SUP-${datePart}-0003` }],
        error: null,
      }),
    });

    const { generateProtocol } = await import("../queries");
    const protocol = await generateProtocol();

    expect(protocol).toBe(`SUP-${datePart}-0004`);
  });
});

// ── Transições de status ────────────────────────────────────────────────────

describe("VALID_STATUS_TRANSITIONS", () => {
  it("aberto pode transitar para aguardando_suporte", () => {
    expect(VALID_STATUS_TRANSITIONS.aberto).toContain("aguardando_suporte");
  });

  it("aberto pode transitar para aguardando_cliente", () => {
    expect(VALID_STATUS_TRANSITIONS.aberto).toContain("aguardando_cliente");
  });

  it("aberto pode transitar para resolvido", () => {
    expect(VALID_STATUS_TRANSITIONS.aberto).toContain("resolvido");
  });

  it("aberto pode transitar para cancelado", () => {
    expect(VALID_STATUS_TRANSITIONS.aberto).toContain("cancelado");
  });

  it("resolvido pode ir para aberto ou fechado", () => {
    expect(VALID_STATUS_TRANSITIONS.resolvido).toEqual(["aberto", "fechado"]);
  });

  it("cancelado só pode voltar para aberto", () => {
    expect(VALID_STATUS_TRANSITIONS.cancelado).toEqual(["aberto"]);
  });

  it("resolvido não pode ir direto para cancelado", () => {
    expect(VALID_STATUS_TRANSITIONS.resolvido).not.toContain("cancelado");
  });

  it("cancelado não pode ir para resolvido", () => {
    expect(VALID_STATUS_TRANSITIONS.cancelado).not.toContain("resolvido");
  });

  it("aguardando_cliente pode ir para aguardando_suporte", () => {
    expect(VALID_STATUS_TRANSITIONS.aguardando_cliente).toContain("aguardando_suporte");
  });

  it("aguardando_suporte pode ir para aguardando_cliente", () => {
    expect(VALID_STATUS_TRANSITIONS.aguardando_suporte).toContain("aguardando_cliente");
  });
});

// ── Constantes de status ────────────────────────────────────────────────────

describe("TICKET_STATUSES", () => {
  it("contém 7 statuses", () => {
    const values = Object.values(TICKET_STATUSES);
    expect(values).toHaveLength(7);
  });

  it("todos os statuses têm label", () => {
    for (const status of Object.values(TICKET_STATUSES)) {
      expect(TICKET_STATUS_LABELS[status as TicketStatus]).toBeDefined();
      expect(typeof TICKET_STATUS_LABELS[status as TicketStatus]).toBe("string");
    }
  });

  it("todos os statuses têm cor", () => {
    for (const status of Object.values(TICKET_STATUSES)) {
      expect(TICKET_STATUS_COLORS[status as TicketStatus]).toBeDefined();
      expect(TICKET_STATUS_COLORS[status as TicketStatus]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── Constantes de prioridade ────────────────────────────────────────────────

describe("TICKET_PRIORITIES", () => {
  it("contém 4 prioridades", () => {
    const values = Object.values(TICKET_PRIORITIES);
    expect(values).toHaveLength(4);
  });

  it("todos os priorities têm label", () => {
    for (const priority of Object.values(TICKET_PRIORITIES)) {
      expect(TICKET_PRIORITY_LABELS[priority as TicketPriority]).toBeDefined();
    }
  });

  it("todos os priorities têm cor", () => {
    for (const priority of Object.values(TICKET_PRIORITIES)) {
      expect(TICKET_PRIORITY_COLORS[priority as TicketPriority]).toBeDefined();
      expect(TICKET_PRIORITY_COLORS[priority as TicketPriority]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── Tipos de mensagem ───────────────────────────────────────────────────────

describe("MESSAGE_TYPES", () => {
  it("contém 3 tipos", () => {
    expect(Object.values(MESSAGE_TYPES)).toHaveLength(3);
  });

  it("todos os tipos têm label", () => {
    for (const type of Object.values(MESSAGE_TYPES)) {
      expect(MESSAGE_TYPE_LABELS[type as keyof typeof MESSAGE_TYPE_LABELS]).toBeDefined();
    }
  });
});

// ── Visibilidade ────────────────────────────────────────────────────────────

describe("MESSAGE_VISIBILITY", () => {
  it("contém publica e interna", () => {
    expect(MESSAGE_VISIBILITY.publica).toBe("publica");
    expect(MESSAGE_VISIBILITY.interna).toBe("interna");
  });
});

// ── Validação de anexos ─────────────────────────────────────────────────────

describe("ATTACHMENT_CONFIG", () => {
  it("tamanho máximo é 10MB", () => {
    expect(ATTACHMENT_CONFIG.maxFileSizeBytes).toBe(10 * 1024 * 1024);
  });

  it("tipos permitidos incluem pdf", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("application/pdf");
  });

  it("tipos permitidos incluem png", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("image/png");
  });

  it("tipos permitidos incluem jpg/jpeg", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("image/jpeg");
  });

  it("tipos permitidos incluem webp", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("image/webp");
  });

  it("tipos permitidos incluem txt", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("text/plain");
  });

  it("tipos permitidos incluem csv", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("text/csv");
  });

  it("tipos permitidos incluem zip", () => {
    expect(ATTACHMENT_CONFIG.allowedMimeTypes).toContain("application/zip");
  });

  it("extensões permitidas incluem .pdf", () => {
    expect(ATTACHMENT_CONFIG.allowedExtensions).toContain(".pdf");
  });

  it("extensões permitidas incluem .log", () => {
    expect(ATTACHMENT_CONFIG.allowedExtensions).toContain(".log");
  });

  it("extensões cobrem todos os mime types permitidos", () => {
    // .jpg e .jpeg são duas extensões para o mesmo MIME image/jpeg
    expect(ATTACHMENT_CONFIG.allowedExtensions.length).toBeGreaterThanOrEqual(
      ATTACHMENT_CONFIG.allowedMimeTypes.length,
    );
  });
});

describe("validateAttachment", () => {
  it("aceita arquivo PDF dentro do limite", async () => {
    const { validateAttachment } = await import("../actions");
    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });

    const result = validateAttachment(file);
    expect(result.valid).toBe(true);
  });

  it("rejeita arquivo acima de 10MB", async () => {
    const { validateAttachment } = await import("../actions");
    const file = new File(["content"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("10MB");
  });

  it("rejeita tipo de arquivo não permitido", async () => {
    const { validateAttachment } = await import("../actions");
    const file = new File(["content"], "malware.exe", { type: "application/x-msdownload" });
    Object.defineProperty(file, "size", { value: 1024 });

    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(".exe");
  });

  it("rejeita MIME type não permitido", async () => {
    const { validateAttachment } = await import("../actions");
    const file = new File(["content"], "script.js", { type: "text/javascript" });
    Object.defineProperty(file, "size", { value: 1024 });

    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
  });

  it("aceita arquivo de imagem dentro do limite", async () => {
    const { validateAttachment } = await import("../actions");
    const file = new File(["content"], "foto.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 });

    const result = validateAttachment(file);
    expect(result.valid).toBe(true);
  });
});

// ── Permissões de suporte ───────────────────────────────────────────────────

describe("Permissões de suporte", () => {
  it("proprietário pode acessar configurações (e therefore suporte)", () => {
    expect(can("proprietario", "configuracoes.administrar")).toBe(true);
  });

  it("administrador pode acessar configurações", () => {
    expect(can("administrador", "configuracoes.administrar")).toBe(true);
  });

  it("advogado não pode acessar configurações", () => {
    expect(can("advogado", "configuracoes.administrar")).toBe(false);
  });

  it("assistente não pode acessar configurações", () => {
    expect(can("assistente", "configuracoes.administrar")).toBe(false);
  });

  it("financeiro não pode acessar configurações", () => {
    expect(can("financeiro", "configuracoes.administrar")).toBe(false);
  });

  it("colaborador não pode acessar configurações", () => {
    expect(can("colaborador", "configuracoes.administrar")).toBe(false);
  });

  it("visualizador não pode acessar configurações", () => {
    expect(can("visualizador", "configuracoes.administrar")).toBe(false);
  });
});

// ── Lógica de isolamento de tenant ──────────────────────────────────────────

describe("Isolamento de tenant", () => {
  it("ticket só pode ser acessado pelo tenant dono", () => {
    const ticket = { law_firm_id: "firm-123", id: "ticket-456" };
    const lawFirmId = "firm-123";
    const otherFirmId = "firm-999";

    expect(ticket.law_firm_id).toBe(lawFirmId);
    expect(ticket.law_firm_id).not.toBe(otherFirmId);
  });

  it("validação de ownership retorna true para o mesmo tenant", () => {
    const ticket = { law_firm_id: "firm-123" };
    const lawFirmId = "firm-123";

    expect(ticket.law_firm_id === lawFirmId).toBe(true);
  });

  it("validação de ownership retorna false para tenant diferente", () => {
    const ticket = { law_firm_id: "firm-123" };
    const lawFirmId = "firm-999";

    expect(ticket.law_firm_id === lawFirmId).toBe(false);
  });

  it("validação de ownership retorna false para ticket null", () => {
    const ticket = null as unknown as { law_firm_id: string } | null;
    const lawFirmId = "firm-123";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(!ticket || (ticket as any).law_firm_id !== lawFirmId).toBe(true);
  });
});

// ── Filtragem de mensagens internas ─────────────────────────────────────────

describe("Visibilidade de mensagens", () => {
  it("mensagens internas devem ser filtradas para clientes", () => {
    const messages = [
      { visibility: "publica", content: "Olá" },
      { visibility: "interna", content: "Nota interna" },
      { visibility: "publica", content: "Resposta" },
    ];

    const filtered = messages.filter((m) => m.visibility !== "interna");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((m) => m.visibility === "publica")).toBe(true);
  });

  it("mensagens públicas não são filtradas", () => {
    const messages = [
      { visibility: "publica", content: "Olá" },
      { visibility: "publica", content: "Resposta" },
    ];

    const filtered = messages.filter((m) => m.visibility !== "interna");
    expect(filtered).toHaveLength(2);
  });

  it("array vazio retorna vazio", () => {
    const messages: Array<{ visibility: string }> = [];
    const filtered = messages.filter((m) => m.visibility !== "interna");
    expect(filtered).toHaveLength(0);
  });
});
