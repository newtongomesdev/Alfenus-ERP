import { describe, it, expect } from "vitest";
import {
  assertSafeCents,
  addCents,
  subtractCents,
  multiplyCents,
  divideCents,
  sumCents,
  clampCents,
  roundCents,
  formatCentsToCurrency,
  parseCurrencyToCents,
  hoursToMinutes,
  minutesToCents,
  hoursToCents,
  isValidCents,
  toPositiveCents,
  toNonNegativeCents,
  centsToDecimal,
  decimalToCents,
} from "../currency";
import { InvalidMoneyValueError, UnsafeIntegerError } from "../errors";

// ── assertSafeCents ──────────────────────────────────────
describe("currency/assertSafeCents", () => {
  it("aceita valor válido", () => {
    expect(assertSafeCents(100)).toBe(100);
    expect(assertSafeCents(0)).toBe(0);
    expect(assertSafeCents(-100)).toBe(-100);
  });

  it("lança erro para NaN", () => {
    expect(() => assertSafeCents(NaN)).toThrow(InvalidMoneyValueError);
  });

  it("lança erro para Infinity", () => {
    expect(() => assertSafeCents(Infinity)).toThrow(InvalidMoneyValueError);
    expect(() => assertSafeCents(-Infinity)).toThrow(InvalidMoneyValueError);
  });

  it("lança erro para não inteiro", () => {
    expect(() => assertSafeCents(1.5)).toThrow(UnsafeIntegerError);
  });

  it("lança erro para valor fora de faixa (acima)", () => {
    expect(() => assertSafeCents(9999999999999 + 1)).toThrow(UnsafeIntegerError);
  });

  it("lança erro para valor fora de faixa (abaixo)", () => {
    expect(() => assertSafeCents(-9999999999999 - 1)).toThrow(UnsafeIntegerError);
  });

  it("lança erro para string", () => {
    expect(() => assertSafeCents("100" as unknown as number)).toThrow(InvalidMoneyValueError);
  });

  it("lança erro para null", () => {
    expect(() => assertSafeCents(null as unknown as number)).toThrow(InvalidMoneyValueError);
  });
});

// ── addCents ──────────────────────────────────────────────
describe("currency/addCents", () => {
  it("soma dois valores positivos", () => {
    expect(addCents(100, 200)).toBe(300);
  });

  it("soma valor negativo", () => {
    expect(addCents(100, -50)).toBe(50);
  });

  it("soma zero", () => {
    expect(addCents(100, 0)).toBe(100);
  });

  it("lança erro se resultado for fora de faixa", () => {
    expect(() => addCents(9999999999999, 1)).toThrow();
  });
});

// ── subtractCents ─────────────────────────────────────────
describe("currency/subtractCents", () => {
  it("subtrai dois valores", () => {
    expect(subtractCents(500, 200)).toBe(300);
  });

  it("subtrai valor maior", () => {
    expect(subtractCents(100, 200)).toBe(-100);
  });

  it("lança erro se resultado for fora de faixa", () => {
    expect(() => subtractCents(-9999999999999, 1)).toThrow();
  });
});

// ── multiplyCents ──────────────────────────────────────────
describe("currency/multiplyCents", () => {
  it("multiplica por inteiro", () => {
    expect(multiplyCents(100, 3)).toBe(300);
  });

  it("multiplica por zero", () => {
    expect(multiplyCents(100, 0)).toBe(0);
  });

  it("multiplica por fração e arredonda", () => {
    expect(multiplyCents(100, 1.5)).toBe(150);
  });

  it("lança erro para multiplicador NaN", () => {
    expect(() => multiplyCents(100, NaN)).toThrow(InvalidMoneyValueError);
  });

  it("lança erro para multiplicador Infinity", () => {
    expect(() => multiplyCents(100, Infinity)).toThrow(InvalidMoneyValueError);
  });
});

// ── divideCents ────────────────────────────────────────────
describe("currency/divideCents", () => {
  it("divide dois valores", () => {
    expect(divideCents(600, 3)).toBe(200);
  });

  it("arredonda resultado", () => {
    expect(divideCents(100, 3)).toBe(33);
  });

  it("lança erro para divisão por zero", () => {
    expect(() => divideCents(100, 0)).toThrow(InvalidMoneyValueError);
  });
});

// ── sumCents ────────────────────────────────────────────────
describe("currency/sumCents", () => {
  it("soma array de valores", () => {
    expect(sumCents([100, 200, 300])).toBe(600);
  });

  it("soma array vazio retorna zero", () => {
    expect(sumCents([])).toBe(0);
  });

  it("arredonda valores não inteiros", () => {
    expect(sumCents([100.4, 200.6])).toBe(301);
  });
});

// ── clampCents ─────────────────────────────────────────────
describe("currency/clampCents", () => {
  it("clampa para máximo", () => {
    expect(clampCents(150, 0, 100)).toBe(100);
  });

  it("clampa para mínimo", () => {
    expect(clampCents(-10, 0, 100)).toBe(0);
  });

  it("mantém valor dentro de faixa", () => {
    expect(clampCents(50, 0, 100)).toBe(50);
  });
});

// ── roundCents ──────────────────────────────────────────────
describe("currency/roundCents", () => {
  it("arredonda para cima", () => {
    expect(roundCents(100.6)).toBe(101);
  });

  it("arredonda para baixo", () => {
    expect(roundCents(100.4)).toBe(100);
  });

  it("mantém inteiro", () => {
    expect(roundCents(100)).toBe(100);
  });
});

