import { describe, it, expect } from "vitest";
import {
  pricingInputToVersionPayload,
  pricingResultToVersionItems,
  pricingMemoryToVersionPayload,
  pricingVersionToCalculationResult,
  pricingVersionToCalculationInput,
  pricingItemsToCustomCostItems,
  normalizePricingInput,
  generateInputHash,
} from "../adapters";
import type { PricingCalculationInput, PricingCalculationResult, PricingCalculationMemory } from "../calculation-types";
import type { PricingScenarioVersionRow, PricingScenarioItemRow } from "../types";

const BASE_INPUT: PricingCalculationInput = {
  scenarioType: "main",
  calculationDate: "2026-01-15",
  currency: "BRL",
  estimatedHours: 10,
  hourlyRateCents: 500,
  marginBps: 1500,
  entryAmountCents: 1000,
  installmentCount: 3,
};

function makeResult(): PricingCalculationResult {
  return {
    workCostCents: 5000,
    estimatedHours: 10,
    hourlyRateCents: 500,
    directExpensesCents: 1000,
    indirectExpensesCents: 0,
    thirdPartyCostsCents: 0,
    travelCostsCents: 0,
    feesAndTaxesCents: 0,
    otherCostsCents: 0,
    customCostsCents: 0,
    totalExpensesCents: 6000,
    totalEstimatedCostCents: 6000,
    marginBaseCents: 6000,
    marginAmountCents: 900,
    manualAdjustmentCents: 0,
    subtotalBeforeDiscountCents: 6900,
    fixedDiscountCents: 0,
    percentageDiscountCents: 0,
    totalDiscountCents: 0,
    fixedFeeTotalCents: 6900,
    entryAmountCents: 1000,
    financedAmountCents: 5900,
    installments: [
      { number: 1, amountCents: 1967, dueDate: "2026-02-15", principalCents: 1967, roundingAdjustmentCents: 0, status: "pending" },
      { number: 2, amountCents: 1967, dueDate: "2026-03-15", principalCents: 1967, roundingAdjustmentCents: 0, status: "pending" },
      { number: 3, amountCents: 1966, dueDate: "2026-04-15", principalCents: 1966, roundingAdjustmentCents: -1, status: "pending" },
    ],
    installmentTotalCents: 5900,
    installmentCount: 3,
    paymentEndDate: "2026-04-15",
    monthlyFeeCents: 0,
    monthlyFeeCount: 0,
    monthlyFeeTotalCents: 0,
    monthlyFeeSchedule: [],
    successFeeBps: 1000,
    successFeeBaseCents: 100000,
    estimatedSuccessFeeCents: 10000,
    successFeeIsGuaranteed: false,
    fixedRevenueCents: 6900,
    recurringRevenueCents: 0,
    estimatedSuccessRevenueCents: 10000,
    totalPotentialRevenueCents: 16900,
    guaranteedRevenueCents: 6900,
    nonGuaranteedRevenueCents: 10000,
    revenueProjection: [],
    projectionStartDate: "2026-01-15",
    projectionEndDate: "2026-04-15",
    scenarioType: "main",
    calculationVersion: "1.0.0",
    calculationDate: "2026-01-15",
    warnings: [],
    assumptions: ["Cálculo executado em 2026-01-15."],
    roundingAdjustments: 1,
  };
}

function makeMemory(): PricingCalculationMemory {
  return {
    engineVersion: "1.0.0",
    schemaVersion: "1",
    calculatedAt: "2026-01-15",
    scenarioType: "main",
    sections: [],
    warnings: [],
    assumptions: ["Cálculo executado em 2026-01-15."],
    disclaimer: "Este cálculo é uma estimativa.",
  };
}

// ── pricingInputToVersionPayload ────────────────────────────
describe("adapters/pricingInputToVersionPayload", () => {
  it("cria payload a partir de input e resultado", () => {
    const payload = pricingInputToVersionPayload({
      input: BASE_INPUT,
      result: makeResult(),
      memory: makeMemory(),
      lawFirmId: "firm-001",
      pricingScenarioId: "sc-001",
      createdBy: "user-001",
      versionNumber: 1,
    });
    expect(payload.law_firm_id).toBe("firm-001");
    expect(payload.pricing_scenario_id).toBe("sc-001");
    expect(payload.created_by).toBe("user-001");
    expect(payload.version_number).toBe(1);
    expect(payload.scenario_type).toBe("main");
    expect(payload.currency).toBe("BRL");
    expect(payload.total_amount_cents).toBe(6900);
    expect(payload.entry_amount_cents).toBe(1000);
    expect(payload.financed_amount_cents).toBe(5900);
    expect(payload.installment_count).toBe(3);
    expect(payload.success_fee_percentage_bps).toBe(1000);
    expect(payload.estimated_success_fee_cents).toBe(10000);
  });
});

