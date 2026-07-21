import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/admin/plan-limits", () => ({
  getLimitsForPlan: vi.fn(),
}));

import {
  getPlanFeatures,
  hasFeature,
  checkLimit,
  getUsage,
  DEFAULT_PLAN_FEATURES,
} from "./billing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getLimitsForPlan } from "@/lib/admin/plan-limits";

const mockGetSupabaseServerClient = vi.mocked(getSupabaseServerClient);
const mockGetSupabaseAdminClient = vi.mocked(getSupabaseAdminClient);
const mockGetLimitsForPlan = vi.mocked(getLimitsForPlan);

function buildChain(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: result, error: null }),
  };
}

function buildCountChain(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    count,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getPlanFeatures ────────────────────────────────────────────────

describe("getPlanFeatures", () => {
  it("retorna defaults do plano starter quando firm não tem plano definido", async () => {
    const firmChain = buildChain({ plan: null });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);
    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await getPlanFeatures("firm-1");

    expect(result.maxMembers).toBe(5);
    expect(result.maxClients).toBe(50);
    expect(result.maxDocumentsStorageMb).toBe(500);
    expect(result.maxContracts).toBe(100);
    expect(result.hasAiFeatures).toBe(false);
  });

  it("retorna defaults do plano professional corretamente", async () => {
    const firmChain = buildChain({ plan: "professional" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);
    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 15,
      max_clients: 500,
      max_documents_storage_mb: 5000,
      max_contracts: -1,
      max_cases: -1,
    } as never);

    const result = await getPlanFeatures("firm-2");

    expect(result.hasAiFeatures).toBe(true);
    expect(result.hasPwa).toBe(true);
    expect(result.hasLgpd).toBe(true);
    expect(result.hasTicketing).toBe(false);
  });

  it("retorna defaults do plano business corretamente", async () => {
    const firmChain = buildChain({ plan: "business" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);
    mockGetLimitsForPlan.mockResolvedValue({
      max_members: -1,
      max_clients: -1,
      max_documents_storage_mb: -1,
      max_contracts: -1,
      max_cases: -1,
    } as never);

    const result = await getPlanFeatures("firm-3");

    expect(result.hasTicketing).toBe(true);
    expect(result.hasRiskManagement).toBe(true);
    expect(result.hasLegalRequests).toBe(true);
  });

  it("usa plan-limits quando disponíveis, sobrescrevendo defaults", async () => {
    const firmChain = buildChain({ plan: "starter" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);
    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 10,
      max_clients: 200,
      max_documents_storage_mb: 1000,
      max_contracts: 200,
      max_cases: 50,
    } as never);

    const result = await getPlanFeatures("firm-4");

    expect(result.maxMembers).toBe(10);
    expect(result.maxClients).toBe(200);
    expect(result.maxDocumentsStorageMb).toBe(1000);
    expect(result.maxContracts).toBe(200);
  });
});

// ─── hasFeature ─────────────────────────────────────────────────────

describe("hasFeature", () => {
  it("retorna false quando supabase é null", async () => {
    mockGetSupabaseServerClient.mockResolvedValue(null);

    const result = await hasFeature("firm-1", "ai-features");

    expect(result).toBe(false);
  });

  it("retorna false quando a flag não existe", async () => {
    const flagChain = buildChain(null);
    const supabase = { from: vi.fn().mockReturnValue(flagChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await hasFeature("firm-1", "inexistente");

    expect(result).toBe(false);
  });

  it("retorna enabled_by_default quando não há override", async () => {
    const flagChain = buildChain({ id: "flag-1", enabled_by_default: true });
    const overrideChain = buildChain(null);
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(flagChain)
        .mockReturnValueOnce(overrideChain),
    };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await hasFeature("firm-1", "ai-features");

    expect(result).toBe(true);
  });

  it("retorna false quando enabled_by_default é false e não há override", async () => {
    const flagChain = buildChain({ id: "flag-2", enabled_by_default: false });
    const overrideChain = buildChain(null);
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(flagChain)
        .mockReturnValueOnce(overrideChain),
    };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await hasFeature("firm-1", "lgpd");

    expect(result).toBe(false);
  });

  it("retorna valor do override quando existe", async () => {
    const flagChain = buildChain({ id: "flag-1", enabled_by_default: false });
    const overrideChain = buildChain({ enabled: true });
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(flagChain)
        .mockReturnValueOnce(overrideChain),
    };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await hasFeature("firm-1", "ai-features");

    expect(result).toBe(true);
  });

  it("retorna false quando override desabilita feature habilitada por padrão", async () => {
    const flagChain = buildChain({ id: "flag-1", enabled_by_default: true });
    const overrideChain = buildChain({ enabled: false });
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(flagChain)
        .mockReturnValueOnce(overrideChain),
    };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await hasFeature("firm-1", "ai-features");

    expect(result).toBe(false);
  });
});

// ─── checkLimit ─────────────────────────────────────────────────────