// ── formatCentsToCurrency ──────────────────────────────────
describe("currency/formatCentsToCurrency", () => {
  it("formata valor positivo", () => {
    const result = formatCentsToCurrency(100);
    expect(result).toContain("R$");
    expect(result).toContain("1,00");
  });

  it("formata zero", () => {
    const result = formatCentsToCurrency(0);
    expect(result).toContain("R$");
  });

  it("formata valor negativo", () => {
    const result = formatCentsToCurrency(-500);
    expect(result).toContain("R$");
  });
});

// ── parseCurrencyToCents ───────────────────────────────────
describe("currency/parseCurrencyToCents", () => {
  it("parseia R$ com ponto de milhar e vírgula decimal", () => {
    expect(parseCurrencyToCents("1.234,56")).toBe(123456);
  });

  it("parseia valor com R$ e vírgula", () => {
    expect(parseCurrencyToCents("R$ 100,00")).toBe(10000);
  });

  it("parseia valor simples com vírgula", () => {
    expect(parseCurrencyToCents("100,00")).toBe(10000);
  });

  it("lança erro para valor inválido", () => {
    expect(() => parseCurrencyToCents("abc")).toThrow(InvalidMoneyValueError);
  });

  it("lança erro para não string", () => {
    expect(() => parseCurrencyToCents(100 as unknown as string)).toThrow(InvalidMoneyValueError);
  });
});

// ── hoursToMinutes ─────────────────────────────────────────
describe("currency/hoursToMinutes", () => {
  it("converte 1 hora para 60 minutos", () => {
    expect(hoursToMinutes(1)).toBe(60);
  });

  it("converte 2.5 horas para 150 minutos", () => {
    expect(hoursToMinutes(2.5)).toBe(150);
  });

  it("converte 0 horas para 0 minutos", () => {
    expect(hoursToMinutes(0)).toBe(0);
  });
});

// ── minutesToCents ─────────────────────────────────────────
describe("currency/minutesToCents", () => {
  it("calcula valor em centavos (rate per minute arredondado)", () => {
    // hourlyRateCents=60 → rateIdMinuto=1 → 60 min → 60
    expect(minutesToCents(60, 60)).toBe(60);
  });

  it("calcula valor para 30 minutos com rate=120 (2/min)", () => {
    expect(minutesToCents(30, 120)).toBe(60);
  });

  it("lança erro para minutos negativos", () => {
    expect(() => minutesToCents(-1, 100)).toThrow(InvalidMoneyValueError);
  });
});

// ── hoursToCents ───────────────────────────────────────────
describe("currency/hoursToCents", () => {
  it("calcula valor para 2 horas com hourlyRate de 60 (1/min)", () => {
    expect(hoursToCents(2, 60)).toBe(120);
  });

  it("calcula valor para 1 hora com hourlyRate de 500 (8/min arredondado)", () => {
    // ratePerMinute = Math.round(500/60) = 8
    // 60 min * 8 = 480
    expect(hoursToCents(1, 500)).toBe(480);
  });

  it("lança erro para horas negativas", () => {
    expect(() => hoursToCents(-1, 100)).toThrow(InvalidMoneyValueError);
  });
});

// ── isValidCents ───────────────────────────────────────────
describe("currency/isValidCents", () => {
  it("retorna true para valor válido", () => {
    expect(isValidCents(100)).toBe(true);
    expect(isValidCents(0)).toBe(true);
    expect(isValidCents(-100)).toBe(true);
  });

  it("retorna false para NaN", () => {
    expect(isValidCents(NaN)).toBe(false);
  });

  it("retorna false para Infinity", () => {
    expect(isValidCents(Infinity)).toBe(false);
  });

  it("retorna false para não inteiro", () => {
    expect(isValidCents(1.5)).toBe(false);
  });

  it("retorna false para string", () => {
    expect(isValidCents("100")).toBe(false);
  });
});

// ── toPositiveCents ────────────────────────────────────────
describe("currency/toPositiveCents", () => {
  it("retorna valor positivo", () => {
    expect(toPositiveCents(-100)).toBe(100);
  });

  it("mantém valor positivo", () => {
    expect(toPositiveCents(100)).toBe(100);
  });
});

// ── toNonNegativeCents ─────────────────────────────────────
describe("currency/toNonNegativeCents", () => {
  it("retorna zero para valor negativo", () => {
    expect(toNonNegativeCents(-100)).toBe(0);
  });

  it("mantém valor positivo", () => {
    expect(toNonNegativeCents(100)).toBe(100);
  });

  it("mantém zero", () => {
    expect(toNonNegativeCents(0)).toBe(0);
  });
});

// ── centsToDecimal ─────────────────────────────────────────
describe("currency/centsToDecimal", () => {
  it("converte centavos para decimal", () => {
    expect(centsToDecimal(100)).toBe(1);
  });

  it("converte zero", () => {
    expect(centsToDecimal(0)).toBe(0);
  });

  it("converte valor negativo", () => {
    expect(centsToDecimal(-50)).toBe(-0.5);
  });
});

// ── decimalToCents ─────────────────────────────────────────
describe("currency/decimalToCents", () => {
  it("converte decimal para centavos", () => {
    expect(decimalToCents(1.5)).toBe(150);
  });

  it("converte zero", () => {
    expect(decimalToCents(0)).toBe(0);
  });

  it("arredonda corretamente", () => {
    expect(decimalToCents(0.999)).toBe(100);
  });
});