// ============================================================
// SUCCESS FEE — Cálculo de honorário de êxito estimado
// Motor puro, determinístico, sem side effects
// ============================================================

import { assertSafeCents } from "./currency";
import { InvalidSuccessFeeError } from "./errors";

// ── Tipo de retorno ────────────────────────────────────────
export interface EstimatedSuccessFeeResult {
  percentageBps: number;
  baseAmountCents: number;
  estimatedAmountCents: number;
  guaranteed: false;
  warning: string;
}

// ── Mensagem de aviso ──────────────────────────────────────
const SUCCESS_FEE_WARNING =
  "O valor de êxito é apenas uma estimativa baseada na base informada e não representa receita garantida.";

// ── Parâmetros ─────────────────────────────────────────────
export interface CalculateEstimatedSuccessFeeParams {
  percentageBps: number;
  baseAmountCents: number;
}

// ── Cálculo ────────────────────────────────────────────────
export function calculateEstimatedSuccessFee(
  params: CalculateEstimatedSuccessFeeParams,
): EstimatedSuccessFeeResult {
  const { percentageBps, baseAmountCents } = params;

  // Validação do percentual
  if (typeof percentageBps !== "number") {
    throw new InvalidSuccessFeeError({
      message: `Percentual de êxito inválido: ${String(percentageBps)}`,
      safeMessage: "Percentual de êxito inválido.",
      field: "percentageBps",
    });
  }
  if (!Number.isInteger(percentageBps) || percentageBps < 0 || percentageBps > 10000) {
    throw new InvalidSuccessFeeError({
      message: `Percentual de êxito fora de faixa: ${percentageBps} bps (máx. 10000)`,
      safeMessage: "Percentual de êxito fora do intervalo permitido.",
      field: "percentageBps",
      metadata: { received: percentageBps },
    });
  }

  // Validação do valor base
  assertSafeCents(baseAmountCents);
  if (baseAmountCents < 0) {
    throw new InvalidSuccessFeeError({
      message: `Valor base inválido para cálculo de êxito: ${baseAmountCents}`,
      safeMessage: "Valor base inválido.",
      field: "baseAmountCents",
      metadata: { received: String(baseAmountCents) },
    });
  }

  // Cálculo do valor estimado
  const estimatedAmountCents = Math.round((baseAmountCents * percentageBps) / 10000);

  return {
    percentageBps,
    baseAmountCents,
    estimatedAmountCents,
    guaranteed: false,
    warning: SUCCESS_FEE_WARNING,
  };
}