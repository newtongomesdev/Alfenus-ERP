// ============================================================
// RECURRING — Geração de mensalidades recorrentes
// Motor puro, determinístico, sem side effects
// ============================================================

import type { PricingMonthlyFeeItem, InstallmentFrequency } from "./calculation-types";
import { generateDueDates } from "./installments";
import { assertSafeCents } from "./currency";
import { InvalidRecurringFeeError } from "./errors";

// ── Parâmetros ─────────────────────────────────────────────
export interface GenerateRecurringFeesParams {
  monthlyFeeCents: number;
  count: number;
  firstDueDate: string;
  frequency?: InstallmentFrequency;
}

// ── Helpers ────────────────────────────────────────────────
export function generateMonthlyCompetencies(firstDueDate: string, count: number): string[] {
  const [year, month] = firstDueDate.split("-").map(Number);
  const competencies: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    competencies.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return competencies;
}

// ── Geração de mensalidades ────────────────────────────────
export function generateRecurringFees(params: GenerateRecurringFeesParams): PricingMonthlyFeeItem[] {
  const { monthlyFeeCents, count, firstDueDate, frequency = "monthly" } = params;

  // Validação do valor mensal
  assertSafeCents(monthlyFeeCents);
  if (monthlyFeeCents <= 0) {
    throw new InvalidRecurringFeeError({
      message: `Valor da mensalidade deve ser maior que zero: ${monthlyFeeCents}`,
      safeMessage: "Valor da mensalidade inválido.",
      field: "monthlyFeeCents",
      metadata: { received: String(monthlyFeeCents) },
    });
  }

  // Validação do número de parcelas
  if (!Number.isInteger(count) || count < 1) {
    throw new InvalidRecurringFeeError({
      message: `Número de mensalidades inválido: ${count}`,
      safeMessage: "Número de mensalidades inválido.",
      field: "count",
      metadata: { received: String(count) },
    });
  }

  // Geração das datas de vencimento
  const dueDates = generateDueDates(firstDueDate, count, frequency);

  // Geração das competências mensais
  const competencies = generateMonthlyCompetencies(firstDueDate, count);

  // Montagem dos itens
  const items: PricingMonthlyFeeItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      number: i + 1,
      amountCents: monthlyFeeCents,
      dueDate: dueDates[i],
      competencyMonth: competencies[i],
      status: "pending",
    });
  }

  return items;
}