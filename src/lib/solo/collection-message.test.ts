import { describe, expect, it } from "vitest";

import { buildCollectionMessage } from "./collection-message";

describe("Solo collection message", () => {
  it("uses the real client, installment, balance and due date", () => {
    expect(buildCollectionMessage({
      clientName: "Ana Souza",
      contractDescription: "Consultoria trabalhista",
      installmentNumber: 2,
      remainingAmountCents: 125050,
      dueDate: "2026-10-10",
    })).toContain("Olá, Ana Souza. Passando para lembrar sobre a parcela 2 de Consultoria trabalhista, no valor em aberto de R$ 1.250,50, vencida em 10/10/2026.");
  });

  it("uses neutral fallbacks without fake currency or attorney identity", () => {
    const message = buildCollectionMessage({
      clientName: null,
      contractDescription: null,
      installmentNumber: 1,
      remainingAmountCents: 0,
      dueDate: "2026-10-10",
    });

    expect(message).toContain("Olá. Passando para lembrar sobre a parcela 1 de honorários, no valor em aberto de R$ 0,00, vencida em 10/10/2026.");
    expect(message).not.toContain("Dr(a).");
    expect(message).not.toContain("R$ {valor}");
  });
});
