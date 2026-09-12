import { describe, it, expect } from "vitest";
import {
  formatCents,
  formValueToCents,
  centsToFormValue,
  calculateScenario,
  calculateAllScenarios,
  generateSimulationId,
} from "../engine";
import { DEFAULT_SCENARIOS, CHARGING_MODEL_CONFIGS, getChargingModelConfig } from "../constants";
import type { SimulatorInput } from "../types";

// ── Mock input base ────────────────────────────────────────
const baseInput: SimulatorInput = {
  serviceName: "Consulta Inicial",
  chargingModel: "fixo",
  practiceArea: "civel",
  baseValueCents: 500000, // R$ 5.000,00
  estimatedExpensesCents: 10000, // R$ 100,00
};

describe("fee-simulator/engine", () => {
  it("formatCents formata corretamente", () => {
    expect(formatCents(0)).toBe("R$ 0,00");
    expect(formatCents(100)).toBe("R$ 1,00");
    expect(formatCents(500000)).toBe("R$ 5.000,00");
    expect(formatCents(1234567)).toBe("R$ 12.345,67");
  });

  it("formValueToCents converte string para centavos", () => {
    expect(formValueToCents("5000,00")).toBe(500000);
    expect(formValueToCents("1.500,50")).toBe(150050);
    expect(formValueToCents("100")).toBe(10000);
    expect(formValueToCents("")).toBe(0);
    expect(formValueToCents("abc")).toBe(0);
  });

  it("centsToFormValue converte centavos para string", () => {
    expect(centsToFormValue(500000)).toBe("5000,00");
    expect(centsToFormValue(null)).toBe("");
    expect(centsToFormValue(undefined)).toBe("");
  });

  it("generateSimulationId gera IDs únicos", () => {
    const id1 = generateSimulationId();
    const id2 = generateSimulationId();
    expect(id1).toMatch(/^sim_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe("fee-simulator/engine — cálculos por modelo", () => {
  it("fixo: calcula valor fixo + despesas", () => {
    const result = calculateScenario(baseInput, DEFAULT_SCENARIOS[1]); // padrão (1.0)
    expect(result.baseFeeCents).toBe(500000);
    expect(result.expensesCents).toBe(10000);
    expect(result.totalFeeCents).toBe(510000);
  });

  it("consulta: mesmo comportamento do fixo", () => {
    const input = { ...baseInput, chargingModel: "consulta" as const };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.totalFeeCents).toBe(510000);
  });

  it("por_hora: multiplica hora × valor-hora × multiplicador", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "por_hora",
      hourlyRateCents: 30000, // R$ 300/h
      estimatedHours: 20,
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]); // padrão 1.0
    expect(result.baseFeeCents).toBe(600000); // 30000 × 20
    expect(result.hourlyEffectiveCents).toBe(30500); // (600000 + 10000 despesas) / 20
  });

  it("por_atividade: multiplica qtd × preço-unitário", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "por_atividade",
      unitPriceCents: 15000, // R$ 150
      quantity: 10,
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.baseFeeCents).toBe(150000); // 15000 × 10
  });

  it("mensalidade: valor mensal recorrente", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "mensalidade",
      monthlyValueCents: 200000, // R$ 2.000/mês
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.baseFeeCents).toBe(200000);
    expect(result.monthlyEffectiveCents).toBe(210000); // 200000 + 10000 despesas
  });

  it("exito: percentual sobre valor da causa", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "exito",
      baseValueCents: 10000000, // R$ 100.000 causa
      successFeePercentage: 10,
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.baseFeeCents).toBe(1000000); // 10% de 10M
    expect(result.successFeeValueCents).toBe(1000000);
  });

  it("hibrido: fixo + êxito", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "hibrido",
      baseValueCents: 500000,
      successFeePercentage: 15,
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.baseFeeCents).toBe(500000); // fixo
    expect(result.successFeeValueCents).toBe(500000); // referência
  });

  it("parcelado: divide em parcelas", () => {
    const input: SimulatorInput = {
      ...baseInput,
      chargingModel: "parcelado",
      baseValueCents: 600000,
      numberOfInstallments: 6,
      upfrontPercentage: 20,
    };
    const result = calculateScenario(input, DEFAULT_SCENARIOS[1]);
    expect(result.numberOfInstallments).toBe(6);
    expect(result.upfrontValueCents).toBe(122000); // 20% de 610000 (base + despesas)
    expect(result.installmentValueCents).toBe(81333); // (610000 - 122000) / 6
  });
});

describe("fee-simulator/engine — cenários", () => {
  it("conservador aplica multiplicador 0.8", () => {
    const result = calculateScenario(baseInput, DEFAULT_SCENARIOS[0]);
    expect(result.scenarioLevel).toBe("conservador");
    expect(result.baseFeeCents).toBe(400000); // 500000 × 0.8
  });

  it("padrão aplica multiplicador 1.0", () => {
    const result = calculateScenario(baseInput, DEFAULT_SCENARIOS[1]);
    expect(result.scenarioLevel).toBe("padrao");
    expect(result.baseFeeCents).toBe(500000);
  });

  it("agressivo aplica multiplicador 1.25", () => {
    const result = calculateScenario(baseInput, DEFAULT_SCENARIOS[2]);
    expect(result.scenarioLevel).toBe("agressivo");
    expect(result.baseFeeCents).toBe(625000); // 500000 × 1.25
  });

  it("calculateAllScenarios retorna 3 resultados", () => {
    const results = calculateAllScenarios(baseInput);
    expect(results).toHaveLength(3);
    expect(results[0].scenarioLevel).toBe("conservador");
    expect(results[1].scenarioLevel).toBe("padrao");
    expect(results[2].scenarioLevel).toBe("agressivo");
  });
});

describe("fee-simulator/constants", () => {
  it("DEFAULT_SCENARIOS tem 3 cenários", () => {
    expect(DEFAULT_SCENARIOS).toHaveLength(3);
  });

  it("CHARGING_MODEL_CONFIGS tem 9 modelos", () => {
    expect(CHARGING_MODEL_CONFIGS).toHaveLength(9);
  });

  it("getChargingModelConfig retorna config correta", () => {
    const config = getChargingModelConfig("por_hora");
    expect(config.value).toBe("por_hora");
    expect(config.requiredFields).toContain("hourlyRateCents");
    expect(config.requiredFields).toContain("estimatedHours");
  });

  it("getChargingModelConfig retorna fallback para modelo desconhecido", () => {
    const config = getChargingModelConfig("desconhecido");
    expect(config.value).toBe("consulta");
  });
});
