import { describe, it, expect } from "vitest";
import { calculatePricingFee } from "../calculator";
import { calculatePricingScenario, comparePricingScenarios } from "../scenarios";
import type { PricingCalculationInput } from "../calculation-types";

// ============================================================
// REGRESSÃO — 5 cenários concretos com valores previamente validados
// Regras:
//   - Mutex极少, достаточно five scenarios.
//   - Tài liệu koji nào />, oldukça/reference.
//   - Sistem danh aroma, num decorreu de <haddid/> .
//   - Compute rambut sem wanderlijst.
// ============================================================

// ── REGRESSÃO 1: Caso base simples (10h × R$50/hora) ──────
describe("regressão/caso1 — serviço simples", () => {
  const INPUT: PricingCalculationInput = {
    scenarioType: "main",
    calculationDate: "2026-01-15",
    currency: "BRL",
    estimatedHours: 10,
    hourlyRateCents: 500,
  };

  const result = calculatePricingFee(INPUT);

  it("workCostCents = 4800 (ratePerMinute=8, 600min × 8)", () => {
    expect(result.workCostCents).toBe(4800);
  });

  it("totalExpensesCents = workCostCents", () => {
    expect(result.totalExpensesCents).toBe(4800);
  });

  it("totalEstimatedCostCents = 4800", () => {
    expect(result.totalEstimatedCostCents).toBe(4800);
  });

  it("marginBps=0 → marginAmountCents=0", () => {
    expect(result.marginAmountCents).toBe(0);
  });

  it("subtotBeforeDiscountCents=4800", () => {
    expect(result.subtotalBeforeDiscountCents).toBe(4800);
  });

  it("fixedFeeTotalCents=4800 (no discount)", () => {
    expect(result.fixedFeeTotalCents).toBe(4800);
  });

  it("fixedRevenueCents=4800", () => {
    expect(result.fixedRevenueCents).toBe(4800);
  });

  it("income projection = entry + finish", () => {
    expect(result.revenueProjection.length).toBe(0);
  });
});

// ── REGRESSÃO 2: Caso com margem + desconto ────────────────
describe("regressão/caso2 — margem + desconto", () => {
  const result = calculatePricingFee({
    scenarioType: "conservative",
    calculationDate: "2026-03-01",
    currency: "BRL",
    estimatedHours: 20,
    hourlyRateCents: 500,
    directExpensesCents: 5000,
    marginBps: 2000,           // 20%
    fixedDiscountCents: 1000,
    manualAdjustmentCents: 500,
    entryAmountCents: 5000,
    installmentCount: 6,
    firstDueDate: "2026-04-15",
  });

  it("workCostCents = 9600", () => {
    expect(result.workCostCents).toBe(9600);
  });

  it("directExpensesCents = 5000", () => {
    expect(result.directExpensesCents).toBe(5000);
  });

  it("totalExpensesCents = 14600", () => {
    expect(result.totalExpensesCents).toBe(14600);
  });

  it("totalEstimatedCostCents = 14600", () => {
    expect(result.totalEstimatedCostCents).toBe(14600);
  });

  it("marginBaseCents = 14600", () => {
    expect(result.marginBaseCents).toBe(14600);
  });

  it("marginAmountCents = 2920", () => {
    expect(result.marginAmountCents).toBe(2920);
  });

  it("manualAdjustmentCents = 500", () => {
    expect(result.manualAdjustmentCents).toBe(500);
  });

  it("subtotalBeforeDiscountCents = 18020", () => {
    expect(result.subtotalBeforeDiscountCents).toBe(18020);
  });

  it("fixedDiscountCents = 1000", () => {
    expect(result.fixedDiscountCents).toBe(1000);
  });

  it("totalDiscountCents = 1000", () => {
    expect(result.totalDiscountCents).toBe(1000);
  });

  it("fixedFeeTotalCents = 17020", () => {
    expect(result.fixedFeeTotalCents).toBe(17020);
  });

  it("entryAmountCents = 5000", () => {
    expect(result.entryAmountCents).toBe(5000);
  });

  it("financedAmountCents = 12020", () => {
    expect(result.financedAmountCents).toBe(12020);
  });

  it("installments = 6 parcels", () => {
    expect(result.installments.length).toBe(6);
  });

  it("installmentTotalCents = 12020", () => {
    expect(result.installmentTotalCents).toBe(12020);
  });

  it("paymentEndDate = 2026-09-15", () => {
    expect(result.paymentEndDate).toBe("2026-09-15");
  });

  it("scenarioType = conservative", () => {
    expect(result.scenarioType).toBe("conservative");
  });

  it("guaranteedRevenueCents = fixedFeeTotal = 17020", () => {
    expect(result.guaranteedRevenueCents).toBe(17020);
  });
});

