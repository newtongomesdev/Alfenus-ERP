import { describe, expect, it } from "vitest";

import { brlFormatter, formatCurrencyFromCents, formatDate, formatDateTime, integerFormatter } from "./formatters";

describe("brlFormatter", () => {
  it("formata centavos em reais", () => {
    expect(brlFormatter.format(1234.56)).toBe("R$\u00a01.234,56");
  });

  it("formata zero", () => {
    expect(brlFormatter.format(0)).toBe("R$\u00a00,00");
  });
});

describe("integerFormatter", () => {
  it("formata número inteiro com separador de milhar", () => {
    expect(integerFormatter.format(1234567)).toBe("1.234.567");
  });
});

describe("formatCurrencyFromCents", () => {
  it("converte centavos para BRL", () => {
    expect(formatCurrencyFromCents(100_00)).toBe("R$\u00a0100,00");
  });

  it("trata centavos residuais", () => {
    expect(formatCurrencyFromCents(199)).toBe("R$\u00a01,99");
  });

  it("formata zero", () => {
    expect(formatCurrencyFromCents(0)).toBe("R$\u00a00,00");
  });

  it("formata valores grandes", () => {
    expect(formatCurrencyFromCents(1_000_000_00)).toBe("R$\u00a01.000.000,00");
  });
});

describe("formatDate", () => {
  it("formata data no padrão pt-BR", () => {
    expect(formatDate("2025-03-15T12:00:00")).toBe("15/03/2025");
  });

  it("formata primeiro dia do ano", () => {
    expect(formatDate("2026-01-01T00:00:00")).toBe("01/01/2026");
  });
});

describe("formatDateTime", () => {
  it("formata data e hora no padrão pt-BR", () => {
    const result = formatDateTime("2025-06-20T14:30:00");
    expect(result).toBe("20/06/2025 às 14:30");
  });
});
