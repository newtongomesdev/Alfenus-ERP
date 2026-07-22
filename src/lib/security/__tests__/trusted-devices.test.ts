import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseUserAgent,
  createTrustedDevice,
  verifyTrustedDevice,
  revokeTrustedDevice,
} from "../trusted-devices";

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
// parseUserAgent
// ---------------------------------------------------------------------------
describe("parseUserAgent", () => {
  it("analisa Chrome no Windows corretamente", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Chrome",
      os: "Windows 10+",
      device: "Desktop",
    });
  });

  it("analisa Safari no macOS corretamente", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Safari",
      os: "macOS",
      device: "Desktop",
    });
  });

  it("analisa Firefox no Linux corretamente", () => {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Firefox",
      os: "Linux",
      device: "Desktop",
    });
  });

  it("analisa Chrome mobile no Android corretamente", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Chrome",
      os: "Android",
      device: "Mobile",
    });
  });

  it("retorna 'Desconhecido' para user agent desconhecido", () => {
    const ua = "SomeUnknownBot/1.0";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Desconhecido",
      os: "Desconhecido",
      device: "Desktop",
    });
  });

  it("analisa Edge no Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Edge",
      os: "Windows 10+",
      device: "Desktop",
    });
  });

  it("analisa iPad (User-Agent contém 'Mobile' e 'Mac OS X')", () => {
    // Nota: o parser detecta "mac os x" antes de "ipad" no OS,
    // e "mobile" (de "Mobile/15E148") antes de "ipad" no device.
    // Este teste documenta o comportamento real do parser.
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Safari",
      os: "macOS",
      device: "Mobile",
    });
  });

  it("analisa Windows 8.1", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result).toEqual({
      browser: "Chrome",
      os: "Windows 8.1",
      device: "Desktop",
    });
  });
});

// ---------------------------------------------------------------------------
// createTrustedDevice
// ---------------------------------------------------------------------------
describe("createTrustedDevice", () => {
  it("cria dispositivo com campos corretos", async () => {
    const deviceData = {
      id: "dev-1",
      user_id: "user-1",
      law_firm_id: "firm-1",
      device_hash: "abc123hash",
      browser_name: "Chrome",
      os_name: "Windows 10+",
      device_type: "Desktop",
      ip_address: "192.168.1.1",
      trusted_until: "2025-02-01T00:00:00Z",
      last_seen_at: "2025-01-01T00:00:00Z",
      revoked_at: null,
      status: "ativo",
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(deviceData);
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(insertQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await createTrustedDevice("user-1", "firm-1", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ipAddress: "192.168.1.1",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("dev-1");
    expect(result!.userId).toBe("user-1");
    expect(result!.lawFirmId).toBe("firm-1");
    expect(result!.browserName).toBe("Chrome");
    expect(result!.osName).toBe("Windows 10+");
    expect(result!.deviceType).toBe("Desktop");
    expect(result!.ipAddress).toBe("192.168.1.1");
    expect(result!.status).toBe("ativo");
  });

  it("retorna null quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await createTrustedDevice("user-1", "firm-1", {
      userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
    });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// verifyTrustedDevice
// ---------------------------------------------------------------------------
describe("verifyTrustedDevice", () => {
  it("retorna true para dispositivo ativo e não expirado", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const queryQb = createMockQueryBuilder({
      id: "dev-1",
      law_firm_id: "firm-1",
      trusted_until: futureDate,
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

    const result = await verifyTrustedDevice("user-1", "dev-hash-123");
    expect(result).toBe(true);
  });

  it("retorna false para dispositivo expirado", async () => {
    const pastDate = "2020-01-01T00:00:00Z";
    const queryQb = createMockQueryBuilder(null); // gt filtra → nada retornado

    mockFrom.mockReturnValueOnce(queryQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await verifyTrustedDevice("user-1", "dev-hash-expired");
    expect(result).toBe(false);
  });

  it("retorna false para dispositivo revogado", async () => {
    // Status 'ativo' não retorna dispositivos revogados
    const queryQb = createMockQueryBuilder(null);

    mockFrom.mockReturnValueOnce(queryQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await verifyTrustedDevice("user-1", "dev-hash-revoked");
    expect(result).toBe(false);
  });

  it("retorna false quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await verifyTrustedDevice("user-1", "dev-hash");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// revokeTrustedDevice
// ---------------------------------------------------------------------------
describe("revokeTrustedDevice", () => {
  it("define status como 'revogado' ao revogar dispositivo", async () => {
    const selectQb = createMockQueryBuilder({
      id: "dev-1",
      law_firm_id: "firm-1",
      user_id: "user-1",
    });
    const updateQb = createMockQueryBuilder(null);
    const logQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb)
      .mockReturnValue(logQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeTrustedDevice("dev-1", "user-1");

    // Verifica que update foi chamado com status 'revogado'
    expect(updateQb.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "revogado" })
    );
  });

  it("não faz nada quando dispositivo não existe", async () => {
    const selectQb = createMockQueryBuilder(null);
    const updateQb = createMockQueryBuilder(null);

    mockFrom
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await revokeTrustedDevice("nonexistent-dev", "user-1");

    // update não deve ser chamado quando device não existe
    expect(updateQb.update).not.toHaveBeenCalled();
  });

  it("não faz nada quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    // Não deve lançar erro
    await revokeTrustedDevice("dev-1", "user-1");
  });
});