describe("checkLimit", () => {
  it("retorna allowed=false quando supabase é null", async () => {
    mockGetSupabaseServerClient.mockResolvedValue(null);

    const result = await checkLimit("firm-1", "max_members", 3);

    expect(result).toEqual({ allowed: false, limit: 0, current: 3 });
  });

  it("retorna allowed=false quando firm não existe", async () => {
    const firmChain = buildChain(null);
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await checkLimit("firm-inexistente", "max_members", 3);

    expect(result).toEqual({ allowed: false, limit: 0, current: 3 });
  });

  it("retorna allowed=false quando adminClient é null", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);
    mockGetSupabaseAdminClient.mockReturnValue(null);

    const result = await checkLimit("firm-1", "max_members", 3);

    expect(result).toEqual({ allowed: false, limit: 0, current: 3 });
  });

  it("retorna allowed=true quando currentValue < limit", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain(null);
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await checkLimit("firm-1", "max_members", 3);

    expect(result).toEqual({ allowed: true, limit: 5, current: 3 });
  });

  it("retorna allowed=false quando currentValue >= limit", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain(null);
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await checkLimit("firm-1", "max_members", 5);

    expect(result).toEqual({ allowed: false, limit: 5, current: 5 });
  });

  it("retorna allowed=true quando currentValue > limit", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain(null);
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await checkLimit("firm-1", "max_members", 10);

    expect(result).toEqual({ allowed: false, limit: 5, current: 10 });
  });

  it("retorna allowed=true quando limit é -1 (ilimitado)", async () => {
    const firmChain = buildChain({ plan: "professional", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain(null);
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 15,
      max_clients: 500,
      max_documents_storage_mb: 5000,
      max_contracts: -1,
      max_cases: -1,
    } as never);

    const result = await checkLimit("firm-1", "max_contracts", 9999);

    expect(result).toEqual({ allowed: true, limit: -1, current: 9999 });
  });

  it("respeita override do tenant (override_value definido)", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain({ override_value: 20 });
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await checkLimit("firm-1", "max_members", 10);

    expect(result).toEqual({ allowed: true, limit: 20, current: 10 });
  });

  it("override -1 (ilimitado) tem prioridade sobre limit do plano", async () => {
    const firmChain = buildChain({ plan: "starter", id: "firm-1" });
    const supabase = { from: vi.fn().mockReturnValue(firmChain) };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const overrideChain = buildChain({ override_value: -1 });
    const adminClient = { from: vi.fn().mockReturnValue(overrideChain) };
    mockGetSupabaseAdminClient.mockReturnValue(adminClient as never);

    mockGetLimitsForPlan.mockResolvedValue({
      max_members: 5,
      max_clients: 50,
      max_documents_storage_mb: 500,
      max_contracts: 100,
      max_cases: 100,
    } as never);

    const result = await checkLimit("firm-1", "max_members", 100);

    expect(result).toEqual({ allowed: true, limit: -1, current: 100 });
  });
});

// ─── getUsage ───────────────────────────────────────────────────────

describe("getUsage", () => {
  it("retorna null quando supabase é null", async () => {
    mockGetSupabaseServerClient.mockResolvedValue(null);

    const result = await getUsage("firm-1");

    expect(result).toBeNull();
  });

  it("retorna contagens corretas", async () => {
    const membersChain = buildCountChain(8);
    const clientsChain = buildCountChain(25);
    const contractsChain = buildCountChain(12);
    const casesChain = buildCountChain(3);

    const fromMock = vi.fn()
      .mockReturnValueOnce(membersChain)
      .mockReturnValueOnce(clientsChain)
      .mockReturnValueOnce(contractsChain)
      .mockReturnValueOnce(casesChain);

    const supabase = { from: fromMock };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await getUsage("firm-1");

    expect(result).toEqual({
      members: 8,
      clients: 25,
      contracts: 12,
      cases: 3,
    });
  });

  it("retorna 0 quando counts são null", async () => {
    const membersChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), count: null };
    const clientsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), count: null };
    const contractsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), count: null };
    const casesChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), count: null };

    const fromMock = vi.fn()
      .mockReturnValueOnce(membersChain)
      .mockReturnValueOnce(clientsChain)
      .mockReturnValueOnce(contractsChain)
      .mockReturnValueOnce(casesChain);

    const supabase = { from: fromMock };
    mockGetSupabaseServerClient.mockResolvedValue(supabase as never);

    const result = await getUsage("firm-1");

    expect(result).toEqual({
      members: 0,
      clients: 0,
      contracts: 0,
      cases: 0,
    });
  });
});

// ─── DEFAULT_PLAN_FEATURES ──────────────────────────────────────────

describe("DEFAULT_PLAN_FEATURES", () => {
  it("contém os três planos: starter, professional, business", () => {
    expect(DEFAULT_PLAN_FEATURES).toHaveProperty("starter");
    expect(DEFAULT_PLAN_FEATURES).toHaveProperty("professional");
    expect(DEFAULT_PLAN_FEATURES).toHaveProperty("business");
  });

  it("starter tem hasAiFeatures=false e hasTicketing=false", () => {
    expect(DEFAULT_PLAN_FEATURES.starter.hasAiFeatures).toBe(false);
    expect(DEFAULT_PLAN_FEATURES.starter.hasTicketing).toBe(false);
  });

  it("professional tem hasAiFeatures=true e hasTicketing=false", () => {
    expect(DEFAULT_PLAN_FEATURES.professional.hasAiFeatures).toBe(true);
    expect(DEFAULT_PLAN_FEATURES.professional.hasTicketing).toBe(false);
  });

  it("business tem hasTicketing=true", () => {
    expect(DEFAULT_PLAN_FEATURES.business.hasTicketing).toBe(true);
  });
});
