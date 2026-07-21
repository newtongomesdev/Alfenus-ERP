import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPlanLimits,
  getLimitsForPlan,
  checkPlanLimit,
  upsertPlanLimit,
  deletePlanLimit,
} from "./plan-limits";

// ---------------------------------------------------------------------------
// Mock do módulo @/lib/supabase/admin
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Helper: cria um query builder encadeável com stubs para cada método
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(returnData: unknown = null, error: unknown = null) {
  const qb: Record<string, any> = {};

  const methods = [
    "select",
    "eq",
    "maybeSingle",
    "order",
    "upsert",
    "delete",
  ];

  const lastResult = {
    data: returnData,
    error,
  };

  for (const method of methods) {
    qb[method] = vi.fn().mockReturnValue(qb);
  }

  qb.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    try {
      resolve(lastResult);
    } catch (e) {
      if (reject) reject(e);
    }
  };

  return qb;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("plan-limits", () => {
  const mockGetAdminClient = vi.mocked(getSupabaseAdminClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Teste 11: Funções lançam erro quando admin client é null ----

  describe("quando admin client é null", () => {
    it("getPlanLimits lança erro", async () => {
      mockGetAdminClient.mockReturnValue(null as never);
      await expect(getPlanLimits()).rejects.toThrow("Admin client not available");
    });

    it("getLimitsForPlan lança erro", async () => {
      mockGetAdminClient.mockReturnValue(null as never);
      await expect(getLimitsForPlan("plan-1")).rejects.toThrow(
        "Admin client not available",
      );
    });

    it("checkPlanLimit lança erro", async () => {
      mockGetAdminClient.mockReturnValue(null as never);
      await expect(
        checkPlanLimit("firm-1", "users", 1),
      ).rejects.toThrow("Admin client not available");
    });

    it("upsertPlanLimit lança erro", async () => {
      mockGetAdminClient.mockReturnValue(null as never);
      await expect(
        upsertPlanLimit("plan-1", "users", 10),
      ).rejects.toThrow("Admin client not available");
    });

    it("deletePlanLimit lança erro", async () => {
      mockGetAdminClient.mockReturnValue(null as never);
      await expect(
        deletePlanLimit("plan-1", "users"),
      ).rejects.toThrow("Admin client not available");
    });
  });

  // ---- Teste 2: getPlanLimits retorna limites mapeados ----

  describe("getPlanLimits", () => {
    it("retorna limites mapeados corretamente", async () => {
      const fakeRows = [
        {
          id: "1",
          plan_id: "plan-basic",
          limit_key: "users",
          limit_value: 5,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "2",
          plan_id: "plan-basic",
          limit_key: "cases",
          limit_value: 50,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      const qb = createMockQueryBuilder(fakeRows);
      mockGetAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(qb) } as never);

      const result = await getPlanLimits();

      expect(result).toEqual([
        {
          id: "1",
          planId: "plan-basic",
          limitKey: "users",
          limitValue: 5,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
        },
        {
          id: "2",
          planId: "plan-basic",
          limitKey: "cases",
          limitValue: 50,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
        },
      ]);

      expect(qb.select).toHaveBeenCalledWith("*");
      expect(qb.order).toHaveBeenCalledWith("plan_id");
    });

    // ---- Teste 3: getPlanLimits filtra por planId quando fornecido ----

    it("filtra por planId quando fornecido", async () => {
      const qb = createMockQueryBuilder([]);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      const result = await getPlanLimits("plan-pro");

      expect(fromMock).toHaveBeenCalledWith("plan_limits");
      expect(qb.eq).toHaveBeenCalledWith("plan_id", "plan-pro");
      expect(result).toEqual([]);
    });

    it("retorna array vazio quando data é null", async () => {
      const qb = createMockQueryBuilder(null);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      const result = await getPlanLimits();

      expect(result).toEqual([]);
    });
  });

  // ---- Teste 4: getLimitsForPlan retorna Record<limitKey, limitValue> ----

  describe("getLimitsForPlan", () => {
    it("retorna Record mapeando limitKey para limitValue", async () => {
      const fakeRows = [
        {
          id: "1",
          plan_id: "plan-basic",
          limit_key: "users",
          limit_value: 5,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "2",
          plan_id: "plan-basic",
          limit_key: "cases",
          limit_value: 50,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      const qb = createMockQueryBuilder(fakeRows);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      const result = await getLimitsForPlan("plan-basic");

      expect(result).toEqual({
        users: 5,
        cases: 50,
      });
    });

    it("retorna objeto vazio quando não há limites", async () => {
      const qb = createMockQueryBuilder([]);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      const result = await getLimitsForPlan("plan-empty");

      expect(result).toEqual({});
    });
  });

  // ---- Testes 5-8: checkPlanLimit ----

  describe("checkPlanLimit", () => {
    function setupCheckPlanLimit(
      firmData: unknown,
      limitsData: unknown[],
    ) {
      // Primeira chamada: law_firms -> maybeSingle
      const firmQb = createMockQueryBuilder(
        firmData ? { data: firmData, error: null } : null,
      );
      // A chamada maybeSingle retorna { data, error } diretamente (não encadeável)
      firmQb.maybeSingle = vi.fn().mockResolvedValue({ data: firmData, error: null });

      // Segunda chamada: plan_limits (getLimitsForPlan internamente chama getPlanLimits)
      const limitsQb = createMockQueryBuilder(limitsData);
      limitsQb.then = (
        resolve: (value: { data: unknown; error: unknown }) => unknown,
      ) => resolve({ data: limitsData, error: null });

      let callCount = 0;
      const fromMock = vi.fn().mockImplementation((table: string) => {
        callCount++;
        if (table === "law_firms") return firmQb;
        return limitsQb;
      });

      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      return { firmQb, limitsQb, fromMock };
    }

    // Teste 5: Retorna allowed=false quando firma não encontrada
    it("retorna allowed=false quando firma não é encontrada", async () => {
      const { firmQb } = setupCheckPlanLimit(null, []);

      const result = await checkPlanLimit("firm-999", "users", 3);

      expect(result).toEqual({ allowed: false, limit: 0, current: 3 });
      expect(firmQb.maybeSingle).toHaveBeenCalled();
    });

    // Teste 6: Retorna allowed=true quando limite é -1 (ilimitado)
    it("retorna allowed=true quando limite é -1 (ilimitado)", async () => {
      const fakeRows = [
        {
          id: "1",
          plan_id: "plan-pro",
          limit_key: "users",
          limit_value: -1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      setupCheckPlanLimit({ plan: "plan-pro" }, fakeRows);

      const result = await checkPlanLimit("firm-1", "users", 999);

      expect(result).toEqual({ allowed: true, limit: -1, current: 999 });
    });

    // Teste 7: Retorna allowed=true quando current < limit
    it("retorna allowed=true quando current é menor que limit", async () => {
      const fakeRows = [
        {
          id: "1",
          plan_id: "plan-basic",
          limit_key: "users",
          limit_value: 10,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      setupCheckPlanLimit({ plan: "plan-basic" }, fakeRows);

      const result = await checkPlanLimit("firm-1", "users", 3);

      expect(result).toEqual({ allowed: true, limit: 10, current: 3 });
    });

    // Teste 8: Retorna allowed=false quando current >= limit
    it("retorna allowed=false quando current é maior ou igual ao limit", async () => {
      const fakeRows = [
        {
          id: "1",
          plan_id: "plan-basic",
          limit_key: "users",
          limit_value: 10,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      setupCheckPlanLimit({ plan: "plan-basic" }, fakeRows);

      // current === limit
      const resultAtLimit = await checkPlanLimit("firm-1", "users", 10);
      expect(resultAtLimit).toEqual({ allowed: false, limit: 10, current: 10 });

      // current > limit
      const resultOverLimit = await checkPlanLimit("firm-1", "users", 15);
      expect(resultOverLimit).toEqual({ allowed: false, limit: 10, current: 15 });
    });

    // Tratamento para chave inexistente (default -1)
    it("retorna allowed=true quando chave de limite não existe (default -1)", async () => {
      const fakeRows: unknown[] = [];

      setupCheckPlanLimit({ plan: "plan-basic" }, fakeRows);

      const result = await checkPlanLimit("firm-1", "nonexistent", 100);

      expect(result).toEqual({ allowed: true, limit: -1, current: 100 });
    });
  });

  // ---- Teste 9: upsertPlanLimit ----

  describe("upsertPlanLimit", () => {
    it("chama upsert com dados corretos", async () => {
      const qb = createMockQueryBuilder(null, null);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      await upsertPlanLimit("plan-basic", "users", 10);

      expect(fromMock).toHaveBeenCalledWith("plan_limits");
      expect(qb.upsert).toHaveBeenCalledTimes(1);

      const [payload, options] = qb.upsert.mock.calls[0] as [
        { plan_id: string; limit_key: string; limit_value: number; updated_at: string },
        { onConflict: string },
      ];
      expect(payload.plan_id).toBe("plan-basic");
      expect(payload.limit_key).toBe("users");
      expect(payload.limit_value).toBe(10);
      expect(options.onConflict).toBe("plan_id,limit_key");
    });

    it("lança erro quando upsert retorna erro", async () => {
      const qb = createMockQueryBuilder(null, { message: "upsert failed" });
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      await expect(
        upsertPlanLimit("plan-basic", "users", 10),
      ).rejects.toEqual({ message: "upsert failed" });
    });
  });

  // ---- Teste 10: deletePlanLimit ----

  describe("deletePlanLimit", () => {
    it("chama delete com filtros corretos", async () => {
      const qb = createMockQueryBuilder(null, null);
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      await deletePlanLimit("plan-basic", "users");

      expect(fromMock).toHaveBeenCalledWith("plan_limits");
      expect(qb.delete).toHaveBeenCalledTimes(1);
      expect(qb.eq).toHaveBeenCalledWith("plan_id", "plan-basic");
      expect(qb.eq).toHaveBeenCalledWith("limit_key", "users");
    });

    it("lança erro quando delete retorna erro", async () => {
      const qb = createMockQueryBuilder(null, { message: "delete failed" });
      const fromMock = vi.fn().mockReturnValue(qb);
      mockGetAdminClient.mockReturnValue({ from: fromMock } as never);

      await expect(
        deletePlanLimit("plan-basic", "users"),
      ).rejects.toEqual({ message: "delete failed" });
    });
  });
});
