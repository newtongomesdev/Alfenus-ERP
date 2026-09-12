import { describe, it, expect } from "vitest";
import { calculatePricingFee } from "../calculator";
import { PRICING_CALCULATION_ENGINE_VERSION } from "../calculation-types";
import type { PricingCalculationInput } from "../calculation-types";

const BASE_INPUT: PricingCalculationInput = {
  scenarioType: "main",
  calculationDate: "2026-01-15",
  currency: "BRL",
};

// ── Helpers ────────────────────────────────────────────────
function input(overrides: Partial<PricingCalculationInput>): PricingCalculationInput {
  return { ...BASE_INPUT, ...overrides };
}

// ── 1. Input mínimo / vazio ───────────────────────────────
describe("calculator/input mínimo", () => {
  it("retorna zeros para input completo vazio", () => {
    const result = calculatePricingFee(BASE_INPUT);
    expect(result.workCostCents).toBe(0);
    expect(result.totalExpensesCents).toBe(0);
    expect(result.totalEstimatedCostCents).toBe(0);
    expect(result.fixedFeeTotalCents).toBe(0);
    expect(result.installments).toHaveLength(0);
    expect(result.monthlyFeeSchedule).toHaveLength(0);
    expect(result.estimatedSuccessFeeCents).toBe(0);
    expect(result.totalPotentialRevenueCents).toBe(0);
    expect(result.guaranteedRevenueCents).toBe(0);
    expect(result.nonGuaranteedRevenueCents).toBe(0);
  });

  it("engineVersion é 1.0.0", () => {
    const result = calculatePricingFee(BASE_INPUT);
    expect(result.calculationVersion).toBe(PRICING_CALCULATION_ENGINE_VERSION);
  });

  it("scenarioType propagado", () => {
    const result = calculatePricingFee(input({ scenarioType: "conservative" }));
    expect(result.scenarioType).toBe("conservative");
  });

  it("calculationDate propagado", () => {
    const result = calculatePricingFee(BASE_INPUT);
    expect(result.calculationDate).toBe("2026-01-15");
  });

  it("warnings과 assumptions arrays are present", () => {
    const result = calculatePricingFee(BASE_INPUT);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.assumptions)).toBe(true);
  });
});

// ── 2. Custo do trabalho ───────────────────────────────────
// NOTE: hoursToCents(10, 500) = 4800 because:
//   ratePerMinute = round(500/60) = 8
//   600 min * 8 = 4800
describe("calculator/custo do trabalho", () => {
  it("calcula workCostCents corretamente (rate per minute arredondado)", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
    }));
    // 10h * 60 = 600min, 600 * round(500/60) = 600 * 8 = 4800
    expect(result.workCostCents).toBe(4800);
    expect(result.estimatedHours).toBe(10);
    expect(result.hourlyRateCents).toBe(500);
  });

  it("workCostCents é zero quando sem horas", () => {
    const result = calculatePricingFee(input({ estimatedHours: 0, hourlyRateCents: 500 }));
    expect(result.workCostCents).toBe(0);
  });

  it("incluído no totalExpensesCents", () => {
    const result = calculatePricingFee(input({ estimatedHours: 10, hourlyRateCents: 500 }));
    expect(result.totalExpensesCents).toBe(4800);
    expect(result.totalEstimatedCostCents).toBe(4800);
  });

  it("rate exato por minuto sem arredondamento (rate=60)", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 1,
      hourlyRateCents: 60,
    }));
    // 60min * round(60/60)=1 → 60
    expect(result.workCostCents).toBe(60);
  });
});

// ── 3. Custos ──────────────────────────────────────────────
describe("calculator/custos", () => {
  it("soma despesas diretas ao total", () => {
    const result = calculatePricingFee(input({ directExpensesCents: 1000 }));
    expect(result.directExpensesCents).toBe(1000);
    expect(result.totalExpensesCents).toBe(1000);
  });

  it("soma todos os custos", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      directExpensesCents: 1000,
      indirectExpensesCents: 2000,
      thirdPartyCostsCents: 3000,
      travelCostsCents: 4000,
      feesAndTaxesCents: 5000,
      otherCostsCents: 6000,
    }));
    // total = 4800 + 1000 + 2000 + 3000 + 4000 + 5000 + 6000 = 25800
    expect(result.totalExpensesCents).toBe(25800);
  });

  it("custos negativos são clampados para 0", () => {
    const result = calculatePricingFee(input({ directExpensesCents: -500 }));
    expect(result.directExpensesCents).toBe(0);
  });
});

