/**
 * ETAPA 5.2.2.5.1 — Chaves de idempotência e hash canônico.
 *
 * Previne operações duplicadas (retry, duplo-clique).
 *
 * Fluxo:
 * 1. Gerar ou usar chave fornecida pelo cliente.
 * 2. Verificar se já existe no banco.
 * 3. Se existir com mesmo resultado → retornar resultado salvo.
 * 4. Se existir com resultado diferente → conflito.
 * 5. Se não existir → executar e salvar.
 *
 * Hash canônico: normalização do input, ordenação estável,
 * remoção de campos não relacionados ao cálculo.
 * Não usa JSON.stringify direto.
 */

import { createHash, randomBytes } from "crypto";

// ─── Geração de Chave (determinística) ─────────────────

/**
 * Gera chave de idempotência determinística a partir de parâmetros.
 * Mesmos parâmetros → mesma chave (hex de 32 chars).
 */
export function generateDeterministicIdempotencyKey(params: {
  tenantId: string;
  scenarioId: string;
  operation: "create_version" | "activate" | "duplicate";
  paramsHash: string;
}): string {
  const raw = [
    params.tenantId,
    params.scenarioId,
    params.operation,
    params.paramsHash,
  ].join(":");

  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

// ─── Geração de Chave (por request) ────────────────────

/**
 * Gera chave de idempotência no formato:
 * `{action}:{tenantId}:{userId}:{scenarioId}:{timestamp}:{random}`
 *
 * A parte aleatória garante unicidade entre requests idênticos.
 */
export function generateIdempotencyKey(
  action: string,
  tenantId: string,
  userId: string,
  scenarioId: string,
): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  return `${action}:${tenantId}:${userId}:${scenarioId}:${timestamp}:${random}`;
}

// ─── Validação de Chave ────────────────────────────────

/**
 * Valida formato de chave de idempotência.
 * - Comprimento: 1–256
 * - Caracteres: apenas alfanuméricos, hífens, underscores e dois-pontos
 */
export function validateIdempotencyKey(key: string): boolean {
  if (typeof key !== "string") return false;
  if (key.length < 1 || key.length > 256) return false;
  return /^[a-zA-Z0-9\-_:]+$/.test(key);
}

// ─── Hash de Input (SHA-256 completo) ──────────────────

/**
 * Canonicaliza chaves recursivamente, computa SHA-256 e retorna hash completo.
 * Diferente de `computeInputHash` (que trunca em 16 chars),
 * esta função retorna o hash completo (64 chars hex) para uso em idempotência.
 */
export function generateInputHash(params: Record<string, unknown>): string {
  const canonical = canonicalizeRecursive(params);
  const canonicalJSON = JSON.stringify(canonical);
  return createHash("sha256").update(canonicalJSON).digest("hex");
}

/**
 * Canonicaliza recursivamente um valor para hash canônico.
 * - undefined/null → removido
 * - strings → lowercase, trim
 * - números → number
 * - boolean → boolean
 * - objetos → chaves ordenadas recursivamente
 * - arrays → elementos canonicalizados recursivamente
 */
function canonicalizeRecursive(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.toLowerCase().trim();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeRecursive(item)).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of sortedKeys) {
      const canonical = canonicalizeRecursive((value as Record<string, unknown>)[key]);
      if (canonical !== undefined) {
        result[key] = canonical;
      }
    }
    return result;
  }
  return value;
}

// ─── Hash canônico ─────────────────────────────────────

/**
 * Normaliza um valor para hash canônico.
 * - undefined/null → removido
 * - strings → lowercase, trim
 * - números → string
 * - boolean → string
 */
function canonicalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.toLowerCase().trim();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  return value;
}

/**
 * Normaliza um objeto para forma canônica.
 * - Ordena chaves
 * - Remove null/undefined
 * - Normaliza valores
 */
export function canonicalize(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const sortedKeys = Object.keys(obj).sort();

  for (const key of sortedKeys) {
    const value = obj[key];
    const canonical = canonicalizeValue(value);
    if (canonical !== undefined) {
      result[key] = canonical;
    }
  }

  return result;
}

/**
 * Calcula hash canônico de parâmetros.
 * Determinístico: mesmos parâmetros → mesmo hash.
 * Não inclui campos não relacionados ao cálculo.
 *
 * Substitui o JSON.stringify direto por normalização canônica.
 */
export function computeInputHash(input: Record<string, unknown>): string {
  const canonical = canonicalize(input);
  const canonicalJSON = JSON.stringify(canonical);
  return createHash("sha256").update(canonicalJSON).digest("hex").slice(0, 16);
}

/**
 * Calcula hash canônico de um payload de cálculo para detecção de duplicidade.
 * Inclui apenas parâmetros que determinam o resultado.
 * Usa normalização canônica (não JSON.stringify direto).
 */
export function computeCalculationHash(params: {
  serviceId: string;
  feeType: string;
  feeValue: number;
  currency: string;
  paymentMethod: string;
  installments: number;
  successFeeRate?: number | null;
  recurringMonths?: number | null;
  billingFrequency?: string | null;
  engineVersion: string;
  schemaVersion: string;
}): string {
  const canonical = canonicalize({
    serviceId: params.serviceId,
    feeType: params.feeType,
    feeValue: params.feeValue,
    currency: params.currency,
    paymentMethod: params.paymentMethod,
    installments: params.installments,
    successFeeRate: params.successFeeRate ?? null,
    recurringMonths: params.recurringMonths ?? null,
    billingFrequency: params.billingFrequency ?? null,
    engineVersion: params.engineVersion,
    schemaVersion: params.schemaVersion,
  });

  const canonicalJSON = JSON.stringify(canonical);
  return createHash("sha256").update(canonicalJSON).digest("hex").slice(0, 16);
}