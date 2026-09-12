// ── Constantes ──────────────────────────────────────────────────────────────

/**
 * Lista de campos que devem ser mascarados no modo de acesso assistido.
 */
export const SENSITIVE_FIELDS = [
  "cpf",
  "cnpj",
  "document",
  "documento",
  "email",
  "phone",
  "telefone",
  "celular",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "senha",
  "secret",
  "api_key",
  "credit_card",
  "card_number",
  "conta_bancaria",
  "agencia",
  "chave_pix",
  "bank_account",
  "bank_code",
  "routing_number",
  "iban",
  "swift",
] as const;

export type SensitiveFieldName = (typeof SENSITIVE_FIELDS)[number];

// ── Funções de mascaramento individuais ─────────────────────────────────────

/**
 * Mascara CPF: "***.***.**-12" (mostra apenas os 2 últimos dígitos).
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "***.***.**-**";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length < 2) return "***.***.**-**";
  const lastTwo = digits.slice(-2);
  return `***.***.**-${lastTwo}`;
}

// Mascara CNPJ mostrando apenas os 2 ultimos digitos: formato padrao mascarado
export function maskCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "**.***.***/****-**";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length < 2) return "**.***.***/****-**";
  const lastTwo = digits.slice(-2);
  return `**.***.***/****-${lastTwo}`;
}

/**
 * Mascara email: "j***@domain.com" (mostra primeiro caractere + domínio).
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "***@***.com";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***@***.com";
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (localPart.length === 1) {
    return `${localPart}***@${domain}`;
  }
  return `${localPart[0]}***@${domain}`;
}

/**
 * Mascara telefone: "*****-1234" (mostra apenas os 4 últimos dígitos).
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "*****-****";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "*****-****";
  const lastFour = digits.slice(-4);
  return `*****-${lastFour}`;
}

/**
 * Mascara token: "tok_****" (mostra apenas os 4 primeiros caracteres).
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "****";
  if (token.length <= 4) return "****";
  const prefix = token.slice(0, 4);
  return `${prefix}****`;
}

/**
 * Mascara senha: sempre totalmente mascarada "********".
 */
export function maskPassword(password: string | null | undefined): string {
  if (!password) return "********";
  return "*".repeat(Math.max(password.length, 8));
}

/**
 * Mascara dados bancários: totalmente mascarados.
 */
export function maskBankData(data: string | null | undefined): string {
  if (!data) return "********";
  return "*".repeat(Math.max(data.length, 8));
}

// ── Funções genéricas de mascaramento ───────────────────────────────────────

/**
 * Aplica mascaramento em um campo de um objeto.
 */
function applyMask(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  const lower = fieldName.toLowerCase();

  if (lower === "cpf") return maskCPF(value);
  if (lower === "cnpj" || lower === "document" || lower === "documento")
    return maskCNPJ(value);
  if (lower.includes("email")) return maskEmail(value);
  if (
    lower === "phone" ||
    lower === "telefone" ||
    lower === "celular"
  )
    return maskPhone(value);
  if (
    lower === "token" ||
    lower === "access_token" ||
    lower === "refresh_token"
  )
    return maskToken(value);
  if (lower === "password" || lower === "senha") return maskPassword(value);
  if (
    lower.includes("bank") ||
    lower === "conta_bancaria" ||
    lower === "agencia" ||
    lower === "chave_pix" ||
    lower === "routing_number" ||
    lower === "iban" ||
    lower === "swift"
  )
    return maskBankData(value);

  // Fallback genérico
  if (value.length > 4) {
    return value.slice(0, 3) + "*".repeat(Math.min(value.length - 3, 12));
  }
  return "***";
}

/**
 * Mascara campos sensíveis em um objeto.
 */
export function maskObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: readonly string[] = SENSITIVE_FIELDS,
): T {
  const masked = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(masked)) {
    const lower = key.toLowerCase();
    const isSensitive = sensitiveFields.some(
      (field) => lower === field.toLowerCase() || lower.includes(field.toLowerCase()),
    );

    if (isSensitive) {
      masked[key] = applyMask(masked[key], key);
    } else if (
      typeof masked[key] === "object" &&
      masked[key] !== null &&
      !Array.isArray(masked[key])
    ) {
      masked[key] = maskObject(
        masked[key] as Record<string, unknown>,
        sensitiveFields,
      );
    }
  }

  return masked as T;
}

/**
 * Mascara campos sensíveis em um array de objetos.
 */
export function maskArray<T extends Record<string, unknown>>(
  items: T[],
  sensitiveFields: readonly string[] = SENSITIVE_FIELDS,
): T[] {
  return items.map((item) => maskObject(item, sensitiveFields));
}
