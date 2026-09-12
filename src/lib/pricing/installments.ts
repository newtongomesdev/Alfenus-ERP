// ============================================================
// INSTALLMENTS — Divisão de parcelas
// Motor puro, determinístico, sem side effects
// ============================================================

import type { PricingInstallment, InstallmentFrequency } from "./calculation-types";
import { assertSafeCents } from "./currency";
import { InvalidInstallmentCountError, InvalidInstallmentDateError } from "./errors";

// ── Limites ────────────────────────────────────────────────
const MAX_INSTALLMENT_COUNT = 120;

// ── Obter dias no mês ──────────────────────────────────────
export function getDaysInMonth(year: number, month: number): number {
  // month é 1-based (1 = janeiro, 12 = dezembro)
  return new Date(year, month, 0).getDate();
}

// ── Formatar data ISO (YYYY-MM-DD) ─────────────────────────
function formatISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Avançar dias ───────────────────────────────────────────
function addDaysToDate(year: number, month: number, day: number, days: number): string {
  const d = new Date(year, month - 1, day + days);
  return formatISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// ── Avançar meses (clampa para último dia válido do mês) ──
function advanceMonths(year: number, month: number, day: number, months: number): string {
  const newMonth = month + months;
  const newYear = year + Math.floor((newMonth - 1) / 12);
  const m = ((newMonth - 1) % 12) + 1;
  const maxDay = getDaysInMonth(newYear, m);
  return formatISO(newYear, m, Math.min(day, maxDay));
}

// ── Avançar data por frequência ────────────────────────────
export function advanceDate(
  dateStr: string,
  frequency: InstallmentFrequency,
  customIntervalDays?: number,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);

  switch (frequency) {
    case "weekly":
      return addDaysToDate(year, month, day, 7);
    case "biweekly":
      return addDaysToDate(year, month, day, 14);
    case "monthly":
      return advanceMonths(year, month, day, 1);
    case "bimonthly":
      return advanceMonths(year, month, day, 2);
    case "quarterly":
      return advanceMonths(year, month, day, 3);
    case "custom_days": {
      if (customIntervalDays === undefined || !Number.isInteger(customIntervalDays) || customIntervalDays < 1) {
        throw new InvalidInstallmentCountError({
          message: `customIntervalDays inválido para frequência custom_days: ${String(customIntervalDays)}`,
          safeMessage: "Intervalo de dias personalizado inválido.",
          field: "customIntervalDays",
        });
      }
      return addDaysToDate(year, month, day, customIntervalDays);
    }
  }
}

// ── Validar data no formato ISO ────────────────────────────
function isValidISODate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getDaysInMonth(year, month)) return false;
  return true;
}

// ── Gerar datas de vencimento ──────────────────────────────
export function generateDueDates(
  firstDueDate: string,
  count: number,
  frequency: InstallmentFrequency,
  customIntervalDays?: number,
): string[] {
  if (!isValidISODate(firstDueDate)) {
    throw new InvalidInstallmentDateError({
      message: `Data de vencimento inválida: ${firstDueDate}`,
      safeMessage: "Data de vencimento inválida.",
      field: "firstDueDate",
      metadata: { received: firstDueDate },
    });
  }

  const dates: string[] = [];
  let currentDate = firstDueDate;
  for (let i = 0; i < count; i++) {
    dates.push(currentDate);
    if (i < count - 1) {
      currentDate = advanceDate(currentDate, frequency, customIntervalDays);
    }
  }
  return dates;
}

// ── Parâmetros de divisão de parcelas ──────────────────────
export interface DivideIntoInstallmentsParams {
  totalCents: number;
  installmentCount: number;
  firstDueDate: string;
  frequency: InstallmentFrequency;
  customIntervalDays?: number;
}

// ── Dividir em parcelas ────────────────────────────────────
export function divideIntoInstallments(params: DivideIntoInstallmentsParams): PricingInstallment[] {
  const { totalCents, installmentCount, firstDueDate, frequency, customIntervalDays } = params;

  // Validação do número de parcelas
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new InvalidInstallmentCountError({
      message: `Número de parcelas inválido: ${installmentCount}`,
      safeMessage: "Número de parcelas inválido.",
      field: "installmentCount",
      metadata: { received: String(installmentCount) },
    });
  }

  if (installmentCount > MAX_INSTALLMENT_COUNT) {
    throw new InvalidInstallmentCountError({
      message: `Número de parcelas excede o limite máximo de ${MAX_INSTALLMENT_COUNT}: ${installmentCount}`,
      safeMessage: `Número de parcelas excede o limite de ${MAX_INSTALLMENT_COUNT}.`,
      field: "installmentCount",
      metadata: { received: String(installmentCount), max: MAX_INSTALLMENT_COUNT },
    });
  }

  // Validação da data de vencimento
  if (!isValidISODate(firstDueDate)) {
    throw new InvalidInstallmentDateError({
      message: `Data de vencimento inválida: ${firstDueDate}`,
      safeMessage: "Data de vencimento inválida.",
      field: "firstDueDate",
      metadata: { received: firstDueDate },
    });
  }

  // Validação do valor total
  assertSafeCents(totalCents);

  // Se totalCents <= 0, retornar array vazio
  if (totalCents <= 0) {
    return [];
  }

  // Se totalCents < installmentCount, parcela base seria zero (retornar array vazio)
  if (totalCents < installmentCount) {
    return [];
  }

  // Calcular parcela base
  const base = Math.floor(totalCents / installmentCount);
  const dates = generateDueDates(firstDueDate, installmentCount, frequency, customIntervalDays);

  const installments: PricingInstallment[] = [];

  for (let i = 0; i < installmentCount; i++) {
    const isLast = i === installmentCount - 1;
    const amountCents = isLast ? totalCents - base * (installmentCount - 1) : base;
    const roundingAdjustmentCents = isLast ? amountCents - base : 0;

    installments.push({
      number: i + 1,
      amountCents,
      dueDate: dates[i],
      principalCents: amountCents,
      roundingAdjustmentCents,
      status: "pending",
    });
  }

  return installments;
}