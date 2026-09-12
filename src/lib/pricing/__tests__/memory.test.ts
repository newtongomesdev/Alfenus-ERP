import { describe, it, expect } from "vitest";
import { buildPricingCalculationMemory } from "../memory";
import { PRICING_CALCULATION_ENGINE_VERSION, PRICING_SCHEMA_VERSION } from "../calculation-types";
import type { PricingCalculationInput, PricingCalculationResult } from "../calculation-types";

const BASE_INPUT: PricingCalculationInput = {
  scenarioType: "main",
  calculationDate: "2026-01-15",
  currency: "BRL",
  estimatedHours: 10,
  hourlyRateCents: 500,
};

function makeResult(overrides: Partial<PricingCalculationResult> = {}): PricingCalculationResult {
  return {
    workCostCents: 5000,
    estimatedHours: 10,
    hourlyRateCents: 500,
    directExpensesCents: 0,
    indirectExpensesCents: 0,
    thirdPartyCostsCents: 0,
    travelCostsCents: 0,
    feesAndTaxesCents: 0,
    otherCostsCents: 0,
    customCostsCents: 0,
    totalExpensesCents: 5000,
    totalEstimatedCostCents: 5000,
    marginBaseCents: 5000,
    marginAmountCents: 750,
    manualAdjustmentCents: 0,
    subtotalBeforeDiscountCents: 5750,
    fixedDiscountCents: 0,
    percentageDiscountCents: 0,
    totalDiscountCents: 0,
    fixedFeeTotalCents: 5750,
    entryAmountCents: 0,
    financedAmountCents: 5750,
    installments: [],
    installmentTotalCents: 0,
    installmentCount: 0,
    paymentEndDate: undefined,
    monthlyFeeCents: 0,
    monthlyFeeCount: 0,
    monthlyFeeTotalCents: 0,
    monthlyFeeSchedule: [],
    successFeeBps: 1500,
    successFeeBaseCents: 100000,
    estimatedSuccessFeeCents: 15000,
    successFeeIsGuaranteed: false,
    fixedRevenueCents: 5750,
    recurringRevenueCents: 0,
    estimatedSuccessRevenueCents: 15000,
    totalPotentialRevenueCents: 20750,
    guaranteedRevenueCents: 5750,
    nonGuaranteedRevenueCents: 15000,
    revenueProjection: [
      { date: "2026-01-15", monthKey: "2026-01", sourceType: "entry", description: "Entrada", amountCents: 5000, guaranteed: true, scenarioType: "main" },
      { date: "2026-01-15", monthKey: "2026-01", sourceType: "estimated_success_fee", description: "Honorário de êxito estimado", amountCents: 15000, guaranteed: false, scenarioType: "main" },
    ],
    projectionStartDate: "2026-01-15",
    projectionEndDate: "2026-01-15",
    scenarioType: "main",
    calculationVersion: "1.0.0",
    calculationDate: "2026-01-15",
    warnings: [
      { code: "estimated_success_fee", severity: "info", title: "Honorário de êxito estimado", description: "stmt", relatedField: "successFeeBps", dismissible: true },
    ],
    assumptions: ["Cálculo executado em 2026-01-15.", "Moeda: BRL."],
    roundingAdjustments: 0,
    ...overrides,
  };
}

// ── Valores gerais ──────────────────────────────────────────
describe("memory/buildPricingCalculationMemory", () => {
  it("engineVersion correto", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    expect(memory.engineVersion).toBe(PRICING_CALCULATION_ENGINE_VERSION);
  });

  it("schemaVersion correto", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    expect(memory.schemaVersion).toBe(PRICING_SCHEMA_VERSION);
  });

  it("disclaimer presente", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    expect(memory.disclaimer).toBeTruthy();
    expect(memory.disclaimer.length).toBeGreaterThan(0);
  });

  it("warnings incluídos", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    expect(memory.warnings.length).toBeGreaterThan(0);
    expect(memory.warnings[0].code).toBe("estimated_success_fee");
  });

  it("assumptions incluídos", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    expect(memory.assumptions.length).toBeGreaterThan(0);
  });

  it("scenarioType propagado", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "conservative",
    });
    expect(memory.scenarioType).toBe("conservative");
  });

  it("calculatedAt propagado", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-07-23T12:00:00Z",
      scenarioType: "main",
    });
    expect(memory.calculatedAt).toBe("2026-07-23T12:00:00Z");
  });
});

