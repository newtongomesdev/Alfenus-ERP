import { describe, it, expect } from "vitest";
import {
  canViewCosts,
  canViewMargin,
  canViewMemory,
  toScenarioDTO,
  toVersionDTO,
  toMemoryDTO,
  type VisibilityContext,
} from "../dto";
import type {
  PricingScenarioRow,
  PricingScenarioVersionRow,
} from "../types";

// ─── Helpers ──────────────────────────────────────────

function makeCtx(
  overrides: Partial<VisibilityContext> = {},
): VisibilityContext {
  return {
    role: "owner",
    userId: "user-1",
    isOwner: true,
    isAssisted: false,
    ...overrides,
  };
}

function makeScenarioRow(
  overrides: Partial<PricingScenarioRow> = {},
): PricingScenarioRow & Record<string, unknown> {
  return {
    id: "sc-1",
    law_firm_id: "firm-1",
    created_by: "user-1",
    name: "Cenário Teste",
    description: null,
    status: "draft",
    service_id: "svc-1",
    lead_id: null,
    client_id: null,
    active_version_id: null,
    converted_proposal_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    archived_at: null,
    ...overrides,
  } as PricingScenarioRow & Record<string, unknown>;
}

function makeVersionRow(
  overrides: Partial<PricingScenarioVersionRow> = {},
): PricingScenarioVersionRow {
  return {
    id: "ver-1",
    law_firm_id: "firm-1",
    pricing_scenario_id: "sc-1",
    created_by: "user-1",
    version_number: 1,
    scenario_type: "main",
    parameters: {},
    calculation_result: {},
    calculation_memory: {},
    currency: "BRL",
    total_amount_cents: 100000,
    entry_amount_cents: 20000,
    financed_amount_cents: 80000,
    installment_count: 6,
    success_fee_percentage_bps: 500,
    success_fee_base_cents: 100000,
    estimated_success_fee_cents: 5000,
    monthly_fee_cents: 1500,
    monthly_fee_count: 12,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── VisibilityContext ────────────────────────────────

describe("dto/VisibilityContext", () => {
  it("possui campos esperados", () => {
    const ctx = makeCtx();
    expect(ctx).toHaveProperty("role");
    expect(ctx).toHaveProperty("userId");
    expect(ctx).toHaveProperty("isOwner");
    expect(ctx).toHaveProperty("isAssisted");
  });
});

// ─── canViewCosts ─────────────────────────────────────

describe("dto/canViewCosts", () => {
  it("owner pode ver custos", () => {
    expect(canViewCosts(makeCtx({ role: "owner" }))).toBe(true);
  });

  it("lawyer pode ver custos", () => {
    expect(canViewCosts(makeCtx({ role: "lawyer" }))).toBe(true);
  });

  it("assistant não pode ver custos", () => {
    expect(canViewCosts(makeCtx({ role: "assistant" }))).toBe(false);
  });

  it("supported não pode ver custos", () => {
    expect(canViewCosts(makeCtx({ role: "supported" }))).toBe(false);
  });

  it("isAssisted bloqueia visibilidade mesmo para owner", () => {
    expect(
      canViewCosts(makeCtx({ role: "owner", isAssisted: true })),
    ).toBe(false);
  });
});

// ─── canViewMargin ────────────────────────────────────

describe("dto/canViewMargin", () => {
  it("owner pode ver margem", () => {
    expect(canViewMargin(makeCtx({ role: "owner" }))).toBe(true);
  });

  it("lawyer não pode ver margem", () => {
    expect(canViewMargin(makeCtx({ role: "lawyer" }))).toBe(false);
  });

  it("assistant não pode ver margem", () => {
    expect(canViewMargin(makeCtx({ role: "assistant" }))).toBe(false);
  });

  it("isAssisted bloqueia margem", () => {
    expect(
      canViewMargin(makeCtx({ role: "owner", isAssisted: true })),
    ).toBe(false);
  });
});

// ─── canViewMemory ────────────────────────────────────

describe("dto/canViewMemory", () => {
  it("owner pode ver memória", () => {
    expect(canViewMemory(makeCtx({ role: "owner" }))).toBe(true);
  });

  it("lawyer não pode ver memória", () => {
    expect(canViewMemory(makeCtx({ role: "lawyer" }))).toBe(false);
  });

  it("assistant não pode ver memória", () => {
    expect(canViewMemory(makeCtx({ role: "assistant" }))).toBe(false);
  });

  it("isAssisted bloqueia memória", () => {
    expect(
      canViewMemory(makeCtx({ role: "owner", isAssisted: true })),
    ).toBe(false);
  });
});

// ─── toScenarioDTO ────────────────────────────────────

describe("dto/toScenarioDTO", () => {
  it("transforma PricingScenarioRow em ScenarioDTO", () => {
    const row = makeScenarioRow({
      id: "sc-10",
      law_firm_id: "firm-2",
      name: "Meu Cenário",
      description: "Descrição",
      status: "active" as never,
      service_id: "svc-5",
      client_id: "cli-3",
      lead_id: "lead-2",
      created_by: "user-2",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-02T00:00:00.000Z",
    });
    row.active_version_id = "ver-5";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).active_version_number = 5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).latest_version_number = 8;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).item_count = 12;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).event_count = 3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).service_name = "Serviço X";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).client_name = "João";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any).lead_name = "Maria";

    const dto = toScenarioDTO(row);

    expect(dto.id).toBe("sc-10");
    expect(dto.name).toBe("Meu Cenário");
    expect(dto.description).toBe("Descrição");
    expect(dto.serviceId).toBe("svc-5");
    expect(dto.serviceName).toBe("Serviço X");
    expect(dto.clientId).toBe("cli-3");
    expect(dto.clientName).toBe("João");
    expect(dto.leadId).toBe("lead-2");
    expect(dto.leadName).toBe("Maria");
    expect(dto.activeVersionId).toBe("ver-5");
    expect(dto.activeVersionNumber).toBe(5);
    expect(dto.latestVersionNumber).toBe(8);
    expect(dto.itemCount).toBe(12);
    expect(dto.eventCount).toBe(3);
    expect(dto.status).toBe("active");
    expect(dto.createdBy).toBe("user-2");
  });

  it("usa null e 0 como defaults quando campos opcionais não existem", () => {
    const row = makeScenarioRow();
    const dto = toScenarioDTO(row);

    expect(dto.serviceName).toBeNull();
    expect(dto.clientId).toBeNull();
    expect(dto.clientName).toBeNull();
    expect(dto.leadId).toBeNull();
    expect(dto.leadName).toBeNull();
    expect(dto.activeVersionId).toBeNull();
    expect(dto.activeVersionNumber).toBeNull();
    expect(dto.latestVersionNumber).toBeNull();
    expect(dto.itemCount).toBe(0);
    expect(dto.eventCount).toBe(0);
  });
});

