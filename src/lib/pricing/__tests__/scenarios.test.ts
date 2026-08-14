import { describe, it, expect } from "vitest";
import {
  calculatePricingScenario,
  calculateMultiplePricingScenarios,
  comparePricingScenarios,
  calculateScenarioDifferences,
} from "../scenarios";
import type { PricingCalculationInput } from "../calculation-types";

const BASE_INPUT: PricingCalculationInput = {
  scenarioType: "main",
  calculationDate: "2026-01-15",
  currency: "BRL",
  estimatedHours: 10,
  hourlyRateCents: 500,
};

// ── calculatePricingScenario ────────────────────────────────
describe("scenarios/calculatePricingScenario", () => {
  it("calcula cenário com input base", () => {
    const result = calculatePricingScenario(BASE_INPUT);
    expect(result.scenarioType).toBe("main");
    expect(result.result).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.input).toBeDefined();
  });

  it("calcula cenário com overrides", () => {
    const result = calculatePricingScenario(
      BASE_INPUT,
      { scenarioType: "conservative", marginBps: 2000 },
      "Cenário Conservador"
    );
    expect(result.scenarioType).toBe("conservative");
    expect(result.name).toBe("Cenário Conservador");
    expect(result.result.marginAmountCents).toBeGreaterThan(0);
  });

  it("gera nome padrão quando não informado", () => {
    const result = calculatePricingScenario(BASE_INPUT);
    expect(result.name).toBe("Cenário main");
  });

  it("memory contém seções", () => {
    const result = calculatePricingScenario(BASE_INPUT);
    expect(result.memory.sections.length).toBeGreaterThan(0);
  });

  it("memory contém disclaimer", () => {
    const result = calculatePricingScenario(BASE_INPUT);
    expect(result.memory.disclaimer).toBeTruthy();
  });
});

// ── calculateMultiplePricingScenarios ──────────────────────
describe("scenarios/calculateMultiplePricingScenarios", () => {
  it("calcula múltiplos cenários", () => {
    const scenarios = [
      { name: "Conservador", type: "conservative" as const, overrides: { scenarioType: "conservative" as const, marginBps: 2000 } },
      { name: "Principal", type: "main" as const, overrides: { scenarioType: "main" as const, marginBps: 1500 } },
      { name: "Expandido", type: "expanded" as const, overrides: { scenarioType: "expanded" as const, marginBps: 1000 } },
    ];
    const results = calculateMultiplePricingScenarios(BASE_INPUT, scenarios);
    expect(results).toHaveLength(3);
    expect(results[0].scenarioType).toBe("conservative");
    expect(results[1].scenarioType).toBe("main");
    expect(results[2].scenarioType).toBe("expanded");
  });
});

// ── comparePricingScenarios ────────────────────────────────
describe("scenarios/comparePricingScenarios", () => {
  it("compara cenários e retorna diferenças", () => {
    const main = calculatePricingScenario(BASE_INPUT, { scenarioType: "main", marginBps: 1500 });
    const other = calculatePricingScenario(BASE_INPUT, { scenarioType: "conservative", marginBps: 2000 });
    const comparison = comparePricingScenarios(main, [other]);
    expect(comparison.main).toBe(main);
    expect(comparison.others).toHaveLength(1);
    expect(comparison.differences.length).toBeGreaterThan(0);
  });
});

// ── calculateScenarioDifferences ───────────────────────────
describe("scenarios/calculateScenarioDifferences", () => {
  it("calcula diferenças absolutas e percentuais", () => {
    const main = calculatePricingScenario(BASE_INPUT, { scenarioType: "main", marginBps: 1500 });
    const other = calculatePricingScenario(BASE_INPUT, { scenarioType: "main", marginBps: 2000 });
    const diffs = calculateScenarioDifferences(main, other);
    expect(diffs.length).toBeGreaterThan(0);

    const marginDiff = diffs.find((d) => d.field === "marginAmountCents");
    expect(marginDiff).toBeDefined();
    expect(marginDiff!.absoluteDelta).not.toBe(0);
  });

  it("retorna zeros quando cenários iguais", () => {
    const main = calculatePricingScenario(BASE_INPUT, { scenarioType: "main", marginBps: 1500 });
    const same = calculatePricingScenario(BASE_INPUT, { scenarioType: "main", marginBps: 1500 });
    const diffs = calculateScenarioDifferences(main, same);
    for (const d of diffs) {
      expect(d.absoluteDelta).toBe(0);
    }
  });
});