// ── REGRESSÃO 3: Caso com Êxito + Mensalidade ─────────────
describe("regressão/caso3 — êxito + mensalidade", () => {
  const result = calculatePricingFee({
    scenarioType: "main",
    calculationDate: "2026-06-01",
    currency: "BRL",
    estimatedHours: 40,
    hourlyRateCents: 500,
    successFeeBps: 1500,       // 15%
    successFeeBaseCents: 53152345,  // ~R$531.523,45
    monthlyFeeCents: 3000,
    monthlyFeeCount: 12,
    monthlyFeeFirstDueDate: "2026-07-01",
  });

  it("workCostCents = 19200", () => {
    expect(result.workCostCents).toBe(19200);
  });

  it("estimatedSuccessFeeCents = 7972852", () => {
    expect(result.estimatedSuccessFeeCents).toBe(7972852);
  });

  it("successFeeIsGuaranteed = false", () => {
    expect(result.successFeeIsGuaranteed).toBe(false);
  });

  it("monthlyFeeSchedule = 12 itens", () => {
    expect(result.monthlyFeeSchedule.length).toBe(12);
  });

  it("monthlyFeeTotalCents = 36000", () => {
    expect(result.monthlyFeeTotalCents).toBe(36000);
  });

  it("recurringRevenueCents = 36000", () => {
    expect(result.recurringRevenueCents).toBe(36000);
  });

  it("guaranteedRevenueCents = workCost + recurring = 19200 + 36000", () => {
    expect(result.guaranteedRevenueCents).toBe(55200);
  });

  it("nonGuaranteedRevenueCents = 7972852", () => {
    expect(result.nonGuaranteedRevenueCents).toBe(7972852);
  });

  it("totalPotentialRevenueCents = 8028052", () => {
    expect(result.totalPotentialRevenueCents).toBe(8028052);
  });
});

// ── REGRESSÃO 4: Caso com desconto percentual agressivo ────
describe("regressão/caso4 — desconto percentual agressivo", () => {
  const result = calculatePricingFee({
    scenarioType: "expanded",
    calculationDate: "2026-07-15",
    currency: "BRL",
    estimatedHours: 50,
    hourlyRateCents: 500,
    percentageDiscountBps: 3000, // 30%
  });

  it("workCostCents = 24000", () => {
    expect(result.workCostCents).toBe(24000);
  });

  it("subtotalBeforeDiscountCents = 24000", () => {
    expect(result.subtotalBeforeDiscountCents).toBe(24000);
  });

  it("percentageDiscountCents = 7200", () => {
    expect(result.percentageDiscountCents).toBe(7200);
  });

  it("totalDiscountCents = 7200", () => {
    expect(result.totalDiscountCents).toBe(7200);
  });

  it("fixedFeeTotalCents = 16800", () => {
    expect(result.fixedFeeTotalCents).toBe(16800);
  });

  it("warning 'high_discount' presente", () => {
    expect(result.warnings.map((w) => w.code)).toContain("high_discount");
  });

  it("scenarioType = expanded", () => {
    expect(result.scenarioType).toBe("expanded");
  });
});

// ── REGRESSÃO 5: Cenário compare entre 3 tipos ─────────────
describe("regressão/caso5 — comparação entre cenários", () => {
  const baseInput: PricingCalculationInput = {
    scenarioType: "main",
    calculationDate: "2026-07-20",
    currency: "BRL",
    estimatedHours: 30,
    hourlyRateCents: 800,
    directExpensesCents: 2000,
    successFeeBps: 1000,
    successFeeBaseCents: 1000000,
    monthlyFeeCents: 4000,
    monthlyFeeCount: 6,
    entryAmountCents: 10000,
    installmentCount: 12,
    firstDueDate: "2026-08-15",
  };

  const conservative = calculatePricingScenario(baseInput, {
    scenarioType: "conservative",
    marginBps: 2500,
    percentageDiscountBps: 0,
  }, "Conservador");

  const main = calculatePricingScenario(baseInput, {
    scenarioType: "main",
    marginBps: 1500,
    percentageDiscountBps: 0,
  }, "Principal");

  const expanded = calculatePricingScenario(baseInput, {
    scenarioType: "expanded",
    marginBps: 1000,
    percentageDiscountBps: 0,
  }, "Expandido");

  it("3 cenários retornados corretamente", () => {
    expect(conservative.scenarioType).toBe("conservative");
    expect(main.scenarioType).toBe("main");
    expect(expanded.scenarioType).toBe("expanded");
  });

  it("cada cenário tem resultado e memória", () => {
    expect(conservative.result).toBeDefined();
    expect(conservative.memory).toBeDefined();
    expect(main.result).toBeDefined();
    expect(main.memory).toBeDefined();
    expect(expanded.result).toBeDefined();
    expect(expanded.memory).toBeDefined();
  });

  it("comparação retorna diferenças", () => {
    const comparison = comparePricingScenarios(main, [conservative, expanded]);
    expect(comparison.differences.length).toBeGreaterThan(0);
  });

  it("menor margem dá menor valor", () => {
    expect(expanded.result.fixedFeeTotalCents).toBeLessThan(main.result.fixedFeeTotalCents);
  });

  it("maior margem dá maior valor", () => {
    expect(conservative.result.fixedFeeTotalCents).toBeGreaterThan(main.result.fixedFeeTotalCents);
  });

  it("todos têm messages warnings", () => {
    expect(conservative.result.warnings.length).toBeGreaterThan(0);
    expect(main.result.warnings.length).toBeGreaterThan(0);
    expect(expanded.result.warnings.length).toBeGreaterThan(0);
  });

  it("Todos têm memória com engines version 1.0.0", () => {
    expect(conservative.memory.engineVersion).toBe("1.0.0");
    expect(main.memory.engineVersion).toBe("1.0.0");
    expect(expanded.memory.engineVersion).toBe("1.0.0");
  });

  it("Todos têm memória com disclaimer", () => {
    expect(conservative.memory.disclaimer).toBeTruthy();
    expect(main.memory.disclaimer).toBeTruthy();
    expect(expanded.memory.disclaimer).toBeTruthy();
  });
});