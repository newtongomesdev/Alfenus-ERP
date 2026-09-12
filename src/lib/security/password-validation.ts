import type { SecurityPolicy } from "./policies";

export type PasswordStrength = "fraca" | "razoavel" | "forte" | "muito_forte";

export type PasswordValidationError = {
  valid: false;
  errors: string[];
};

export type PasswordValidationSuccess = {
  valid: true;
};

export type PasswordValidationResult = PasswordValidationError | PasswordValidationSuccess;

/**
 * Valida uma senha contra as regras da política de segurança.
 */
export function validatePassword(
  password: string,
  policy: Pick<
    SecurityPolicy,
    | "passwordMinLength"
    | "passwordRequireUppercase"
    | "passwordRequireNumber"
    | "passwordRequireSymbol"
  >,
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    return { valid: false, errors: ["A senha não pode estar vazia."] };
  }

  if (password.length < policy.passwordMinLength) {
    errors.push(
      `A senha deve ter pelo menos ${policy.passwordMinLength} caracteres.`,
    );
  }

  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula.");
  }

  if (policy.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número.");
  }

  if (policy.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um símbolo.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Avalia a força de uma senha (puramente baseada em complexidade, sem política).
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password) return "fraca";

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return "fraca";
  if (score <= 2) return "razoavel";
  if (score <= 4) return "forte";
  return "muito_forte";
}

/**
 * Verifica se a senha expirou com base na data da última alteração.
 */
export function checkPasswordExpiry(
  lastChangedAt: string | null,
  expiryDays: number,
): { expired: boolean; daysUntilExpiry: number | null } {
  if (expiryDays <= 0 || !lastChangedAt) {
    return { expired: false, daysUntilExpiry: null };
  }

  const lastChanged = new Date(lastChangedAt);
  const now = new Date();
  const elapsedMs = now.getTime() - lastChanged.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const remainingDays = Math.ceil(expiryDays - elapsedDays);

  return {
    expired: elapsedDays >= expiryDays,
    daysUntilExpiry: remainingDays,
  };
}
