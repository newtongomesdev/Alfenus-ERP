// ============================================================
// CURRENCY — Representação monetária em centavos
// Motor puro, determinístico, sem side effects
// ============================================================

import { UnsafeIntegerError, InvalidMoneyValueError } from "./errors";

// ── Limites de segurança ──────────────────────────────────
const MAX_SAFE_CENTS = 9_999_999_999_999; // R$ 99.999.999.999,99
const MIN_SAFE_CENTS = -MAX_SAFE_CENTS;

// ── Validação ──────────────────────────────────────────────
export function assertSafeCents(value: unknown): number {
  if (typeof value !== "number") {
    throw new InvalidMoneyValueError({
      message: `Valor monetário inválido: ${String(value)}`,
      safeMessage: "Valor monetário inválido.",
      field: "money",
      metadata: { received: String(value) },
    });
  }
  if (!Number.isFinite(value)) {
    throw new InvalidMoneyValueError({
      message: `Valor monetário não finito: ${value}`,
      safeMessage: "Valor monetário inválido.",
      field: "money",
      metadata: { received: String(value) },
    });
  }
  if (!Number.isInteger(value)) {
    throw new UnsafeIntegerError({
      message: `Valor monetário deve ser inteiro (centavos): ${value}`,
      safeMessage: "Valor monetário deve ser inteiro.",
      field: "money",
      metadata: { received: String(value) },
    });
  }
  if (value < MIN_SAFE_CENTS || value > MAX_SAFE_CENTS) {
    throw new UnsafeIntegerError({
      message: `Valor monetário fora de faixa segura: ${value}`,
      safeMessage: "Valor monetário fora de faixa permitida.",
      field: "money",
      metadata: { received: String(value) },
    });
  }
  return value;
}

// ── Operações básicas ──────────────────────────────────────
export function addCents(a: number, b: number): number {
  return assertSafeCents(a + b);
}

export function subtractCents(a: number, b: number): number {
  return assertSafeCents(a - b);
}

export function multiplyCents(a: number, multiplier: number): number {
  if (!Number.isFinite(multiplier)) {
    throw new InvalidMoneyValueError({
      message: `Multiplicador inválido: ${multiplier}`,
      safeMessage: "Multiplicador inválido.",
      field: "multiplier",
    });
  }
  return assertSafeCents(Math.round(a * multiplier));
}

export function divideCents(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new InvalidMoneyValueError({
      message: "Divisão por zero",
      safeMessage: "Não é possível dividir por zero.",
      field: "denominator",
    });
  }
  return Math.round(numerator / denominator);
}

export function sumCents(values: number[]): number {
  let total = 0;
  for (const v of values) {
    total += Number.isInteger(v) ? v : Math.round(v);
  }
  return assertSafeCents(total);
}

export function clampCents(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundCents(value: number): number {
  return Math.round(value);
}

// ── Formatação ─────────────────────────────────────────────
export function formatCentsToCurrency(cents: number): string {
  assertSafeCents(cents);
  return `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseCurrencyToCents(input: string): number {
  if (typeof input !== "string") {
    throw new InvalidMoneyValueError({
      message: `Não é possível parsear valor: ${String(input)}`,
      safeMessage: "Valor monetário inválido.",
      field: "money",
    });
  }
  const cleaned = input.replace(/[^\d,]/g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) {
    throw new InvalidMoneyValueError({
      message: `Não é possível parsear valor: "${input}"`,
      safeMessage: "Valor monetário inválido.",
      field: "money",
      metadata: { received: input },
    });
  }
  return Math.round(value * 100);
}

// ── Conversão de horas para centavos ───────────────────────
export function hoursToMinutes(hours: number): number {
  assertSafeCents(Math.round(hours * 60)); // valida se não é NaN/Inf
  return Math.round(hours * 60);
}

export function minutesToCents(minutes: number, hourlyRateCents: number): number {
  assertSafeCents(hourlyRateCents);
  if (minutes < 0) {
    throw new InvalidMoneyValueError({
      message: `Minutos não pode ser negativo: ${minutes}`,
      safeMessage: "Valor inválido.",
      field: "minutes",
    });
  }
  // Valor por minuto: hourlyRateCents / 60, arredondado e然后 multiplicado
  const ratePerMinute = Math.round(hourlyRateCents / 60);
  return Math.round(ratePerMinute * minutes);
}

export function hoursToCents(hours: number, hourlyRateCents: number): number {
  assertSafeCents(hourlyRateCents);
  if (hours < 0) {
    throw new InvalidMoneyValueError({
      message: `Horas não pode ser negativo: ${hours}`,
      safeMessage: "Valor inválido.",
      field: "hours",
    });
  }
  const totalMinutes = hoursToMinutes(hours);
  return minutesToCents(totalMinutes, hourlyRateCents);
}

// ── Validação de entrada de moeda ──────────────────────────
export function isValidCents(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= MIN_SAFE_CENTS &&
    value <= MAX_SAFE_CENTS
  );
}

export function toPositiveCents(value: number): number {
  return Math.abs(value);
}

export function toNonNegativeCents(value: number): number {
  return Math.max(0, value);
}

// ── Formatação interna (não para exibição) ─────────────────
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}