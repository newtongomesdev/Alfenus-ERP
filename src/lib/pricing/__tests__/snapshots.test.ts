import { describe, it, expect } from "vitest";
import {
  serializeSnapshot,
  type ServiceSnapshot,
  type ClientSnapshot,
  type LeadSnapshot,
} from "../snapshots";

// ─── serializeSnapshot ────────────────────────────────

describe("snapshots/serializeSnapshot", () => {
  it("serializa ServiceSnapshot corretamente", () => {
    const snapshot: ServiceSnapshot = {
      serviceId: "svc-1",
      name: "Desenvolvimento de Petição",
      category: "Cível",
      description: "Redação de petição inicial",
      basePriceCents: 50000,
      currency: "BRL",
      isActive: true,
      snapshotAt: "2026-01-15T10:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);

    expect(result).toEqual(snapshot);
    expect(result.serviceId).toBe("svc-1");
    expect(result.name).toBe("Desenvolvimento de Petição");
    expect(result.category).toBe("Cível");
    expect(result.description).toBe("Redação de petição inicial");
    expect(result.basePriceCents).toBe(50000);
    expect(result.currency).toBe("BRL");
    expect(result.isActive).toBe(true);
    expect(result.snapshotAt).toBe("2026-01-15T10:00:00.000Z");
  });

  it("serializa ClientSnapshot corretamente", () => {
    const snapshot: ClientSnapshot = {
      clientId: "cli-1",
      name: "João da Silva",
      snapshotAt: "2026-02-01T12:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);

    expect(result).toEqual(snapshot);
    expect(result.clientId).toBe("cli-1");
    expect(result.name).toBe("João da Silva");
    expect(result.snapshotAt).toBe("2026-02-01T12:00:00.000Z");
  });

  it("serializa LeadSnapshot corretamente", () => {
    const snapshot: LeadSnapshot = {
      leadId: "lead-1",
      name: "Maria Lima",
      email: "maria@email.com",
      phone: "+5511999887766",
      snapshotAt: "2026-03-10T08:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);

    expect(result).toEqual(snapshot);
    expect(result.leadId).toBe("lead-1");
    expect(result.name).toBe("Maria Lima");
    expect(result.email).toBe("maria@email.com");
    expect(result.phone).toBe("+5511999887766");
  });

  it("preserva campos nulos no snapshot de lead", () => {
    const snapshot: LeadSnapshot = {
      leadId: "lead-2",
      name: "Pedro Souza",
      email: null,
      phone: null,
      snapshotAt: "2026-03-10T08:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it("retorna um novo objeto (não é referência ao original)", () => {
    const snapshot: ServiceSnapshot = {
      serviceId: "svc-1",
      name: "Teste",
      category: null,
      description: null,
      basePriceCents: 10000,
      currency: "BRL",
      isActive: true,
      snapshotAt: "2026-01-01T00:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);
    expect(result).not.toBe(snapshot);
  });

  it("preserva todos os campos do snapshot", () => {
    const snapshot: ServiceSnapshot = {
      serviceId: "svc-5",
      name: "Auditoria",
      category: "Contábil",
      description: "Auditoria completa",
      basePriceCents: 100000,
      currency: "BRL",
      isActive: false,
      snapshotAt: "2026-06-01T00:00:00.000Z",
    };

    const result = serializeSnapshot(snapshot);
    const keys = Object.keys(result);
    expect(keys).toContain("serviceId");
    expect(keys).toContain("name");
    expect(keys).toContain("category");
    expect(keys).toContain("description");
    expect(keys).toContain("basePriceCents");
    expect(keys).toContain("currency");
    expect(keys).toContain("isActive");
    expect(keys).toContain("snapshotAt");
  });
});