// ============================================================
// PERCENTAGES — Basis points e cálculos percentuais
// Motor puro, determinístico, sem side effects
// ============================================================

import { InvalidPercentageError, UnsafeIntegerError } from "./errors";

// ── Limites ────────────────────────────────────────────────
const MAX_BPS = 10_000; // 100%
const MIN_BPS = 0;

// ── Validação ──────────────────────────────────────────────
export function assertBasisPoints(value: unknown): number {
  if (typeof value !== "number") {
    throw new InvalidPercentageError({
      message: `Valor percentual inválido: ${String(value)}`,
      safeMessage: "Percentual inválido.",
      field: "percentage",
    });
  }
  if (!Number.isFinite(value)) {
    throw new InvalidPercentageError({
      message: `Percentual não finito: ${value}`,
      safeMessage: "Percentual inválido.",
      field: "percentage",
    });
  }
  if (!Number.isInteger(value)) {
    throw new UnsafeIntegerError({
      message: `Percentual deve ser inteiro (bps): ${value}`,
      safeMessage: "Percentual deve ser inteiro.",
      field: "percentage",
    });
  }
  if (value < MIN_BPS || value > MAX_BPS) {
    throw new InvalidPercentageError({
      message: `Percentual fora de faixa: ${value} bps`,
      safeMessage: "Percentual fora do intervalo permitido.",
      field: "percentage",
      metadata: { received: value },
    });
  }
  return value;
}

// ── Aplicar basis points ───────────────────────────────────
export function applyBasisPoints(baseCents: number, bps: number): number {
  // applyBasisPoints(100000, 1500) = 15000 (15% de R$ 1000)
  // Usar: (base * bps) / 10000
  const validatedBps = assertBasisPoints(bps);
  const validatedBase = typeof baseCents === "number" && Number.isFinite(baseCents) ? baseCents : 0;
  const result = Math.round((validatedBase * validatedBps) / 10_000);
  return result;
}

// ── Calcular valor percentual ──────────────────────────────
export function calculatePercentageValue(baseCents: number, percentageBps: number): number {
  return applyBasisPoints(baseCents, percentageBps);
}

// ── Calcular diferença percentual ──────────────────────────
export function calculatePercentageDifference(
  fromCents: number,
  toCents: number
): number {
  if (fromCents === 0) {
    throw new InvalidPercentageError({
      message: "Base de cálculo inválida: 0",
      safeMessage: "Base inválida para comparação percentual.",
      field: "baseCents",
    });
  }
  const diff = toCents - fromCents;
  const pctDiff = Math.round((diff / Math.abs(fromCents)) * 10_000);
  return pctDiff;
}

// ── Calcular percentual do total ───────────────────────────
export function calculatePercentageOfTotal(totalCents: number, partCents: number): number {
  if (totalCents === 0) {
    throw new InvalidPercentageError({
      message: "Total inválido: 0",
      safeMessage: "Total inválido para cálculo percentual.",
      field: "totalCents",
    });
  }
  return Math.round((partCents / Math.abs(totalCents)) * 10_000);
}

// ── Formatar basis points ──────────────────────────────────
export function formatBasisPoints(bps: number): string {
  const value = bps / 100;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted}%`;
}

// ── Converter porcentagem para bps ─────────────────────────
export function percentageToBps(percentage: number): number {
  return Math.round(percentage * 100);
}

// ── Converter bps para porcentagem ─────────────────────────
export function bpsToPercentage(bps: number): number {
  return bps / 100;
}