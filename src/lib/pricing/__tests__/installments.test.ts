import { describe, it, expect } from "vitest";
import {
  getDaysInMonth,
  advanceDate,
  generateDueDates,
  divideIntoInstallments,
} from "../installments";
import { InvalidInstallmentCountError, InvalidInstallmentDateError } from "../errors";

// ── getDaysInMonth ─────────────────────────────────────────
describe("installments/getDaysInMonth", () => {
  it("janeiro tem 31 dias", () => {
    expect(getDaysInMonth(2026, 1)).toBe(31);
  });

  it("fevereiro de ano bissexto tem 29 dias", () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });

  it("fevereiro de ano não bissexto tem 28 dias", () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
  });

  it("abril tem 30 dias", () => {
    expect(getDaysInMonth(2026, 4)).toBe(30);
  });
});

// ── advanceDate ────────────────────────────────────────────
describe("installments/advanceDate", () => {
  it("mensal avança 1 mês", () => {
    expect(advanceDate("2026-01-15", "monthly")).toBe("2026-02-15");
  });

  it("biweekly avança 14 dias", () => {
    expect(advanceDate("2026-01-01", "biweekly")).toBe("2026-01-15");
  });

  it("weekly avança 7 dias", () => {
    expect(advanceDate("2026-01-01", "weekly")).toBe("2026-01-08");
  });

  it("quarterly avança 3 meses", () => {
    expect(advanceDate("2026-01-15", "quarterly")).toBe("2026-04-15");
  });

  it("bimonthly avança 2 meses", () => {
    expect(advanceDate("2026-01-15", "bimonthly")).toBe("2026-03-15");
  });

  it("custom_days avança N dias", () => {
    expect(advanceDate("2026-01-01", "custom_days", 10)).toBe("2026-01-11");
  });

  it("clampa para último dia do mês", () => {
    expect(advanceDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("custom_days sem intervalo lança erro", () => {
    expect(() => advanceDate("2026-01-01", "custom_days")).toThrow(InvalidInstallmentCountError);
  });
});

// ── generateDueDates ───────────────────────────────────────
describe("installments/generateDueDates", () => {
  it("gera 3 datas mensais", () => {
    const dates = generateDueDates("2026-01-15", 3, "monthly");
    expect(dates).toStrictEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("gera 1 data", () => {
    const dates = generateDueDates("2026-01-15", 1, "monthly");
    expect(dates).toStrictEqual(["2026-01-15"]);
  });

  it("lança erro para data inválida", () => {
    expect(() => generateDueDates("2026/01/15", 3, "monthly")).toThrow(InvalidInstallmentDateError);
  });
});

// ── divideIntoInstallments ────────────────────────────────
describe("installments/divideIntoInstallments", () => {
  it("divide 10000 cts em 3 parcelas (3333+3333+3334)", () => {
    const installments = divideIntoInstallments({
      totalCents: 10000,
      installmentCount: 3,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    expect(installments).toHaveLength(3);
    // Math.floor(10000/3) = 3333, last = 10000 - 3333*2 = 3334
    expect(installments[0].amountCents).toBe(3333);
    expect(installments[1].amountCents).toBe(3333);
    expect(installments[2].amountCents).toBe(3334);
    expect(installments[0].roundingAdjustmentCents).toBe(0);
    expect(installments[2].roundingAdjustmentCents).toBe(1);
  });

  it("soma das parcelas igual ao total", () => {
    const installments = divideIntoInstallments({
      totalCents: 10000,
      installmentCount: 3,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    const sum = installments.reduce((acc, i) => acc + i.amountCents, 0);
    expect(sum).toBe(10000);
  });

  it("1 parcela de 1 centavo", () => {
    const installments = divideIntoInstallments({
      totalCents: 1,
      installmentCount: 1,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    expect(installments).toHaveLength(1);
    expect(installments[0].amountCents).toBe(1);
  });

  it("total 0 retorna array vazio", () => {
    const installments = divideIntoInstallments({
      totalCents: 0,
      installmentCount: 3,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    expect(installments).toHaveLength(0);
  });

  it("count 0 lança erro", () => {
    expect(() => divideIntoInstallments({
      totalCents: 1000,
      installmentCount: 0,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    })).toThrow(InvalidInstallmentCountError);
  });

  it("count negativo lança erro", () => {
    expect(() => divideIntoInstallments({
      totalCents: 1000,
      installmentCount: -1,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    })).toThrow(InvalidInstallmentCountError);
  });

  it("count > 120 lança erro", () => {
    expect(() => divideIntoInstallments({
      totalCents: 100000,
      installmentCount: 121,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    })).toThrow(InvalidInstallmentCountError);
  });

  it("data inválida lança erro", () => {
    expect(() => divideIntoInstallments({
      totalCents: 1000,
      installmentCount: 3,
      firstDueDate: "invalid",
      frequency: "monthly",
    })).toThrow(InvalidInstallmentDateError);
  });

  it("todas parcelas são pending", () => {
    const installments = divideIntoInstallments({
      totalCents: 5000,
      installmentCount: 5,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    for (const inst of installments) {
      expect(inst.status).toBe("pending");
    }
  });

  it("números sequenciais", () => {
    const installments = divideIntoInstallments({
      totalCents: 10000,
      installmentCount: 3,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    expect(installments.map((i) => i.number)).toStrictEqual([1, 2, 3]);
  });

  it("parcelas igualmente divididas quando total é múltiplo exato", () => {
    const installments = divideIntoInstallments({
      totalCents: 9999,
      installmentCount: 3,
      firstDueDate: "2026-01-15",
      frequency: "monthly",
    });
    expect(installments[0].amountCents).toBe(3333);
    expect(installments[1].amountCents).toBe(3333);
    expect(installments[2].amountCents).toBe(3333);
  });
});