import { describe, it, expect } from "vitest";
import {
  pricingScenarioStatusSchema,
  pricingScenarioTypeSchema,
  pricingItemTypeSchema,
  pricingEventTypeSchema,
  pricingScenarioSchema,
  pricingScenarioFilterSchema,
  pricingParametersSchema,
  pricingCalculationResultSchema,
  pricingCalculationMemorySchema,
  pricingScenarioVersionSchema,
  pricingScenarioItemSchema,
  setActiveVersionSchema,
  duplicateScenarioSchema,
} from "../schemas";

describe("pricing/schemas — Enums", () => {
  it("pricingScenarioStatusSchema aceita valores válidos", () => {
    expect(pricingScenarioStatusSchema.safeParse("draft").success).toBe(true);
    expect(pricingScenarioStatusSchema.safeParse("saved").success).toBe(true);
    expect(pricingScenarioStatusSchema.safeParse("archived").success).toBe(true);
    expect(pricingScenarioStatusSchema.safeParse("converted_to_proposal").success).toBe(true);
  });

  it("pricingScenarioStatusSchema rejeita valores inválidos", () => {
    expect(pricingScenarioStatusSchema.safeParse("invalid").success).toBe(false);
    expect(pricingScenarioStatusSchema.safeParse("DRAFT").success).toBe(false);
    expect(pricingScenarioStatusSchema.safeParse("").success).toBe(false);
  });

  it("pricingScenarioTypeSchema aceita valores válidos", () => {
    expect(pricingScenarioTypeSchema.safeParse("conservative").success).toBe(true);
    expect(pricingScenarioTypeSchema.safeParse("main").success).toBe(true);
    expect(pricingScenarioTypeSchema.safeParse("expanded").success).toBe(true);
    expect(pricingScenarioTypeSchema.safeParse("custom").success).toBe(true);
  });

  it("pricingScenarioTypeSchema rejeita valores inválidos", () => {
    expect(pricingScenarioTypeSchema.safeParse("standard").success).toBe(false);
    expect(pricingScenarioTypeSchema.safeParse("agressivo").success).toBe(false);
  });

  it("pricingItemTypeSchema aceita todos os 12 tipos", () => {
    const types = [
      "work_hours", "direct_expense", "indirect_expense",
      "third_party_cost", "travel", "hearing",
      "activity", "fee", "tax",
      "adjustment", "discount", "other",
    ];
    for (const t of types) {
      expect(pricingItemTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("pricingEventTypeSchema aceita todos os 14 eventos", () => {
    const events = [
      "scenario_created", "scenario_updated", "scenario_duplicated",
      "scenario_archived", "scenario_restored", "version_created",
      "version_activated", "comparison_generated", "memory_viewed",
      "memory_printed", "memory_exported", "conversion_started",
      "conversion_completed", "conversion_failed",
    ];
    for (const e of events) {
      expect(pricingEventTypeSchema.safeParse(e).success).toBe(true);
    }
  });
});

describe("pricing/schemas — Scenario", () => {
  it("pricingScenarioSchema aceita dados válidos", () => {
    const result = pricingScenarioSchema.safeParse({
      name: "Cenário Teste",
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioSchema rejeita nome vazio", () => {
    const result = pricingScenarioSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("pricingScenarioSchema rejeita nome muito longo", () => {
    const result = pricingScenarioSchema.safeParse({
      name: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("pricingScenarioSchema aceita campos opcionais", () => {
    const result = pricingScenarioSchema.safeParse({
      name: "Teste",
      description: "Descrição",
      service_id: "550e8400-e29b-41d4-a716-446655440000",
      lead_id: null,
      client_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioSchema rejeita campos desconhecidos (strict)", () => {
    const result = pricingScenarioSchema.safeParse({
      name: "Teste",
      unknown_field: "value",
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — Filter", () => {
  it("pricingScenarioFilterSchema aceita filtros parciais", () => {
    const result = pricingScenarioFilterSchema.safeParse({
      status: "draft",
      search: "teste",
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioFilterSchema aceita vazio", () => {
    const result = pricingScenarioFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("pricingScenarioFilterSchema rejeita status inválido", () => {
    const result = pricingScenarioFilterSchema.safeParse({
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — Parameters", () => {
  it("pricingParametersSchema aceita objeto vazio", () => {
    const result = pricingParametersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("pricingParametersSchema aceita service_snapshot completo", () => {
    const result = pricingParametersSchema.safeParse({
      service_snapshot: {
        name: "Consulta",
        practice_area: "civel",
        charging_model: "fixo",
        duration_unit: "dias",
        estimated_duration: 5,
        estimated_hours: null,
        reference_value_cents: 500000,
        min_value_cents: null,
        max_value_cents: null,
        default_upfront_cents: null,
        default_installments: null,
        success_fee_percentage: null,
        scope_included: null,
        scope_excluded: null,
        included_expenses: null,
        excluded_expenses: null,
        required_documents: null,
        suggested_steps: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it("pricingParametersSchema rejeita campos desconhecidos", () => {
    const result = pricingParametersSchema.safeParse({
      unknown: "value",
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — CalculationResult", () => {
  it("pricingCalculationResultSchema aceita objeto vazio", () => {
    const result = pricingCalculationResultSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("pricingCalculationResultSchema aceita breakdown válido", () => {
    const result = pricingCalculationResultSchema.safeParse({
      base_fee_cents: 500000,
      expenses_cents: 10000,
      total_fee_cents: 510000,
      breakdown: [
        { label: "Honorário", value_cents: 500000 },
        { label: "Despesas", value_cents: 10000, description: "Custas" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("pricingCalculationResultSchema rejeita campos desconhecidos", () => {
    const result = pricingCalculationResultSchema.safeParse({
      total: 500000,
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — CalculationMemory", () => {
  it("pricingCalculationMemorySchema aceita objeto vazio", () => {
    const result = pricingCalculationMemorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("pricingCalculationMemorySchema aceita estrutura completa", () => {
    const result = pricingCalculationMemorySchema.safeParse({
      inputs: { hours: 20, rate: 30000 },
      steps: [
        { step: "1", description: "Cálculo base", value: 600000 },
        { step: "2", description: "Despesas", value: 10000 },
      ],
      assumptions: ["Taxa padrão do mercado"],
      warnings: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("pricing/schemas — Version", () => {
  it("pricingScenarioVersionSchema aceita dados válidos", () => {
    const result = pricingScenarioVersionSchema.safeParse({
      pricing_scenario_id: "550e8400-e29b-41d4-a716-446655440000",
      scenario_type: "main",
      parameters: {},
      calculation_result: {},
      calculation_memory: {},
      total_amount_cents: 500000,
      entry_amount_cents: 100000,
      financed_amount_cents: 400000,
      installment_count: 6,
      success_fee_percentage_bps: 0,
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioVersionSchema rejeita entrada > total", () => {
    const result = pricingScenarioVersionSchema.safeParse({
      pricing_scenario_id: "550e8400-e29b-41d4-a716-446655440000",
      scenario_type: "main",
      parameters: {},
      calculation_result: {},
      calculation_memory: {},
      total_amount_cents: 100000,
      entry_amount_cents: 200000,
      financed_amount_cents: 0,
      installment_count: 0,
      success_fee_percentage_bps: 0,
    });
    expect(result.success).toBe(false);
  });

  it("pricingScenarioVersionSchema rejeita bps > 10000", () => {
    const result = pricingScenarioVersionSchema.safeParse({
      pricing_scenario_id: "550e8400-e29b-41d4-a716-446655440000",
      scenario_type: "main",
      parameters: {},
      calculation_result: {},
      calculation_memory: {},
      total_amount_cents: 0,
      entry_amount_cents: 0,
      financed_amount_cents: 0,
      installment_count: 0,
      success_fee_percentage_bps: 10001,
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — Item", () => {
  it("pricingScenarioItemSchema aceita dados válidos", () => {
    const result = pricingScenarioItemSchema.safeParse({
      item_type: "work_hours",
      description: "20h de trabalho",
      quantity: 20,
      unit_amount_cents: 30000,
      total_amount_cents: 600000,
      order_index: 0,
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioItemSchema aceita quantity zero", () => {
    const result = pricingScenarioItemSchema.safeParse({
      item_type: "fee",
      description: "Honorário",
      quantity: 0,
      unit_amount_cents: 0,
      total_amount_cents: 0,
      order_index: 0,
    });
    expect(result.success).toBe(true);
  });

  it("pricingScenarioItemSchema rejeita description vazia", () => {
    const result = pricingScenarioItemSchema.safeParse({
      item_type: "fee",
      description: "",
      quantity: 1,
      unit_amount_cents: 100,
      total_amount_cents: 100,
      order_index: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — SetActiveVersion", () => {
  it("setActiveVersionSchema aceita dados válidos", () => {
    const result = setActiveVersionSchema.safeParse({
      scenario_id: "550e8400-e29b-41d4-a716-446655440000",
      version_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("setActiveVersionSchema rejeita IDs inválidos", () => {
    const result = setActiveVersionSchema.safeParse({
      scenario_id: "invalid",
      version_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(false);
  });
});

describe("pricing/schemas — Duplicate", () => {
  it("duplicateScenarioSchema aceita dados válidos", () => {
    const result = duplicateScenarioSchema.safeParse({
      source_scenario_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("duplicateScenarioSchema aceita novo nome", () => {
    const result = duplicateScenarioSchema.safeParse({
      source_scenario_id: "550e8400-e29b-41d4-a716-446655440000",
      new_name: "Cenário Copiado",
    });
    expect(result.success).toBe(true);
  });
});
