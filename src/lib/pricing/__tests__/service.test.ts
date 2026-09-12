import { describe, it, expect } from "vitest";
import type {
  CreateScenarioInput,
  CreateVersionInput,
  UpdateMetadataInput,
} from "../service";

// ─── CreateScenarioInput ──────────────────────────────

describe("service/CreateScenarioInput", () => {
  it("aceita shape válido com todos os campos obrigatórios", () => {
    const input: CreateScenarioInput = {
      name: "Cenário Teste",
      serviceId: "svc-1",
      items: [],
    };

    expect(input.name).toBe("Cenário Teste");
    expect(input.serviceId).toBe("svc-1");
    expect(input.items).toEqual([]);
  });

  it("aceita campos opcionais ausentes", () => {
    const input: CreateScenarioInput = {
      name: "Cenário Simples",
      serviceId: "svc-1",
      items: [],
    };

    expect(input.description).toBeUndefined();
    expect(input.clientId).toBeUndefined();
    expect(input.leadId).toBeUndefined();
  });

  it("aceita campos opcionais preenchidos", () => {
    const input: CreateScenarioInput = {
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
          notes: "Nota",
        },
      ],
    };

    expect(input.description).toBe("Descrição detalhada");
    expect(input.clientId).toBe("cli-1");
    expect(input.leadId).toBe("lead-1");
    expect(input.items).toHaveLength(1);
  });

  it("aceita item sem notes", () => {
    const input: CreateScenarioInput = {
      name: "Cenário",
      serviceId: "svc-1",
      items: [
        {
          serviceName: "Serviço",
          quantityCents: 1,
          unitPriceCents: 10000,
        },
      ],
    };

    expect(input.items[0].notes).toBeUndefined();
  });

  it("aceita items vazios", () => {
    const input: CreateScenarioInput = {
      name: "Sem Itens",
      serviceId: "svc-1",
      items: [],
    };

    expect(input.items).toHaveLength(0);
  });
});

// ─── CreateVersionInput ───────────────────────────────

describe("service/CreateVersionInput", () => {
  it("aceita shape válido com campos obrigatórios", () => {
    const input: CreateVersionInput = {
      scenarioId: "sc-1",
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      currency: "BRL",
      paymentMethod: "single",
      installments: 6,
    };

    expect(input.scenarioId).toBe("sc-1");
    expect(input.scenarioType).toBe("main");
    expect(input.feeType).toBe("fixed");
    expect(input.feeValueCents).toBe(100000);
    expect(input.currency).toBe("BRL");
    expect(input.paymentMethod).toBe("single");
    expect(input.installments).toBe(6);
  });

  it("aceita campos opcionais ausentes", () => {
    const input: CreateVersionInput = {
      scenarioId: "sc-1",
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      currency: "BRL",
      paymentMethod: "single",
      installments: 6,
    };

    expect(input.successFeeRateBps).toBeUndefined();
    expect(input.recurringMonths).toBeUndefined();
    expect(input.billingFrequency).toBeUndefined();
    expect(input.idempotencyKey).toBeUndefined();
    expect(input.forceNewVersion).toBeUndefined();
    expect(input.activate).toBeUndefined();
  });

  it("aceita todos os campos opcionais", () => {
    const input: CreateVersionInput = {
      scenarioId: "sc-1",
      scenarioType: "main",
      feeType: "hourly",
      feeValueCents: 150000,
      currency: "USD",
      paymentMethod: "installment",
      installments: 12,
      successFeeRateBps: 750,
      recurringMonths: 6,
      billingFrequency: "monthly",
      idempotencyKey: "key-123",
      forceNewVersion: true,
      activate: true,
    };

    expect(input.successFeeRateBps).toBe(750);
    expect(input.recurringMonths).toBe(6);
    expect(input.billingFrequency).toBe("monthly");
    expect(input.idempotencyKey).toBe("key-123");
    expect(input.forceNewVersion).toBe(true);
    expect(input.activate).toBe(true);
  });
});

// ─── UpdateMetadataInput ──────────────────────────────

describe("service/UpdateMetadataInput", () => {
  it("aceita shape válido com campos obrigatórios", () => {
    const input: UpdateMetadataInput = {
      scenarioId: "sc-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(input.scenarioId).toBe("sc-1");
    expect(input.expectedUpdatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("aceita campos opcionais ausentes", () => {
    const input: UpdateMetadataInput = {
      scenarioId: "sc-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(input.name).toBeUndefined();
    expect(input.description).toBeUndefined();
  });

  it("aceita name apenas", () => {
    const input: UpdateMetadataInput = {
      scenarioId: "sc-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      name: "Novo Nome",
    };

    expect(input.name).toBe("Novo Nome");
    expect(input.description).toBeUndefined();
  });

  it("aceita description apenas", () => {
    const input: UpdateMetadataInput = {
      scenarioId: "sc-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      description: "Nova descrição",
    };

    expect(input.description).toBe("Nova descrição");
    expect(input.name).toBeUndefined();
  });

  it("aceita ambos os campos opcionais", () => {
    const input: UpdateMetadataInput = {
      scenarioId: "sc-1",
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      name: "Atualizado",
      description: "Nova descrição",
    };

    expect(input.name).toBe("Atualizado");
    expect(input.description).toBe("Nova descrição");
  });
});
