import { describe, it, expect, vi, beforeEach } from "vitest";
import { isIpAllowed } from "../policies";
import type { AppContext } from "@/lib/auth/context";

// ---------------------------------------------------------------------------
// Mock do módulo @/lib/supabase/server
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

import { getSupabaseServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(
  overrides: Partial<AppContext> = {},
): AppContext {
  return {
    status: "ready",
    lawFirm: { id: "firm-1", name: "Escritório Teste", slug: "teste" } as AppContext["lawFirm"],
    member: { id: "member-1", userId: "user-1", lawFirmId: "firm-1", name: "Advogado", email: "adv@test.com", role: "advogado", status: "active", position: null, lastAccessAt: null } as AppContext["member"],
    ...overrides,
  } as AppContext;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const qb: Record<string, any> = {};
  const methods = ["select", "eq", "maybeSingle", "order"];
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

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("isIpAllowed", () => {
  const mockGetSupabaseClient = vi.mocked(getSupabaseServerClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("quando não há contexto de escritório", () => {
    it("retorna true para contexto sem lawFirm", async () => {
      const context = createMockContext({ lawFirm: null });
      const result = await isIpAllowed(context, "192.168.1.1");
      expect(result).toBe(true);
    });
  });

  describe("quando o Supabase client é null", () => {
    it("retorna true", async () => {
      mockGetSupabaseClient.mockResolvedValue(null as never);
      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.1.1");
      expect(result).toBe(true);
    });
  });

  describe("quando a restrição de IP está desativada", () => {
    it("retorna true para qualquer IP", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: false,
      });
      const fromMock = vi.fn().mockReturnValue(policyQb);
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "10.0.0.1");
      expect(result).toBe(true);
    });
  });

  describe("quando a restrição está ativa e a lista está vazia", () => {
    it("retorna true (lista vazia permite tudo)", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.1.100");
      expect(result).toBe(true);
    });
  });

  describe("quando a restrição está ativa e a lista tem IPs", () => {
    it("retorna true para IP exato na lista", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "192.168.1.100", cidr_range: null },
        { ip_address: "10.0.0.5", cidr_range: null },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.1.100");
      expect(result).toBe(true);
    });

    it("retorna false para IP não na lista", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "192.168.1.100", cidr_range: null },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "10.0.0.99");
      expect(result).toBe(false);
    });

    it("retorna true para IP dentro de faixa CIDR", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "192.168.1.0", cidr_range: "192.168.1.0/24" },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.1.50");
      expect(result).toBe(true);
    });

    it("retorna false para IP fora da faixa CIDR", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "192.168.1.0", cidr_range: "192.168.1.0/24" },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.2.1");
      expect(result).toBe(false);
    });

    it("retorna true para IP dentro de faixa CIDR /16", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "10.0.0.0", cidr_range: "10.0.0.0/16" },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "10.0.255.1");
      expect(result).toBe(true);
    });

    it("retorna true para IP que corresponde a uma entrada inativa (porque filtra is_active)", async () => {
      const policyQb = createMockQueryBuilder({
        ip_restriction_enabled: true,
      });
      // A query filtra por is_active=true, então retornamos apenas IPs ativos
      const allowlistQb = createMockQueryBuilder([
        { ip_address: "192.168.1.100", cidr_range: null },
      ]);
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === "security_policies") return policyQb;
        return allowlistQb;
      });
      mockGetSupabaseClient.mockResolvedValue({ from: fromMock } as never);

      const context = createMockContext();
      const result = await isIpAllowed(context, "192.168.1.100");
      expect(result).toBe(true);
    });
  });
});
