// ============================================================
// VALIDATIONS — Validações de entrada de cálculo
// Motor puro, determinístico, sem side effects
// ============================================================

import type { PricingScenarioType } from "./types";

// ── Tipos de retorno ────────────────────────────────────────
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Validadores de cenário ──────────────────────────────────
const VALID_SCENARIO_TYPES: PricingScenarioType[] = [
  "conservative",
  "main",
  "expanded",
  "custom",
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

// ── Helpers ─────────────────────────────────────────────────
function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ── 1. validatePricingInput ─────────────────────────────────
export function validatePricingInput(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return fail(["Entrada inválida: esperado um objeto."]);
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  // Identificação (obrigatório)
  if (typeof obj.scenarioType !== "string") {
    errors.push("scenarioType é obrigatório e deve ser uma string válida.");
  } else if (!VALID_SCENARIO_TYPES.includes(obj.scenarioType as PricingScenarioType)) {
    errors.push(`scenarioType inválido: "${obj.scenarioType}". Valores aceitos: ${VALID_SCENARIO_TYPES.join(", ")}.`);
  }

  if (typeof obj.calculationDate !== "string") {
    errors.push("calculationDate é obrigatório e deve ser uma string.");
  } else if (!ISO_DATE_PATTERN.test(obj.calculationDate)) {
    errors.push("calculationDate deve ser uma data ISO válida (ex.: 2026-01-15).");
  }

  if (typeof obj.currency !== "string" || obj.currency.trim() === "") {
    errors.push("currency é obrigatório e deve ser uma string não vazia.");
  }

  // Trabalho (opcional, validações condicionais)
  if (obj.estimatedHours !== undefined && obj.estimatedHours !== null) {
    if (typeof obj.estimatedHours !== "number" || !Number.isFinite(obj.estimatedHours)) {
      errors.push("estimatedHours deve ser um número finito.");
    } else if (obj.estimatedHours < 0) {
      errors.push("estimatedHours deve ser >= 0.");
    }
  }

  if (obj.hourlyRateCents !== undefined && obj.hourlyRateCents !== null) {
    if (typeof obj.hourlyRateCents !== "number" || !Number.isFinite(obj.hourlyRateCents)) {
      errors.push("hourlyRateCents deve ser um número finito.");
    } else if (obj.hourlyRateCents < 0) {
      errors.push("hourlyRateCents deve ser >= 0.");
    }
  }

  // Todos os valores em centavos devem ser inteiros >= 0
  const centsFields: string[] = [
    "directExpensesCents",
    "indirectExpensesCents",
    "thirdPartyCostsCents",
    "travelCostsCents",
    "feesAndTaxesCents",
    "otherCostsCents",
    "manualAdjustmentCents",
    "fixedDiscountCents",
    "entryAmountCents",
    "monthlyFeeCents",
    "monthlyFeeCount",
    "successFeeBaseCents",
    "customMarginBaseCents",
  ];

  for (const field of centsFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      if (typeof obj[field] !== "number" || !Number.isFinite(obj[field])) {
        errors.push(`${field} deve ser um número finito.`);
      } else if (!Number.isInteger(obj[field])) {
        errors.push(`${field} deve ser um número inteiro (centavos).`);
      } else if ((obj[field] as number) < 0) {
        errors.push(`${field} deve ser >= 0.`);
      }
    }
  }

  // BPS devem ser inteiros entre 0-10000
  const bpsFields: string[] = [
    "marginBps",
    "percentageDiscountBps",
    "successFeeBps",
  ];

  for (const field of bpsFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      if (typeof obj[field] !== "number" || !Number.isFinite(obj[field])) {
        errors.push(`${field} deve ser um número finito.`);
      } else if (!Number.isInteger(obj[field])) {
        errors.push(`${field} deve ser um número inteiro (BPS).`);
      } else if ((obj[field] as number) < 0 || (obj[field] as number) > 10000) {
        errors.push(`${field} deve estar entre 0 e 10000 (BPS).`);
      }
    }
  }

  // installmentCount >= 1 se fornecido
  if (obj.installmentCount !== undefined && obj.installmentCount !== null) {
    if (typeof obj.installmentCount !== "number" || !Number.isInteger(obj.installmentCount as number)) {
      errors.push("installmentCount deve ser um número inteiro.");
    } else if ((obj.installmentCount as number) < 1) {
      errors.push("installmentCount deve ser >= 1.");
    }
  }

  // firstDueDate deve ser ISO se fornecido
  if (obj.firstDueDate !== undefined && obj.firstDueDate !== null) {
    if (typeof obj.firstDueDate !== "string") {
      errors.push("firstDueDate deve ser uma string ISO válida.");
    } else if (!ISO_DATE_PATTERN.test(obj.firstDueDate)) {
      errors.push("firstDueDate deve ser uma data ISO válida.");
    }
  }

  return errors.length === 0 ? ok() : fail(errors);
}

