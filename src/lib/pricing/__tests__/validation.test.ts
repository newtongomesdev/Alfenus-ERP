import { describe, it, expect } from "vitest";
import {
  validatePricingInput,
  validateInstallmentParams,
  validateSuccessFeeParams,
  validateDiscountParams,
  validateMarginParams,
  validateEntryAmount,
} from "../validations";

// ── validatePricingInput ────────────────────────────────────
describe("validations/validatePricingInput", () => {
  it("aceita input válido mínimo", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("aceita todos os cenários válidos", () => {
    const types = ["conservative", "main", "expanded", "custom"];
    for (const st of types) {
      expect(validatePricingInput({
        scenarioType: st,
        calculationDate: "2026-01-15",
        currency: "BRL",
      }).valid).toBe(true);
    }
  });

  it("rejeita cenário inválido", () => {
    const result = validatePricingInput({
      scenarioType: "invalid",
      calculationDate: "2026-01-15",
      currency: "BRL",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejeita data inválida (formato)", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "invalid-date",
      currency: "BRL",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("calculationDate"))).toBe(true);
  });

  it("rejeita moeda vazia", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "",
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita estimatedHours negativo", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      estimatedHours: -1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita hourlyRateCents não numérico", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      hourlyRateCents: "abc" as unknown as number,
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita campo de centavos não inteiro", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      directExpensesCents: 100.5,
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita BPS fora de range", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      marginBps: 10001,
    });
    expect(result.valid).toBe(false);
  });

  it("aceita firstDueDate durante", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      firstDueDate: "2026-02-15",
    });
    expect(result.valid).toBe(true);
  });

  it("rejeita firstDueDate (formato inválido)", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      firstDueDate: "15-01-2026", // formato diferente
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita objeto não-object", () => {
    expect(validatePricingInput(null).valid).toBe(false);
    expect(validatePricingInput("string").valid).toBe(false);
  });

  it("rejeita installmentCount < 1", () => {
    const result = validatePricingInput({
      scenarioType: "main",
      calculationDate: "2026-01-15",
      currency: "BRL",
      installmentCount: 0,
    });
    expect(result.valid).toBe(false);
  });
});

// ── validateInstallmentParams ──────────────────────────────
describe("validations/validateInstallmentParams", () => {
  it("aceita parâmetros válidos", () => {
    const result = validateInstallmentParams(10000, 3, "2026-01-15");
    expect(result.valid).toBe(true);
  });

  it("rejeita totalCents negativo", () => {
    const result = validateInstallmentParams(-1, 3, "2026-01-15");
    expect(result.valid).toBe(false);
  });

  it("rejeita installmentCount < 1", () => {
    const result = validateInstallmentParams(10000, 0, "2026-01-15");
    expect(result.valid).toBe(false);
  });

  it("rejeita installmentCount não inteiro", () => {
    const result = validateInstallmentParams(10000, 1.5, "2026-01-15");
    expect(result.valid).toBe(false);
  });
});

// ── validateSuccessFeeParams ────────────────────────────────
describe("validations/validateSuccessFeeParams", () => {
  it("aceita parâmetros válidos", () => {
    const result = validateSuccessFeeParams(1000, 100000);
    expect(result.valid).toBe(true);
  });

  it("rejeita BPS fora de range", () => {
    const result = validateSuccessFeeParams(10001, 100000);
    expect(result.valid).toBe(false);
  });

  it("rejeita baseAmountCents negativo", () => {
    const result = validateSuccessFeeParams(1000, -1);
    expect(result.valid).toBe(false);
  });

  it("rejeita BPS não inteiro", () => {
    const result = validateSuccessFeeParams(100.5, 100000);
    expect(result.valid).toBe(false);
  });
});

// ── validateDiscountParams ─────────────────────────────────
describe("validations/validateDiscountParams", () => {
  it("aceita parâmetros válidos", () => {
    const result = validateDiscountParams(0, 0, 100000);
    expect(result.valid).toBe(true);
  });

  it("rejeita fixedDiscountCents negativo", () => {
    const result = validateDiscountParams(-1, 0, 100000);
    expect(result.valid).toBe(false);
  });

  it("rejeita percentageDiscountBps fora de range", () => {
    const result = validateDiscountParams(0, 10001, 100000);
    expect(result.valid).toBe(false);
  });
});

// ── validateMarginParams ────────────────────────────────────
describe("validations/validateMarginParams", () => {
  it("aceita parâmetros válidos", () => {
    const result = validateMarginParams(1500, 100000);
    expect(result.valid).toBe(true);
  });

  it("rejeita marginBps fora de range", () => {
    const result = validateMarginParams(10001, 100000);
    expect(result.valid).toBe(false);
  });

  it("rejeita baseCents negativo", () => {
    const result = validateMarginParams(1500, -1);
    expect(result.valid).toBe(false);
  });
});

// ── validateEntryAmount ────────────────────────────────────
describe("validations/validateEntryAmount", () => {
  it("aceita entrada válida", () => {
    const result = validateEntryAmount(1000, 5000);
    expect(result.valid).toBe(true);
  });

  it("rejeita entrada negativa", () => {
    const result = validateEntryAmount(-1, 5000);
    expect(result.valid).toBe(false);
  });

  it("rejeita entrada excede total", () => {
    const result = validateEntryAmount(6000, 5000);
    expect(result.valid).toBe(false);
  });

  it("aceita entrada zero", () => {
    const result = validateEntryAmount(0, 5000);
    expect(result.valid).toBe(true);
  });
});