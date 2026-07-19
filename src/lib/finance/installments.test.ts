import { describe, expect, it } from "vitest";

import { calculateInstallmentPlan } from "./installments";

describe("calculateInstallmentPlan", () => {
  it("desconta entrada e preserva a soma final em centavos", () => {
    const installments = calculateInstallmentPlan({
      totalAmountCents: 100_00,
      upfrontAmountCents: 25_00,
      installments: 4,
    });

    expect(installments).toHaveLength(4);
    expect(installments.reduce((total, item) => total + item.amountCents, 0)).toBe(75_00);
  });

  it("distribui centavos residuais sem usar float", () => {
    expect(
      calculateInstallmentPlan({
        totalAmountCents: 100_00,
        upfrontAmountCents: 0,
        installments: 3,
      }),
    ).toEqual([
      { number: 1, amountCents: 3334 },
      { number: 2, amountCents: 3333 },
      { number: 3, amountCents: 3333 },
    ]);
  });

  it("rejeita entrada maior que o total", () => {
    expect(() =>
      calculateInstallmentPlan({
        totalAmountCents: 100_00,
        upfrontAmountCents: 101_00,
        installments: 2,
      }),
    ).toThrow("A entrada não pode ser maior que o valor total.");
  });
});
