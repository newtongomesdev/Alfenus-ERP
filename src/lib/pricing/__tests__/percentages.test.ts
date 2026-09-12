import { describe, it, expect } from "vitest";
import {
  assertBasisPoints,
  applyBasisPoints,
  calculatePercentageValue,
  calculatePercentageDifference,
  calculatePercentageOfTotal,
  formatBasisPoints,
  percentageToBps,
  bpsToPercentage,
} from "../percentages";
import { InvalidPercentageError, UnsafeIntegerError } from "../errors";

// ── assertBasisPoints ─────────────────────────────────────
describe("percentages/assertBasisPoints", () => {
  it("aceita valor válido", () => {
    expect(assertBasisPoints(0)).toBe(0);
    expect(assertBasisPoints(5000)).toBe(5000);
    expect(assertBasisPoints(10000)).toBe(10000);
  });

  it("lança erro para NaN", () => {
    expect(() => assertBasisPoints(NaN)).toThrow(InvalidPercentageError);
  });

  it("lança erro para Infinity", () => {
    expect(() => assertBasisPoints(Infinity)).toThrow(InvalidPercentageError);
  });

  it("lança erro para não inteiro", () => {
    expect(() => assertBasisPoints(100.5)).toThrow(UnsafeIntegerError);
  });

  it("lança erro para valor abaixo de zero", () => {
    expect(() => assertBasisPoints(-1)).toThrow(InvalidPercentageError);
  });

  it("lança erro para valor acima de 10000", () => {
    expect(() => assertBasisPoints(10001)).toThrow(InvalidPercentageError);
  });

  it("lança erro para string", () => {
    expect(() => assertBasisPoints("100" as unknown as number)).toThrow(InvalidPercentageError);
  });
});

// ── applyBasisPoints ───────────────────────────────────────
describe("percentages/applyBasisPoints", () => {
  it("calcula 15% de 100000 cts", () => {
    expect(applyBasisPoints(100000, 1500)).toBe(15000);
  });

  it("calcula 100% de 100000 cts", () => {
    expect(applyBasisPoints(100000, 10000)).toBe(100000);
  });

  it("calcula 0% de 100000 cts", () => {
    expect(applyBasisPoints(100000, 0)).toBe(0);
  });

  it("calcula 50% de 200000 cts", () => {
    expect(applyBasisPoints(200000, 5000)).toBe(100000);
  });

  it("calcula com base zero", () => {
    expect(applyBasisPoints(0, 1500)).toBe(0);
  });
});

// ── calculatePercentageValue ───────────────────────────────
describe("percentages/calculatePercentageValue", () => {
  it("calcula valor percentual", () => {
    expect(calculatePercentageValue(100000, 1500)).toBe(15000);
  });

  it("calcula 10%", () => {
    expect(calculatePercentageValue(100000, 1000)).toBe(10000);
  });
});

// ── calculatePercentageDifference ──────────────────────────
describe("percentages/calculatePercentageDifference", () => {
  it("calcula diferença de 50%", () => {
    expect(calculatePercentageDifference(100, 150)).toBe(5000);
  });

  it("calcula diferença de 0", () => {
    expect(calculatePercentageDifference(100, 100)).toBe(0);
  });

  it("calcula diferença negativa", () => {
    expect(calculatePercentageDifference(100, 50)).toBe(-5000);
  });

  it("lança erro para base zero", () => {
    expect(() => calculatePercentageDifference(0, 100)).toThrow(InvalidPercentageError);
  });
});

// ── calculatePercentageOfTotal ─────────────────────────────
describe("percentages/calculatePercentageOfTotal", () => {
  it("calcula 100%", () => {
    expect(calculatePercentageOfTotal(1000, 1000)).toBe(10000);
  });

  it("calcula 50%", () => {
    expect(calculatePercentageOfTotal(1000, 500)).toBe(5000);
  });

  it("calcula 0%", () => {
    expect(calculatePercentageOfTotal(1000, 0)).toBe(0);
  });

  it("lança erro para total zero", () => {
    expect(() => calculatePercentageOfTotal(0, 100)).toThrow(InvalidPercentageError);
  });
});

// ── formatBasisPoints ──────────────────────────────────────
describe("percentages/formatBasisPoints", () => {
  it("formata 500 bps (5%)", () => {
    expect(formatBasisPoints(500)).toContain("5");
  });

  it("formata 10000 bps (100%)", () => {
    expect(formatBasisPoints(10000)).toContain("100");
  });

  it("formata 0 bps", () => {
    expect(formatBasisPoints(0)).toContain("0");
  });
});

// ── percentageToBps ────────────────────────────────────────
describe("percentages/percentageToBps", () => {
  it("converte 15.5% para 1550 bps", () => {
    expect(percentageToBps(15.5)).toBe(1550);
  });

  it("converte 100% para 10000 bps", () => {
    expect(percentageToBps(100)).toBe(10000);
  });

  it("converte 0% para 0 bps", () => {
    expect(percentageToBps(0)).toBe(0);
  });
});

// ── bpsToPercentage ────────────────────────────────────────
describe("percentages/bpsToPercentage", () => {
  it("converte 1500 bps para 15", () => {
    expect(bpsToPercentage(1500)).toBe(15);
  });

  it("converte 10000 bps para 100", () => {
    expect(bpsToPercentage(10000)).toBe(100);
  });

  it("converte 0 bps para 0", () => {
    expect(bpsToPercentage(0)).toBe(0);
  });
});