// ── 2. validateInstallmentParams ────────────────────────────
export function validateInstallmentParams(
  totalCents: unknown,
  installmentCount: unknown,
  firstDueDate: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (typeof totalCents !== "number" || !Number.isInteger(totalCents) || totalCents < 0) {
    errors.push("totalCents deve ser um inteiro >= 0.");
  }

  if (typeof installmentCount !== "number" || !Number.isInteger(installmentCount)) {
    errors.push("installmentCount deve ser um número inteiro.");
  } else if (installmentCount < 1) {
    errors.push("installmentCount deve ser >= 1.");
  }

  if (firstDueDate !== undefined && firstDueDate !== null) {
    if (typeof firstDueDate !== "string") {
      errors.push("firstDueDate deve ser uma string.");
    } else if (!ISO_DATE_PATTERN.test(firstDueDate)) {
      errors.push("firstDueDate deve ser uma data ISO válida.");
    }
  }

  return errors.length === 0 ? ok() : fail(errors);
}

// ── 3. validateSuccessFeeParams ─────────────────────────────
export function validateSuccessFeeParams(
  percentageBps: unknown,
  baseAmountCents: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (typeof percentageBps !== "number" || !Number.isInteger(percentageBps)) {
    errors.push("percentageBps deve ser um número inteiro.");
  } else if (percentageBps < 0 || percentageBps > 10000) {
    errors.push("percentageBps deve estar entre 0 e 10000 (BPS).");
  }

  if (typeof baseAmountCents !== "number" || !Number.isInteger(baseAmountCents)) {
    errors.push("baseAmountCents deve ser um número inteiro.");
  } else if (baseAmountCents < 0) {
    errors.push("baseAmountCents deve ser >= 0.");
  }

  return errors.length === 0 ? ok() : fail(errors);
}

// ── 4. validateDiscountParams ───────────────────────────────
export function validateDiscountParams(
  fixedDiscountCents: unknown,
  percentageDiscountBps: unknown,
  subtotalCents: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (typeof fixedDiscountCents !== "number" || !Number.isInteger(fixedDiscountCents)) {
    errors.push("fixedDiscountCents deve ser um número inteiro.");
  } else if (fixedDiscountCents < 0) {
    errors.push("fixedDiscountCents deve ser >= 0.");
  }

  if (typeof percentageDiscountBps !== "number" || !Number.isInteger(percentageDiscountBps)) {
    errors.push("percentageDiscountBps deve ser um número inteiro.");
  } else if (percentageDiscountBps < 0 || percentageDiscountBps > 10000) {
    errors.push("percentageDiscountBps deve estar entre 0 e 10000 (BPS).");
  }

  if (typeof subtotalCents !== "number" || !Number.isInteger(subtotalCents)) {
    errors.push("subtotalCents deve ser um número inteiro.");
  } else if (subtotalCents < 0) {
    errors.push("subtotalCents deve ser >= 0.");
  }

  return errors.length === 0 ? ok() : fail(errors);
}

// ── 5. validateMarginParams ─────────────────────────────────
export function validateMarginParams(
  marginBps: unknown,
  baseCents: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (typeof marginBps !== "number" || !Number.isInteger(marginBps)) {
    errors.push("marginBps deve ser um número inteiro.");
  } else if (marginBps < 0 || marginBps > 10000) {
    errors.push("marginBps deve estar entre 0 e 10000 (BPS).");
  }

  if (typeof baseCents !== "number" || !Number.isInteger(baseCents)) {
    errors.push("baseCents deve ser um número inteiro.");
  } else if (baseCents < 0) {
    errors.push("baseCents deve ser >= 0.");
  }

  return errors.length === 0 ? ok() : fail(errors);
}

// ── 6. validateEntryAmount ──────────────────────────────────
export function validateEntryAmount(
  entryAmountCents: unknown,
  totalFeeCents: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (typeof entryAmountCents !== "number" || !Number.isInteger(entryAmountCents)) {
    errors.push("entryAmountCents deve ser um número inteiro.");
  } else if (entryAmountCents < 0) {
    errors.push("entryAmountCents deve ser >= 0.");
  }

  if (typeof totalFeeCents !== "number" || !Number.isInteger(totalFeeCents)) {
    errors.push("totalFeeCents deve ser um número inteiro.");
  } else if (totalFeeCents < 0) {
    errors.push("totalFeeCents deve ser >= 0.");
  }

  if (
    typeof entryAmountCents === "number" &&
    typeof totalFeeCents === "number" &&
    Number.isInteger(entryAmountCents) &&
    Number.isInteger(totalFeeCents) &&
    entryAmountCents > totalFeeCents
  ) {
    errors.push("entryAmountCents não pode ser maior que totalFeeCents.");
  }

  return errors.length === 0 ? ok() : fail(errors);
}