// ── pricingResultToVersionItems ─────────────────────────────
describe("adapters/pricingResultToVersionItems", () => {
  it("cria itens para resultado com custos, trabalha e parcelas", () => {
    const items = pricingResultToVersionItems({
      result: makeResult(),
      lawFirmId: "firm-001",
      scenarioVersionId: "v1",
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].law_firm_id).toBe("firm-001");
    expect(items[0].scenario_version_id).toBe("v1");
    expect(items.some((i) => i.item_type === "work_hours")).toBe(true);
    expect(items.some((i) => i.item_type === "fee")).toBe(true);
  });

  it("itens têm order_index sequential", () => {
    const items = pricingResultToVersionItems({
      result: makeResult(),
      lawFirmId: "firm-001",
      scenarioVersionId: "v1",
    });
    const indices = items.map((i) => i.order_index);
    expect(indices).toStrictEqual([...new Set(indices)]);
  });

  it("não inclui itens com valor zero", () => {
    const result = makeResult();
    result.otherCostsCents = 0;
    const items = pricingResultToVersionItems({
      result,
      lawFirmId: "firm-001",
      scenarioVersionId: "v1",
    });
    expect(items.some((i) => i.item_type === "other")).toBe(false);
  });
});

// ── pricingMemoryToVersionPayload ───────────────────────────
describe("adapters/pricingMemoryToVersionPayload", () => {
  it("serializa memória como JSON", () => {
    const payload = pricingMemoryToVersionPayload(makeMemory());
    expect(payload.engineVersion).toBe("1.0.0");
    expect(payload.schemaVersion).toBe("1");
    expect(payload.disclaimer).toBeTruthy();
  });
});

// ── pricingVersionToCalculationResult ───────────────────────
describe("adapters/pricingVersionToCalculationResult", () => {
  it("converte versão para resultado", () => {
    const version: PricingScenarioVersionRow = {
      id: "v1",
      law_firm_id: "firm-001",
      pricing_scenario_id: "sc-001",
      created_by: "user-001",
      version_number: 1,
      scenario_type: "main",
      parameters: { service_snapshot: undefined, custom_inputs: undefined },
      calculation_result: {
        workCostCents: 5000,
        estimatedHours: 10,
        hourlyRateCents: 500,
        directExpensesCents: 1000,
        indirectExpensesCents: 0,
        thirdPartyCostsCents: 0,
        travelCostsCents: 0,
        feesAndTaxesCents: 0,
        otherCostsCents: 0,
        customCostsCents: 0,
        totalExpensesCents: 6000,
        totalEstimatedCostCents: 6000,
        marginBaseCents: 6000,
        marginAmountCents: 900,
        manualAdjustmentCents: 0,
        subtotalBeforeDiscountCents: 6900,
        fixedDiscountCents: 0,
        percentageDiscountCents: 0,
        totalDiscountCents: 0,
        fixedFeeTotalCents: 6900,
        entryAmountCents: 1000,
        financedAmountCents: 5900,
        installments: [],
        installmentTotalCents: 5900,
        installmentCount: 3,
        monthlyFeeCents: 0,
        monthlyFeeCount: 0,
        monthlyFeeTotalCents: 0,
        monthlyFeeSchedule: [],
        successFeeBps: 0,
        successFeeBaseCents: 0,
        estimatedSuccessFeeCents: 0,
        successFeeIsGuaranteed: false,
        fixedRevenueCents: 6900,
        recurringRevenueCents: 0,
        estimatedSuccessRevenueCents: 0,
        totalPotentialRevenueCents: 6900,
        guaranteedRevenueCents: 6900,
        nonGuaranteedRevenueCents: 0,
        revenueProjection: [],
        projectionStartDate: "2026-01-15",
        projectionEndDate: "2026-04-15",
        scenarioType: "main",
        calculationVersion: "1.0.0",
        calculationDate: "2026-01-15",
        warnings: [],
        assumptions: [],
        roundingAdjustments: 0,
      } as unknown as Record<string, unknown>,
      calculation_memory: {} as Record<string, unknown>,
      currency: "BRL",
      total_amount_cents: 6900,
      entry_amount_cents: 1000,
      financed_amount_cents: 5900,
      installment_count: 3,
      success_fee_percentage_bps: 0,
      success_fee_base_cents: null,
      estimated_success_fee_cents: null,
      monthly_fee_cents: null,
      monthly_fee_count: null,
      created_at: "2026-01-15",
    };
    const result = pricingVersionToCalculationResult(version);
    expect(result.workCostCents).toBe(5000);
    expect(result.fixedFeeTotalCents).toBe(6900);
    expect(result.successFeeIsGuaranteed).toBe(false);
  });
});

