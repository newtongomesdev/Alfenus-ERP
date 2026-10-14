import { describe, expect, it } from "vitest";
import { calculateSoloCashFlow } from "./finance";

describe("Solo cash flow", () => {
  it("excludes reversed payments and subtracts paid and expected expenses", () => {
    expect(calculateSoloCashFlow({
      payments: [
        { amount_cents: 10000, reversed_at: null },
        { amount_cents: 5000, reversed_at: "2026-10-02T12:00:00Z" },
      ],
      paidExpensesCents: 2000,
      expectedInstallmentsCents: 3000,
      expectedExpensesCents: 1000,
    })).toEqual({
      received: 10000,
      cashFlow: 8000,
      projectedCashFlow: 10000,
    });
  });
});
