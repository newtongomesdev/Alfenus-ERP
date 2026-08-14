import { describe, it, expect } from "vitest";
import { buildRevenueProjection } from "../projections";

// ── buildRevenueProjection ─────────────────────────────────
describe("projections/buildRevenueProjection", () => {
  it("retorna vazio quando todos valores zero", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 0,
      installments: [],
      monthlyFeeSchedule: [],
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(0);
    expect(result.startDate).toBe("");
    expect(result.endDate).toBe("");
  });

  it("gera item de entrada quando > 0", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 5000,
      installments: [],
      monthlyFeeSchedule: [],
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].sourceType).toBe("entry");
    expect(result.timeline[0].guaranteed).toBe(true);
    expect(result.timeline[0].amountCents).toBe(5000);
  });

  it("gera items de parcelas", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 0,
      installments: [
        { number: 1, amountCents: 3334, dueDate: "2026-02-15", principalCents: 3334, roundingAdjustmentCents: 0, status: "pending" },
        { number: 2, amountCents: 3333, dueDate: "2026-03-15", principalCents: 3333, roundingAdjustmentCents: 0, status: "pending" },
      ],
      monthlyFeeSchedule: [],
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].sourceType).toBe("installment");
    expect(result.timeline[0].guaranteed).toBe(true);
  });

  it("gera items de mensalidades", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 0,
      installments: [],
      monthlyFeeSchedule: [
        { number: 1, amountCents: 2000, dueDate: "2026-01-15", competencyMonth: "2026-01", status: "pending" },
        { number: 2, amountCents: 2000, dueDate: "2026-02-15", competencyMonth: "2026-02", status: "pending" },
      ],
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].sourceType).toBe("monthly_fee");
    expect(result.timeline[0].guaranteed).toBe(true);
  });

  it("gera item de êxito não garantido", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 0,
      installments: [],
      monthlyFeeSchedule: [],
      successFeeResult: {
        percentageBps: 1000,
        baseAmountCents: 100000,
        estimatedAmountCents: 10000,
        guaranteed: false,
        warning: "test",
      },
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].sourceType).toBe("estimated_success_fee");
    expect(result.timeline[0].guaranteed).toBe(false);
  });

  it("calcula monthlyTotals corretamente", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 5000,
      installments: [
        { number: 1, amountCents: 3000, dueDate: "2026-02-15", principalCents: 3000, roundingAdjustmentCents: 0, status: "pending" },
      ],
      monthlyFeeSchedule: [],
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.monthlyTotals["2026-01"]).toBe(5000);
    expect(result.monthlyTotals["2026-02"]).toBe(3000);
  });

  it("separa guaranteed vs estimated", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 5000,
      installments: [],
      monthlyFeeSchedule: [],
      successFeeResult: {
        percentageBps: 1000,
        baseAmountCents: 100000,
        estimatedAmountCents: 10000,
        guaranteed: false,
        warning: "test",
      },
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.guaranteedMonthlyTotals["2026-01"]).toBe(5000);
    expect(result.estimatedMonthlyTotals["2026-01"]).toBe(10000);
  });

  it("inclui todos os tipos de fonte", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 5000,
      installments: [
        { number: 1, amountCents: 3000, dueDate: "2026-02-15", principalCents: 3000, roundingAdjustmentCents: 0, status: "pending" },
      ],
      monthlyFeeSchedule: [
        { number: 1, amountCents: 2000, dueDate: "2026-03-15", competencyMonth: "2026-03", status: "pending" },
      ],
      successFeeResult: {
        percentageBps: 1000,
        baseAmountCents: 100000,
        estimatedAmountCents: 10000,
        guaranteed: false,
        warning: "test",
      },
      scenarioType: "main",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline).toHaveLength(4);
    const sourceTypes = result.timeline.map((i) => i.sourceType);
    expect(sourceTypes).toContain("entry");
    expect(sourceTypes).toContain("installment");
    expect(sourceTypes).toContain("monthly_fee");
    expect(sourceTypes).toContain("estimated_success_fee");
  });

  it("scenarioType propagado", () => {
    const result = buildRevenueProjection({
      entryAmountCents: 5000,
      installments: [],
      monthlyFeeSchedule: [],
      scenarioType: "conservative",
      calculationDate: "2026-01-15",
    });
    expect(result.timeline[0].scenarioType).toBe("conservative");
  });
});