// ── 4. Margem ──────────────────────────────────────────────
describe("calculator/margem", () => {
  it("margem sobre custo total (default)", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      marginBps: 1500, // 15%
    }));
    // workCostCents=4800, totalEstimatedCostCents=4800
    // marginBaseCents=4800, marginAmountCents=round(4800*1500/10000)=720
    expect(result.marginBaseCents).toBe(4800);
    expect(result.marginAmountCents).toBe(720);
  });

  it("margem sobre work_cost", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      directExpensesCents: 1000,
      marginBps: 2000,
      marginBase: "work_cost",
    }));
    expect(result.marginBaseCents).toBe(4800);
    expect(result.marginAmountCents).toBe(960);
  });

  it("margem sobre expenses_only", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      directExpensesCents: 1000,
      marginBps: 2000,
      marginBase: "expenses_only",
    }));
    // marginBase = totalExpenses - workCost = 5800 - 4800 = 1000
    expect(result.marginBaseCents).toBe(1000);
    expect(result.marginAmountCents).toBe(200);
  });

  it("margem sobre custom_base", () => {
    const result = calculatePricingFee(input({
      marginBps: 1500,
      marginBase: "custom_base",
      customMarginBaseCents: 20000,
    }));
    expect(result.marginBaseCents).toBe(20000);
    expect(result.marginAmountCents).toBe(3000);
  });
});

// ── 5. Ajuste manual ───────────────────────────────────────
describe("calculator/ajuste manual", () => {
  it("ajuste manual é adicionado ao subtotal", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      manualAdjustmentCents: 1000,
    }));
    // subtotal = totalEstimatedCost + marginAmount + manualAdj = 4800 + 0 + 1000 = 5800
    expect(result.manualAdjustmentCents).toBe(1000);
    expect(result.subtotalBeforeDiscountCents).toBe(5800);
  });

  it("ajuste negativo é suportado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      manualAdjustmentCents: -500,
    }));
    expect(result.manualAdjustmentCents).toBe(-500);
    expect(result.subtotalBeforeDiscountCents).toBe(4300);
  });
});

// ── 6. Descontos ──────────────────────────────────────────
describe("calculator/descontos", () => {
  it("desconto fixo", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      fixedDiscountCents: 1000,
    }));
    // subtotal = 4800, discount = 1000, fixedFee = 3800
    expect(result.fixedDiscountCents).toBe(1000);
    expect(result.totalDiscountCents).toBe(1000);
    expect(result.fixedFeeTotalCents).toBe(3800);
  });

  it("desconto percentual", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      percentageDiscountBps: 1000, // 10%
    }));
    // subtotal = 4800, 10% = 480, fixedFee = 4320
    expect(result.percentageDiscountCents).toBe(480);
    expect(result.fixedFeeTotalCents).toBe(4320);
  });

  it("desconto total não pode exceder subtotal (com custos)", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      fixedDiscountCents: 10000,
    }));
    // subtotal = 4800, discount excede → totalDiscount = 4800, fixedFee = 0
    expect(result.fixedFeeTotalCents).toBe(0);
  });
});

// ── 7. Entrada e saldo ────────────────────────────────────
describe("calculator/entrada e saldo", () => {
  it("entrada reduz valor financiado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 1000,
    }));
    expect(result.entryAmountCents).toBe(1000);
    expect(result.financedAmountCents).toBe(3800);
  });

  it("entrada excede valor total é clamped", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 10000,
    }));
    expect(result.entryAmountCents).toBe(4800);
    expect(result.financedAmountCents).toBe(0);
  });
});

// ── 8. Parcelamento ────────────────────────────────────────
describe("calculator/parcelamento", () => {
  it("gera parcelas corretamente", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 1000,
      installmentCount: 3,
      firstDueDate: "2026-02-15",
    }));
    expect(result.installments).toHaveLength(3);
    expect(result.installmentCount).toBe(3);
    expect(result.financedAmountCents).toBe(3800);
    expect(result.installmentTotalCents).toBe(3800);
  });

  it("sem parcelas quando installmentCount=0", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      installmentCount: 0,
    }));
    expect(result.installments).toHaveLength(0);
    expect(result.installmentTotalCents).toBe(0);
  });

  it("sem parcelas quando financiado for 0", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 4800,
      installmentCount: 3,
    }));
    expect(result.installments).toHaveLength(0);
  });

  it("paymentEndDate é setado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 1000,
      installmentCount: 3,
      firstDueDate: "2026-02-15",
    }));
    expect(result.paymentEndDate).toBeTruthy();
  });
});

// ── 9. Mensalidade ─────────────────────────────────────────
describe("calculator/mensalidade", () => {
  it("gera mensalidades", () => {
    const result = calculatePricingFee(input({
      monthlyFeeCents: 2000,
      monthlyFeeCount: 3,
      monthlyFeeFirstDueDate: "2026-02-01",
    }));
    expect(result.monthlyFeeSchedule).toHaveLength(3);
    expect(result.monthlyFeeTotalCents).toBe(6000);
  });

  it("sem mensalidade quando count=0", () => {
    const result = calculatePricingFee(input({
      monthlyFeeCents: 2000,
      monthlyFeeCount: 0,
    }));
    expect(result.monthlyFeeSchedule).toHaveLength(0);
    expect(result.monthlyFeeTotalCents).toBe(0);
  });

  it("receita recorrente correta", () => {
    const result = calculatePricingFee(input({
      monthlyFeeCents: 2000,
      monthlyFeeCount: 5,
    }));
    expect(result.recurringRevenueCents).toBe(10000);
  });
});