// ─── toVersionDTO ─────────────────────────────────────

describe("dto/toVersionDTO", () => {
  it("transforma PricingScenarioVersionRow em VersionDTO", () => {
    const row = makeVersionRow({
      id: "ver-3",
      pricing_scenario_id: "sc-1",
      version_number: 3,
      currency: "USD",
      total_amount_cents: 200000,
      entry_amount_cents: 50000,
      financed_amount_cents: 150000,
      installment_count: 10,
      success_fee_percentage_bps: 750,
      success_fee_base_cents: 200000,
      estimated_success_fee_cents: 15000,
      monthly_fee_cents: 3000,
      monthly_fee_count: 6,
      created_at: "2026-06-15T00:00:00.000Z",
      created_by: "user-1",
    } as Partial<PricingScenarioVersionRow>);

    const ctx = makeCtx();
    const dto = toVersionDTO(row, ctx);

    expect(dto.id).toBe("ver-3");
    expect(dto.scenarioId).toBe("sc-1");
    expect(dto.versionNumber).toBe(3);
    expect(dto.currency).toBe("USD");
    expect(dto.totalAmountCents).toBe(200000);
    expect(dto.entryAmountCents).toBe(50000);
    expect(dto.financedAmountCents).toBe(150000);
    expect(dto.installmentCount).toBe(10);
    expect(dto.successFeePercentageBps).toBe(750);
    expect(dto.successFeeBaseCents).toBe(200000);
    expect(dto.estimatedSuccessFeeCents).toBe(15000);
    expect(dto.monthlyFeeCents).toBe(3000);
    expect(dto.monthlyFeeCount).toBe(6);
    expect(dto.createdAt).toBe("2026-06-15T00:00:00.000Z");
    expect(dto.createdBy).toBe("user-1");
  });

  it("aceita campos nulos", () => {
    const row = makeVersionRow({
      success_fee_base_cents: null,
      estimated_success_fee_cents: null,
      monthly_fee_cents: null,
      monthly_fee_count: null,
    } as Partial<PricingScenarioVersionRow>);

    const dto = toVersionDTO(row, makeCtx());
    expect(dto.successFeeBaseCents).toBeNull();
    expect(dto.estimatedSuccessFeeCents).toBeNull();
    expect(dto.monthlyFeeCents).toBeNull();
    expect(dto.monthlyFeeCount).toBeNull();
  });
});

// ─── toMemoryDTO ──────────────────────────────────────

describe("dto/toMemoryDTO", () => {
  it("retorna null quando memoryData é null", () => {
    const result = toMemoryDTO(null, makeCtx());
    expect(result).toBeNull();
  });

  it("retorna memória quando owner", () => {
    const ctx = makeCtx({ role: "owner" });
    const memoryData = {
      version_id: "ver-1",
      calculation_memory: { steps: [{ step: "1", description: "teste" }] },
    };

    const result = toMemoryDTO(memoryData, ctx);
    expect(result).not.toBeNull();
    expect(result!.versionId).toBe("ver-1");
    expect(result!.canView).toBe(true);
    expect(result!.memory).toEqual(memoryData.calculation_memory);
  });

  it("oculta memória quando não é owner", () => {
    const ctx = makeCtx({ role: "lawyer" });
    const memoryData = {
      version_id: "ver-1",
      calculation_memory: { steps: [{ step: "1", description: "teste" }] },
    };

    const result = toMemoryDTO(memoryData, ctx);
    expect(result).not.toBeNull();
    expect(result!.canView).toBe(false);
    expect(result!.memory).toBeNull();
  });

  it("oculta memória quando isAssisted", () => {
    const ctx = makeCtx({ role: "owner", isAssisted: true });
    const memoryData = {
      version_id: "ver-1",
      calculation_memory: { obj: true },
    };

    const result = toMemoryDTO(memoryData, ctx);
    expect(result!.canView).toBe(false);
    expect(result!.memory).toBeNull();
  });
});