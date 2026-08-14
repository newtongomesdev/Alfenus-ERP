import { describe, it, expect } from "vitest";
import { diffParameters, diffResults, compareVersions } from "../diff";
import type { PricingScenarioVersionRow } from "../types";

// ─── Helpers ──────────────────────────────────────────

function makeVersion(overrides: Partial<PricingScenarioVersionRow> = {}): PricingScenarioVersionRow {
  return {
    id: "ver-1",
    law_firm_id: "firm-1",
    pricing_scenario_id: "sc-1",
    created_by: "user-1",
    version_number: 1,
    scenario_type: "main",
    parameters: {},
    calculation_result: {},
    calculation_memory: {},
    currency: "BRL",
    total_amount_cents: 100000,
    entry_amount_cents: 20000,
    financed_amount_cents: 80000,
    installment_count: 6,
    success_fee_percentage_bps: 500,
    success_fee_base_cents: 100000,
    estimated_success_fee_cents: 5000,
    monthly_fee_cents: 1500,
    monthly_fee_count: 12,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── diffParameters ───────────────────────────────────

describe("diff/diffParameters", () => {
  it("retorna array vazio quando versões são idênticas", () => {
    const a = makeVersion();
    const b = makeVersion();
    expect(diffParameters(a, b)).toEqual([]);
  });

  it("detecta diferenças em colunas diretas", () => {
    const a = makeVersion({ currency: "BRL", total_amount_cents: 100000 });
    const b = makeVersion({ currency: "USD", total_amount_cents: 200000 });
    const diffs = diffParameters(a, b);

    expect(diffs.length).toBe(2);
    expect(diffs.some((d) => d.field === "currency")).toBe(true);
    expect(diffs.some((d) => d.field === "total_amount_cents")).toBe(true);
  });

  it("detecta diferenças em parameters (JSONB)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = makeVersion({ parameters: { feeType: "fixed" } as any });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = makeVersion({ parameters: { feeType: "hourly" } as any });
    const diffs = diffParameters(a, b);

    expect(diffs.some((d) => d.field === "params.feeType")).toBe(true);
  });

  it("usa labels em português para campos conhecidos", () => {
    const a = makeVersion({ installment_count: 1 });
    const b = makeVersion({ installment_count: 3 });
    const diffs = diffParameters(a, b);

    expect(diffs[0].label).toBe("Parcelas");
  });

  it("usa key como label para campos desconhecidos", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = makeVersion({ parameters: {CampoNovo: "A"} as any });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = makeVersion({ parameters: {CampoNovo: "B"} as any });
    const diffs = diffParameters(a, b);

    expect(diffs[0].label).toBe("CampoNovo");
  });

  it("detecta diferença em success_fee_percentage_bps", () => {
    const a = makeVersion({ success_fee_percentage_bps: 500 });
    const b = makeVersion({ success_fee_percentage_bps: 1000 });
    const diffs = diffParameters(a, b);

    expect(diffs.some((d) => d.field === "success_fee_percentage_bps")).toBe(true);
  });

  it("não incluicampos que não mudaram", () => {
    const a = makeVersion({
      currency: "BRL",
      total_amount_cents: 100000,
      installment_count: 6,
    });
    const b = makeVersion({
      currency: "BRL",
      total_amount_cents: 100000,
      installment_count: 6,
    });
    expect(diffParameters(a, b)).toEqual([]);
  });
});

// ─── diffResults ──────────────────────────────────────

describe("diff/diffResults", () => {
  it("retorna array vazio quando resultados são idênticos", () => {
    const a = makeVersion();
    const b = makeVersion();
    expect(diffResults(a, b)).toEqual([]);
  });

  it("detecta diferença numérica e calcula delta", () => {
    const a = makeVersion({ total_amount_cents: 100000 });
    const b = makeVersion({ total_amount_cents: 120000 });
    const diffs = diffResults(a, b);

    expect(diffs.some((d) => d.field === "total_amount_cents")).toBe(true);
    const diff = diffs.find((d) => d.field === "total_amount_cents")!;
    expect(diff.valueA).toBe(100000);
    expect(diff.valueB).toBe(120000);
    expect(diff.delta).toBe(20000);
    expect(diff.deltaPercentage).toBe(20);
  });

  it("calcula delta percentual correto", () => {
    const a = makeVersion({ total_amount_cents: 200000 });
    const b = makeVersion({ total_amount_cents: 100000 });
    const diffs = diffResults(a, b);

    const diff = diffs.find((d) => d.field === "total_amount_cents")!;
    expect(diff.delta).toBe(-100000);
    expect(diff.deltaPercentage).toBe(-50);
  });

  it("deltaPercentage é null quando valueA é 0", () => {
    const a = makeVersion({ total_amount_cents: 0 });
    const b = makeVersion({ total_amount_cents: 1000 });
    const diffs = diffResults(a, b);

    const diff = diffs.find((d) => d.field === "total_amount_cents")!;
    expect(diff.delta).toBe(1000);
    expect(diff.deltaPercentage).toBeNull();
  });

  it("delta é null quando um dos valores é null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = makeVersion({ estimated_success_fee_cents: null } as any);
    const b = makeVersion({ estimated_success_fee_cents: 5000 });
    const diffs = diffResults(a, b);

    const diff = diffs.find((d) => d.field === "estimated_success_fee_cents")!;
    expect(diff.valueA).toBeNull();
    expect(diff.valueB).toBe(5000);
    expect(diff.delta).toBeNull();
    expect(diff.deltaPercentage).toBeNull();
  });

  it("usa labels em português para campos conhecidos", () => {
    const a = makeVersion({ installment_count: 1 });
    const b = makeVersion({ installment_count: 3 });
    const diffs = diffResults(a, b);

    expect(diffs[0].label).toBe("Parcelas");
  });

  it("não inclui campos sem alteração", () => {
    const a = makeVersion({ installment_count: 6 });
    const b = makeVersion({ installment_count: 6 });
    expect(diffResults(a, b)).toEqual([]);
  });
});

// ─── compareVersions ──────────────────────────────────

describe("diff/compareVersions", () => {
  it("retorna ComparisonResult com ambos os tipos de diff", () => {
    const a = makeVersion({ id: "ver-1", version_number: 1 });
    const b = makeVersion({ id: "ver-2", version_number: 2, currency: "USD" });

    const result = compareVersions(a, b);

    expect(result.versionIdA).toBe("ver-1");
    expect(result.versionIdB).toBe("ver-2");
    expect(result.versionNumberA).toBe(1);
    expect(result.versionNumberB).toBe(2);
    expect(result.sameEngine).toBe(true);
    expect(result.diffs).toBeDefined();
    expect(result.resultDiffs).toBeDefined();
  });

  it("identicalInputs é true quando não há diff de parâmetros", () => {
    const a = makeVersion();
    const b = makeVersion();
    const result = compareVersions(a, b);

    expect(result.identicalInputs).toBe(true);
    expect(result.identicalResults).toBe(true);
  });

  it("identicalInputs é false quando há diff de parâmetros", () => {
    const a = makeVersion({ currency: "BRL" });
    const b = makeVersion({ currency: "USD" });
    const result = compareVersions(a, b);

    expect(result.identicalInputs).toBe(false);
  });

  it("identicalResults é false quando há diff de resultados", () => {
    const a = makeVersion({ total_amount_cents: 100000 });
    const b = makeVersion({ total_amount_cents: 200000 });
    const result = compareVersions(a, b);

    expect(result.identicalResults).toBe(false);
  });
});