// ── pricingVersionToCalculationInput ────────────────────────
describe("adapters/pricingVersionToCalculationInput", () => {
  it("converte versão para input", () => {
    const version: PricingScenarioVersionRow = {
      id: "v1",
      law_firm_id: "firm-001",
      pricing_scenario_id: "sc-001",
      created_by: "user-001",
      version_number: 1,
      scenario_type: "main",
      parameters: {
        service_snapshot: undefined,
        custom_inputs: { notes: "Nota" },
        notes: "Nota",
      },
      calculation_result: {} as Record<string, unknown>,
      calculation_memory: {} as Record<string, unknown>,
      currency: "BRL",
      total_amount_cents: 6900,
      entry_amount_cents: 1000,
      financed_amount_cents: 5900,
      installment_count: 3,
      success_fee_percentage_bps: 1000,
      success_fee_base_cents: 100000,
      estimated_success_fee_cents: 10000,
      monthly_fee_cents: 2000,
      monthly_fee_count: 12,
      created_at: "2026-01-15",
    };
    const input = pricingVersionToCalculationInput(version);
    expect(input.scenarioType).toBe("main");
    expect(input.currency).toBe("BRL");
    expect(input.entryAmountCents).toBe(1000);
    expect(input.installmentCount).toBe(3);
    expect(input.successFeeBps).toBe(1000);
    expect(input.monthlyFeeCents).toBe(2000);
  });
});

// ── pricingItemsToCustomCostItems ───────────────────────────
describe("adapters/pricingItemsToCustomCostItems", () => {
  it("filtra apenas itens com includedInClientPrice", () => {
    const items: PricingScenarioItemRow[] = [
      {
        id: "1", law_firm_id: "f", scenario_version_id: "v",
        item_type: "fee", description: "Teste", quantity: 1,
        unit_amount_cents: 100, total_amount_cents: 100,
        order_index: 0, metadata: { includedInClientPrice: true },
        created_at: "2026-01-15",
      },
      {
        id: "2", law_firm_id: "f", scenario_version_id: "v",
        item_type: "fee", description: "Teste 2", quantity: 1,
        unit_amount_cents: 200, total_amount_cents: 200,
        order_index: 1, metadata: { includedInClientPrice: false },
        created_at: "2026-01-15",
      },
    ];
    const result = pricingItemsToCustomCostItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("retorna vazio para sem itens", () => {
    expect(pricingItemsToCustomCostItems([])).toHaveLength(0);
  });
});

// ── normalizePricingInput ──────────────────────────────────
describe("adapters/normalizePricingInput", () => {
  it("normaliza input com valores padrão", () => {
    const result = normalizePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
    });
    expect(result.estimatedHours).toBe(0);
    expect(result.hourlyRateCents).toBe(0);
    expect(result.marginBps).toBe(0);
  });

  it("normaliza input com valores completos", () => {
    const result = normalizePricingInput(BASE_INPUT);
    expect(result.estimatedHours).toBe(10);
    expect(result.hourlyRateCents).toBe(500);
    expect(result.marginBps).toBe(1500);
  });
});

// ── generateInputHash ──────────────────────────────────────
describe("adapters/generateInputHash", () => {
  it("gera hash determinístico", () => {
    const input = normalizePricingInput(BASE_INPUT);
    const hash1 = generateInputHash(input);
    const hash2 = generateInputHash(input);
    expect(hash1).toBe(hash2);
  });

  it("gera hash diferente para inputs diferentes", () => {
    const input1 = normalizePricingInput({ ...BASE_INPUT, estimatedHours: 10 });
    const input2 = normalizePricingInput({ ...BASE_INPUT, estimatedHours: 20 });
    expect(generateInputHash(input1)).not.toBe(generateInputHash(input2));
  });

  it("hash começa com v1-", () => {
    const input = normalizePricingInput(BASE_INPUT);
    expect(generateInputHash(input)).toMatch(/^v1-/);
  });
});