// ── 10. Êxito ──────────────────────────────────────────────
describe("calculator/êxito", () => {
  it("calcula êxito estimado", () => {
    const result = calculatePricingFee(input({
      successFeeBps: 1000,
      successFeeBaseCents: 1000000,
    }));
    expect(result.estimatedSuccessFeeCents).toBe(100000);
    expect(result.successFeeBps).toBe(1000);
    expect(result.successFeeIsGuaranteed).toBe(false);
  });

  it("não gera êxito sem BPS", () => {
    const result = calculatePricingFee(input({
      successFeeBps: 0,
      successFeeBaseCents: 1000000,
    }));
    expect(result.estimatedSuccessFeeCents).toBe(0);
  });

  it("não gera êxito sem base", () => {
    const result = calculatePricingFee(input({
      successFeeBps: 1000,
      successFeeBaseCents: 0,
    }));
    expect(result.estimatedSuccessFeeCents).toBe(0);
  });
});

// ── 11. Totais de receita ──────────────────────────────────
describe("calculator/totais de receita", () => {
  it("fixedRevenue = fixedFeeTotal", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
    }));
    // fixedFeeTotal = 4800 (no margin, no discount, no manual adj)
    expect(result.fixedRevenueCents).toBe(4800);
  });

  it("recurringRevenue = monthlyFeeTotal", () => {
    const result = calculatePricingFee(input({
      monthlyFeeCents: 2000,
      monthlyFeeCount: 5,
    }));
    expect(result.recurringRevenueCents).toBe(10000);
  });

  it("guaranteedRevenue = fixed + recurring", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      monthlyFeeCents: 2000,
      monthlyFeeCount: 5,
    }));
    expect(result.guaranteedRevenueCents).toBe(14800);
  });

  it("nonGuaranteedRevenue = success fee", () => {
    const result = calculatePricingFee(input({
      successFeeBps: 1000,
      successFeeBaseCents: 1000000,
    }));
    expect(result.nonGuaranteedRevenueCents).toBe(100000);
  });

  it("totalPotential = guaranteed + nonGuaranteed", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      monthlyFeeCents: 2000,
      monthlyFeeCount: 5,
      successFeeBps: 1000,
      successFeeBaseCents: 1000000,
    }));
    expect(result.totalPotentialRevenueCents).toBe(114800);
  });
});

// ── 12. Warnings ──────────────────────────────────────────
describe("calculator/warnings", () => {
  it("gera warning para valor abaixo do custo estimado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      fixedDiscountCents: 5000,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("value_below_estimated_cost");
  });

  it("gera warning para sem entrada", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      installmentCount: 3,
      entryAmountCents: 0,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("no_entry");
  });

  it("gera warning para desconto elevado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      percentageDiscountBps: 2500,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("high_discount");
  });

  it("gera warning para parcelamento prolongado", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      installmentCount: 15,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("long_installment_term");
  });

  it("gera warning para êxito", () => {
    const result = calculatePricingFee(input({
      successFeeBps: 1000,
      successFeeBaseCents: 100000,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("estimated_success_fee");
  });

  it("gera warning para ajuste manual", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      manualAdjustmentCents: 500,
    }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("manual_adjustment_applied");
  });
});

// ── 13. Assumptions ────────────────────────────────────────
describe("calculator/assumptions", () => {
  it("contém informações básicas", () => {
    const result = calculatePricingFee(BASE_INPUT);
    expect(result.assumptions.some((a) => a.includes("BRL"))).toBe(true);
    expect(result.assumptions.some((a) => a.includes("basis points"))).toBe(true);
    expect(result.assumptions.some((a) => a.includes("centavos"))).toBe(true);
  });
});

// ── 14. Projeção ──────────────────────────────────────────
describe("calculator/projeção", () => {
  it("contém itens de projeção", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 1000,
      installmentCount: 2,
      monthlyFeeCents: 1000,
      monthlyFeeCount: 1,
      successFeeBps: 1000,
      successFeeBaseCents: 100000,
    }));
    expect(result.revenueProjection.length).toBeGreaterThan(0);
  });

  it("projectionStartDate e projectionEndDate definidos", () => {
    const result = calculatePricingFee(input({
      estimatedHours: 10,
      hourlyRateCents: 500,
      entryAmountCents: 1000,
      installmentCount: 2,
    }));
    expect(result.projectionStartDate).toBeTruthy();
    expect(result.projectionEndDate).toBeTruthy();
  });
});