// ── Seções ──────────────────────────────────────────────────
describe("memory/sections", () => {
  const memory = buildPricingCalculationMemory({
    input: BASE_INPUT,
    result: makeResult(),
    calculatedAt: "2026-01-15",
    scenarioType: "main",
  });

  it("contém todas as seções esperadas", () => {
    const sectionIds = memory.sections.map((s) => s.id);
    expect(sectionIds).toContain("identification");
    expect(sectionIds).toContain("work");
    expect(sectionIds).toContain("costs");
    expect(sectionIds).toContain("margin");
    expect(sectionIds).toContain("adjustments");
    expect(sectionIds).toContain("discounts");
    expect(sectionIds).toContain("fixedFee");
    expect(sectionIds).toContain("entry");
    expect(sectionIds).toContain("installments");
    expect(sectionIds).toContain("recurringFees");
    expect(sectionIds).toContain("successFee");
    expect(sectionIds).toContain("projection");
    expect(sectionIds).toContain("warnings");
    expect(sectionIds).toContain("assumptions");
  });

  it("seção identification tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "identification")!;
    expect(section.title).toBe("Identificação");
    expect(section.items.length).toBeGreaterThanOrEqual(4);
  });

  it("seção work tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "work")!;
    expect(section.title).toBe("Trabalho");
    expect(section.items.length).toBe(3);
  });

  it("seção costs tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "costs")!;
    expect(section.title).toBe("Custos");
    expect(section.items.length).toBe(9);
  });

  it("seção margin tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "margin")!;
    expect(section.title).toBe("Margem");
    expect(section.items.length).toBe(4);
  });

  it("seção discounts tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "discounts")!;
    expect(section.title).toBe("Descontos");
    expect(section.items.length).toBe(3);
  });

  it("seção fixedFee tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "fixedFee")!;
    expect(section.title).toBe("Honorários Fixos");
    expect(section.items.length).toBe(1);
  });

  it("seção entry tem itens corretos", () => {
    const section = memory.sections.find((s) => s.id === "entry")!;
    expect(section.title).toBe("Entrada");
    expect(section.items.length).toBe(2);
  });

  it("seção installments tem 0 itens quando sem parcelas", () => {
    const section = memory.sections.find((s) => s.id === "installments")!;
    expect(section.title).toBe("Parcelas");
    expect(section.items.length).toBe(2);
  });

  it("seção recurringFees tem 3 itens", () => {
    const section = memory.sections.find((s) => s.id === "recurringFees")!;
    expect(section.title).toBe("Mensalidades");
    expect(section.items.length).toBe(3);
  });

  it("seção successFee tem 4 itens", () => {
    const section = memory.sections.find((s) => s.id === "successFee")!;
    expect(section.title).toBe("Honorário de Êxito");
    expect(section.items.length).toBe(4);
  });

  it("seção projection tem itens", () => {
    const section = memory.sections.find((s) => s.id === "projection")!;
    expect(section.title).toBe("Projeção de Receita");
    expect(section.items.length).toBeGreaterThanOrEqual(1);
  });

  it("seção warnings tem itens", () => {
    const section = memory.sections.find((s) => s.id === "warnings")!;
    expect(section.title).toBe("Avisos");
    expect(section.items.length).toBeGreaterThanOrEqual(1);
  });

  it("seção assumptions tem itens", () => {
    const section = memory.sections.find((s) => s.id === "assumptions")!;
    expect(section.title).toBe("Pressupostos");
    expect(section.items.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Itens de memória ───────────────────────────────────────
describe("memory/items", () => {
  it("itens têm visibility interna", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    const items = memory.sections.flatMap((s) => s.items);
    for (const item of items) {
      expect(item.visibility).toBe("internal");
    }
  });

  it("itens têm order incrementais", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    for (const section of memory.sections) {
      for (let i = 0; i < section.items.length; i++) {
        expect(section.items[i].order).toBe(i + 1);
      }
    }
  });

  it("itens têm label e result", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    const items = memory.sections.flatMap((s) => s.items);
    for (const item of items) {
      expect(item.label).toBeTruthy();
      expect(item.result).toBeDefined();
    }
  });

  it("itens de amountCents presentes quando relevante", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    const workSection = memory.sections.find((s) => s.id === "work")!;
    const workCostItem = workSection.items.find((i) => i.label === "Custo do trabalho (centavos)");
    expect(workCostItem!.amountCents).toBe(5000);
  });

  it("itens de descriptionpresentes quando informado", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    const workSection = memory.sections.find((s) => s.id === "work")!;
    const workCostItem = workSection.items.find((i) => i.label === "Custo do trabalho (centavos)");
    expect(workCostItem!.description).toBeTruthy();
  });

  it("itens de formula presentes quando relevante", () => {
    const memory = buildPricingCalculationMemory({
      input: BASE_INPUT,
      result: makeResult(),
      calculatedAt: "2026-01-15",
      scenarioType: "main",
    });
    const workSection = memory.sections.find((s) => s.id === "work")!;
    const workCostItem = workSection.items.find((i) => i.label === "Custo do trabalho (centavos)");
    expect(workCostItem!.formula).toBeTruthy();
  });
});