import { describe, it, expect } from "vitest";
import type { CreateScenarioData, PersistVersionData } from "../persistence";

// ─── CreateScenarioData ───────────────────────────────

describe("persistence/CreateScenarioData", () => {
  it("aceita shape válido com todos os campos obrigatórios", () => {
    const data: CreateScenarioData = {
      name: "Cenário Teste",
      serviceId: "svc-1",
      items: [],
    };

    expect(data.name).toBe("Cenário Teste");
    expect(data.serviceId).toBe("svc-1");
    expect(data.items).toEqual([]);
  });

  it("aceita campos opcionais ausentes", () => {
    const data: CreateScenarioData = {
      name: "Cenário Simples",
      serviceId: "svc-1",
      items: [],
    };

    expect(data.description).toBeUndefined();
    expect(data.clientId).toBeUndefined();
    expect(data.leadId).toBeUndefined();
  });

  it("aceita campos opcionais preenchidos", () => {
    const data: CreateScenarioData = {
      name: "Cenário Completo",
      description: "Descrição detalhada",
      serviceId: "svc-2",
      clientId: "cli-1",
      leadId: "lead-1",
      items: [
        {
          serviceName: "Serviço A",
          quantityCents: 2,
          unitPriceCents: 50000,
          notes: "Nota do item",
        },
      ],
    };

    expect(data.description).toBe("Descrição detalhada");
    expect(data.clientId).toBe("cli-1");
    expect(data.leadId).toBe("lead-1");
    expect(data.items).toHaveLength(1);
    expect(data.items[0].serviceName).toBe("Serviço A");
    expect(data.items[0].quantityCents).toBe(2);
    expect(data.items[0].unitPriceCents).toBe(50000);
    expect(data.items[0].notes).toBe("Nota do item");
  });

  it("aceita item sem notes", () => {
    const data: CreateScenarioData = {
      name: "Cenário",
      serviceId: "svc-1",
      items: [
        {
          serviceName: "Serviço X",
          quantityCents: 1,
          unitPriceCents: 10000,
        },
      ],
    };

    expect(data.items[0].notes).toBeUndefined();
  });

  it("aceita items vazios", () => {
    const data: CreateScenarioData = {
      name: "Cenário Sem Itens",
      serviceId: "svc-1",
      items: [],
    };

    expect(data.items).toHaveLength(0);
  });
});

// ─── PersistVersionData ───────────────────────────────

describe("persistence/PersistVersionData", () => {
  it("aceita shape válido com campos obrigatórios", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [
        {
          serviceName: "Serviço A",
          quantityCents: 1,
          unitPriceCents: 50000,
        },
      ],
      params: {
        feeType: "fixed",
        feeValueCents: 50000,
      },
      result: {
        fixedFeeTotalCents: 50000,
        marginAmountCents: 10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      memory: {
        steps: [],
      },
    };

    expect(data.scenarioId).toBe("sc-1");
    expect(data.items).toHaveLength(1);
    expect(data.params).toBeDefined();
    expect(data.memory).toBeDefined();
  });

  it("aceita campos opcionais ausentes", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [],
      params: {},
      result: {
        fixedFeeTotalCents: 0,
        marginAmountCents: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      memory: {},
    };

    expect(data.forceNewVersion).toBeUndefined();
  });

  it("aceita campos opcionais preenchidos", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [],
      params: {},
      result: {
        fixedFeeTotalCents: 100000,
        marginAmountCents: 20000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      memory: {},
      forceNewVersion: true,
    };

    expect(data.forceNewVersion).toBe(true);
  });

  it("aceita item com notes opcional", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [
        {
          serviceName: "Item",
          quantityCents: 1,
          unitPriceCents: 10000,
          notes: "Observação",
        },
      ],
      params: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: { fixedFeeTotalCents: 10000, marginAmountCents: 0 } as any,
      memory: {},
    };

    expect(data.items[0].notes).toBe("Observação");
  });

  it("aceita item sem notes", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [
        {
          serviceName: "Item",
          quantityCents: 1,
          unitPriceCents: 10000,
        },
      ],
      params: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: { fixedFeeTotalCents: 10000, marginAmountCents: 0 } as any,
      memory: {},
    };

    expect(data.items[0].notes).toBeUndefined();
  });

  it("aceita e result com chaves do PricingCalculationResult", () => {
    const data: PersistVersionData = {
      scenarioId: "sc-1",
      items: [],
      params: {},
      result: {
        fixedFeeTotalCents: 150000,
        marginAmountCents: 25000,
        marginBps: 1600,
        totalDiscountCents: 5000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      memory: {},
    };

    expect(data.result.fixedFeeTotalCents).toBe(150000);
    expect(data.result.marginAmountCents).toBe(25000);
  });
});