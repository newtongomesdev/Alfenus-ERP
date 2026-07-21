import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAllFeatureFlags,
  getFeatureFlagsForTenant,
  isFeatureEnabled,
  upsertFeatureFlag,
  setFeatureFlagOverride,
  removeFeatureFlagOverride,
} from "./feature-flags";

// ── Helper: cria um query builder falso thenable com cadeia de métodos ──────
// No Supabase, cada método da cadeia retorna o builder que também é thenable.
// Quando `await` é aplicado ao final da cadeia, `.then()` é invocado para
// resolver com `{ data, error }`.
function createQueryBuilder(returnData: unknown, error: unknown = null) {
  const result = { data: returnData, error };

  const builder: Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => unknown;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    then: vi.fn((resolve: (value: unknown) => unknown) => resolve(result)),
  };

  // Métodos de cadeia retornam o próprio builder
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);

  // Métodos terminais retornam promise resolvida
  builder.maybeSingle.mockResolvedValue(result);
  builder.upsert.mockResolvedValue(result);

  return builder;
}

const adminClientGet = getSupabaseAdminClient as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Testes ──────────────────────────────────────────────────────────────────

describe("feature-flags", () => {
  // ─── getAllFeatureFlags ────────────────────────────────────────────────────
  describe("getAllFeatureFlags", () => {
    it("retorna flags mapeadas corretamente", async () => {
      const dbRows = [
        {
          id: "f1",
          key: "dark_mode",
          name: "Modo Escuro",
          description: "Ativa tema escuro",
          enabled_by_default: true,
          is_global: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "f2",
          key: "beta_features",
          name: "Beta",
          description: null,
          enabled_by_default: false,
          is_global: false,
          created_at: "2025-02-01T00:00:00Z",
          updated_at: "2025-02-02T00:00:00Z",
        },
      ];

      const qb = createQueryBuilder(dbRows);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      const result = await getAllFeatureFlags();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "f1",
        key: "dark_mode",
        name: "Modo Escuro",
        description: "Ativa tema escuro",
        enabledByDefault: true,
        isGlobal: true,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      });
      expect(result[1].enabledByDefault).toBe(false);
      expect(result[1].isGlobal).toBe(false);

      expect(qb.select).toHaveBeenCalledWith("*");
      expect(qb.order).toHaveBeenCalledWith("key");
    });

    it("retorna array vazio quando não há flags", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      const result = await getAllFeatureFlags();
      expect(result).toEqual([]);
    });
  });

  // ─── getFeatureFlagsForTenant ──────────────────────────────────────────────
  describe("getFeatureFlagsForTenant", () => {
    it("combina flags com overrides do tenant", async () => {
      const dbFlags = [
        {
          id: "f1",
          key: "dark_mode",
          name: "Modo Escuro",
          description: "Desc",
          enabled_by_default: true,
          is_global: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "f2",
          key: "beta",
          name: "Beta",
          description: null,
          enabled_by_default: false,
          is_global: false,
          created_at: "2025-02-01T00:00:00Z",
          updated_at: "2025-02-02T00:00:00Z",
        },
      ];

      const dbOverrides = [
        { flag_id: "f1", enabled: false, law_firm_id: "tenant-1" },
      ];

      const flagsQb = createQueryBuilder(dbFlags);
      const overridesQb = createQueryBuilder(dbOverrides);

      const fromMock = vi.fn();
      fromMock.mockImplementation((table: string) => {
        if (table === "feature_flags") return flagsQb;
        return overridesQb;
      });

      adminClientGet.mockReturnValue({ from: fromMock });

      const result = await getFeatureFlagsForTenant("tenant-1");

      expect(result).toHaveLength(2);
      // f1 tem override → false
      expect(result[0].overrideEnabled).toBe(false);
      // f2 não tem override → null
      expect(result[1].overrideEnabled).toBeNull();

      expect(overridesQb.eq).toHaveBeenCalledWith("law_firm_id", "tenant-1");
    });

    it("retorna overrideEnabled null quando não há overrides", async () => {
      const dbFlags = [
        {
          id: "f1",
          key: "only_flag",
          name: "Única",
          description: null,
          enabled_by_default: true,
          is_global: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(createQueryBuilder(dbFlags));
      fromMock.mockReturnValueOnce(createQueryBuilder(null));

      adminClientGet.mockReturnValue({ from: fromMock });

      const result = await getFeatureFlagsForTenant("tenant-2");
      expect(result[0].overrideEnabled).toBeNull();
    });
  });

  // ─── isFeatureEnabled ──────────────────────────────────────────────────────
  describe("isFeatureEnabled", () => {
    it("retorna false quando a flag não existe", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      const result = await isFeatureEnabled("nonexistent");
      expect(result).toBe(false);
      expect(qb.eq).toHaveBeenCalledWith("key", "nonexistent");
      expect(qb.maybeSingle).toHaveBeenCalled();
    });

    it("retorna enabled_by_default quando não há lawFirmId", async () => {
      const qb = createQueryBuilder({ id: "f1", enabled_by_default: true });
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      const result = await isFeatureEnabled("dark_mode");
      expect(result).toBe(true);
    });

    it("retorna enabled_by_default false quando flag existe mas está desativada por padrão", async () => {
      const qb = createQueryBuilder({ id: "f1", enabled_by_default: false });
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      const result = await isFeatureEnabled("beta");
      expect(result).toBe(false);
    });

    it("retorna override quando lawFirmId é fornecido e override existe", async () => {
      const flagQb = createQueryBuilder({ id: "f1", enabled_by_default: false });
      const overrideQb = createQueryBuilder({ enabled: true });

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(flagQb);
      fromMock.mockReturnValueOnce(overrideQb);

      adminClientGet.mockReturnValue({ from: fromMock });

      const result = await isFeatureEnabled("dark_mode", "tenant-1");
      expect(result).toBe(true);
      expect(overrideQb.eq).toHaveBeenCalledWith("flag_id", "f1");
      expect(overrideQb.eq).toHaveBeenCalledWith("law_firm_id", "tenant-1");
    });

    it("retorna enabled_by_default quando lawFirmId é fornecido mas não há override", async () => {
      const flagQb = createQueryBuilder({ id: "f1", enabled_by_default: true });
      const overrideQb = createQueryBuilder(null);

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(flagQb);
      fromMock.mockReturnValueOnce(overrideQb);

      adminClientGet.mockReturnValue({ from: fromMock });

      const result = await isFeatureEnabled("dark_mode", "tenant-no-override");
      expect(result).toBe(true);
    });

    it("retorna false quando override desativa a feature", async () => {
      const flagQb = createQueryBuilder({ id: "f1", enabled_by_default: true });
      const overrideQb = createQueryBuilder({ enabled: false });

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(flagQb);
      fromMock.mockReturnValueOnce(overrideQb);

      adminClientGet.mockReturnValue({ from: fromMock });

      const result = await isFeatureEnabled("dark_mode", "tenant-disabled");
      expect(result).toBe(false);
    });
  });

  // ─── upsertFeatureFlag ────────────────────────────────────────────────────
  describe("upsertFeatureFlag", () => {
    it("chama upsert com dados corretos usando defaults", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await upsertFeatureFlag("new_feature", { name: "Nova Feature" });

      expect(qb.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "new_feature",
          name: "Nova Feature",
          description: null,
          enabled_by_default: false,
          is_global: true,
        }),
        { onConflict: "key" }
      );
    });

    it("chama upsert com todos os campos fornecidos", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await upsertFeatureFlag("custom_feat", {
        name: "Feature Customizada",
        description: "Descrição detalhada",
        enabledByDefault: true,
        isGlobal: false,
      });

      expect(qb.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "custom_feat",
          name: "Feature Customizada",
          description: "Descrição detalhada",
          enabled_by_default: true,
          is_global: false,
        }),
        { onConflict: "key" }
      );
    });

    it("lança erro quando upsert retorna erro", async () => {
      const qb = createQueryBuilder(null, { message: "DB error" });
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await expect(
        upsertFeatureFlag("failing", { name: "Falha" })
      ).rejects.toThrow();
    });
  });

  // ─── setFeatureFlagOverride ────────────────────────────────────────────────
  describe("setFeatureFlagOverride", () => {
    it("chama upsert com dados corretos no override", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await setFeatureFlagOverride("flag-1", "tenant-1", true);

      expect(qb.upsert).toHaveBeenCalledWith(
        {
          flag_id: "flag-1",
          law_firm_id: "tenant-1",
          enabled: true,
        },
        { onConflict: "flag_id,law_firm_id" }
      );
    });

    it("chama upsert para desativar override", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await setFeatureFlagOverride("flag-1", "tenant-2", false);

      expect(qb.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
        { onConflict: "flag_id,law_firm_id" }
      );
    });

    it("lança erro quando upsert retorna erro", async () => {
      const qb = createQueryBuilder(null, { message: "Constraint violation" });
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await expect(
        setFeatureFlagOverride("f1", "t1", true)
      ).rejects.toThrow();
    });
  });

  // ─── removeFeatureFlagOverride ─────────────────────────────────────────────
  describe("removeFeatureFlagOverride", () => {
    it("chama delete com filtros corretos", async () => {
      const qb = createQueryBuilder(null);
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await removeFeatureFlagOverride("flag-1", "tenant-1");

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith("flag_id", "flag-1");
      expect(qb.eq).toHaveBeenCalledWith("law_firm_id", "tenant-1");
    });

    it("lança erro quando delete retorna erro", async () => {
      const qb = createQueryBuilder(null, { message: "Delete failed" });
      adminClientGet.mockReturnValue({ from: vi.fn().mockReturnValue(qb) });

      await expect(
        removeFeatureFlagOverride("f1", "t1")
      ).rejects.toThrow();
    });
  });

  // ─── Exceção quando admin client é null ────────────────────────────────────
  describe("quando admin client é null", () => {
    it("lança erro em getAllFeatureFlags", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(getAllFeatureFlags()).rejects.toThrow("Admin client not available");
    });

    it("lança erro em getFeatureFlagsForTenant", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(getFeatureFlagsForTenant("t1")).rejects.toThrow("Admin client not available");
    });

    it("lança erro em isFeatureEnabled", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(isFeatureEnabled("key")).rejects.toThrow("Admin client not available");
    });

    it("lança erro em upsertFeatureFlag", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(upsertFeatureFlag("key", { name: "x" })).rejects.toThrow("Admin client not available");
    });

    it("lança erro em setFeatureFlagOverride", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(setFeatureFlagOverride("f1", "t1", true)).rejects.toThrow("Admin client not available");
    });

    it("lança erro em removeFeatureFlagOverride", async () => {
      adminClientGet.mockReturnValue(null);
      await expect(removeFeatureFlagOverride("f1", "t1")).rejects.toThrow("Admin client not available");
    });
  });
});
