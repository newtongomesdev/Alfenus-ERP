import { describe, it, expect } from "vitest";
import { calculateEstimatedSuccessFee } from "../success-fee";
import { InvalidSuccessFeeError } from "../errors";

// ── calculateEstimatedSuccessFee ───────────────────────────
describe("success-fee/calculateEstimatedSuccessFee", () => {
  it("calcula 10% (1000 bps) de 1M centavos", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 1000,
      baseAmountCents: 1000000,
    });
    expect(result.estimatedAmountCents).toBe(100000);
    expect(result.percentageBps).toBe(1000);
    expect(result.baseAmountCents).toBe(1000000);
  });

  it("calcula 0% de 1M centavos", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 0,
      baseAmountCents: 1000000,
    });
    expect(result.estimatedAmountCents).toBe(0);
  });

  it("calcula 10% de 0 centavos", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 1000,
      baseAmountCents: 0,
    });
    expect(result.estimatedAmountCents).toBe(0);
  });

  it("calcula 100% (10000 bps) de 100 cts", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 10000,
      baseAmountCents: 100,
    });
    expect(result.estimatedAmountCents).toBe(100);
  });

  it("calcula 25% (2500 bps) de 20000 cts", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 2500,
      baseAmountCents: 20000,
    });
    expect(result.estimatedAmountCents).toBe(5000);
  });

  it("garanteed sempre é false", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 1000,
      baseAmountCents: 100000,
    });
    expect(result.guaranteed).toBe(false);
  });

  it("warning sempre presente", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 1000,
      baseAmountCents: 100000,
    });
    expect(result.warning).toBeTruthy();
    expect(typeof result.warning).toBe("string");
  });

  it("lança erro para percentageBps > 10000", () => {
    expect(() => calculateEstimatedSuccessFee({
      percentageBps: 10001,
      baseAmountCents: 100000,
    })).toThrow(InvalidSuccessFeeError);
  });

  it("lança erro para percentageBps negativo", () => {
    expect(() => calculateEstimatedSuccessFee({
      percentageBps: -1,
      baseAmountCents: 100000,
    })).toThrow(InvalidSuccessFeeError);
  });

  it("lança erro para baseAmountCents negativo", () => {
    expect(() => calculateEstimatedSuccessFee({
      percentageBps: 1000,
      baseAmountCents: -100,
    })).toThrow(InvalidSuccessFeeError);
  });

  it("lança erro para percentageBps não inteiro", () => {
    expect(() => calculateEstimatedSuccessFee({
      percentageBps: 100.5,
      baseAmountCents: 100000,
    })).toThrow(InvalidSuccessFeeError);
  });

  it("lança erro para percentageBps não número", () => {
    expect(() => calculateEstimatedSuccessFee({
      percentageBps: "1000" as unknown as number,
      baseAmountCents: 100000,
    })).toThrow(InvalidSuccessFeeError);
  });

  it("arredonda corretamente", () => {
    const result = calculateEstimatedSuccessFee({
      percentageBps: 1500,
      baseAmountCents: 100000,
    });
    // 150000 / 10000 = 15.0 → 15
    expect(result.estimatedAmountCents).toBe(15000);
  });
});