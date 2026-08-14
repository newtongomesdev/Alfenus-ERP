import { describe, it, expect } from "vitest";
import {
  generateRecurringFees,
  generateMonthlyCompetencies,
} from "../recurring";
import { InvalidRecurringFeeError } from "../errors";

// ── generateMonthlyCompetencies ────────────────────────────
describe("recurring/generateMonthlyCompetencies", () => {
  it("gera 3 competências desde janeiro", () => {
    const result = generateMonthlyCompetencies("2026-01-15", 3);
    expect(result).toStrictEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("gera 1 competência", () => {
    expect(generateMonthlyCompetencies("2026-01-15", 1)).toStrictEqual(["2026-01"]);
  });

  it("gera competências com wrap no ano", () => {
    const result = generateMonthlyCompetencies("2026-11-15", 3);
    expect(result).toStrictEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("gera competências de 12 meses", () => {
    const result = generateMonthlyCompetencies("2026-01-01", 12);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe("2026-01");
    expect(result[11]).toBe("2026-12");
  });
});

// ── generateRecurringFees ──────────────────────────────────
describe("recurring/generateRecurringFees", () => {
  it("gera 3 mensalidades de 5000 cts", () => {
    const fees = generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 3,
      firstDueDate: "2026-01-15",
    });
    expect(fees).toHaveLength(3);
    expect(fees[0].amountCents).toBe(5000);
    expect(fees[1].amountCents).toBe(5000);
    expect(fees[2].amountCents).toBe(5000);
  });

  it("datas de vencimento corretas", () => {
    const fees = generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 3,
      firstDueDate: "2026-01-15",
    });
    expect(fees[0].dueDate).toBe("2026-01-15");
    expect(fees[1].dueDate).toBe("2026-02-15");
    expect(fees[2].dueDate).toBe("2026-03-15");
  });

  it("competências mensais corretas", () => {
    const fees = generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 3,
      firstDueDate: "2026-01-15",
    });
    expect(fees[0].competencyMonth).toBe("2026-01");
    expect(fees[1].competencyMonth).toBe("2026-02");
    expect(fees[2].competencyMonth).toBe("2026-03");
  });

  it("todos com status pending", () => {
    const fees = generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 3,
      firstDueDate: "2026-01-15",
    });
    for (const fee of fees) {
      expect(fee.status).toBe("pending");
    }
  });

  it("números sequenciais", () => {
    const fees = generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 3,
      firstDueDate: "2026-01-15",
    });
    expect(fees.map((f) => f.number)).toStrictEqual([1, 2, 3]);
  });

  it("lança erro para valor zero", () => {
    expect(() => generateRecurringFees({
      monthlyFeeCents: 0,
      count: 3,
      firstDueDate: "2026-01-15",
    })).toThrow(InvalidRecurringFeeError);
  });

  it("lança erro para count zero", () => {
    expect(() => generateRecurringFees({
      monthlyFeeCents: 5000,
      count: 0,
      firstDueDate: "2026-01-15",
    })).toThrow(InvalidRecurringFeeError);
  });

  it("lança erro para count negativo", () => {
    expect(() => generateRecurringFees({
      monthlyFeeCents: 5000,
      count: -1,
      firstDueDate: "2026-01-15",
    })).toThrow(InvalidRecurringFeeError);
  });

  it("lança erro para valor negativo", () => {
    expect(() => generateRecurringFees({
      monthlyFeeCents: -100,
      count: 3,
      firstDueDate: "2026-01-15",
    })).toThrow(InvalidRecurringFeeError);
  });
});