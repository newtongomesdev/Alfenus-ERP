import { describe, it, expect } from "vitest";
import {
  validatePassword,
  checkPasswordStrength,
  checkPasswordExpiry,
} from "../password-validation";
import type { SecurityPolicy } from "../policies";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const basePolicy: Pick<
  SecurityPolicy,
  | "passwordMinLength"
  | "passwordRequireUppercase"
  | "passwordRequireNumber"
  | "passwordRequireSymbol"
> = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
};

// ---------------------------------------------------------------------------
// validatePassword
// ---------------------------------------------------------------------------

describe("validatePassword", () => {
  describe("quando a senha está vazia", () => {
    it("retorna erro para senha vazia", () => {
      const result = validatePassword("", basePolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("A senha não pode estar vazia.");
      }
    });

    it("retorna erro para senha undefined (tratada como vazia)", () => {
      const result = validatePassword(undefined as unknown as string, basePolicy);
      expect(result.valid).toBe(false);
    });
  });

  describe("com política padrão (min 8, maiúscula, número)", () => {
    it("aceita senha que atende todos os requisitos", () => {
      const result = validatePassword("MinhaSenh@1", basePolicy);
      expect(result.valid).toBe(true);
    });

    it("rejeita senha curta", () => {
      const result = validatePassword("Ab1", basePolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining("pelo menos 8 caracteres"),
          ]),
        );
      }
    });

    it("rejeita senha sem maiúscula", () => {
      const result = validatePassword("minha123", basePolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining("letra maiúscula"),
          ]),
        );
      }
    });

    it("rejeita senha sem número", () => {
      const result = validatePassword("MinhaSenha", basePolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringContaining("número")]),
        );
      }
    });

    it("rejeita senha com múltiplos erros", () => {
      const result = validatePassword("curta", basePolicy);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("com política que exige símbolo", () => {
    const policyWithSymbol = { ...basePolicy, passwordRequireSymbol: true };

    it("aceita senha com símbolo", () => {
      const result = validatePassword("MinhaSenh@1", policyWithSymbol);
      expect(result.valid).toBe(true);
    });

    it("rejeita senha sem símbolo", () => {
      const result = validatePassword("MinhaSenha1", policyWithSymbol);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringContaining("símbolo")]),
        );
      }
    });
  });

  describe("com política sem requisitos", () => {
    const laxPolicy = {
      passwordMinLength: 1,
      passwordRequireUppercase: false,
      passwordRequireNumber: false,
      passwordRequireSymbol: false,
    };

    it("aceita senha de um caractere", () => {
      const result = validatePassword("a", laxPolicy);
      expect(result.valid).toBe(true);
    });
  });

  describe("casos extremos", () => {
    it("aceita senha muito longa", () => {
      const longPassword = "A".repeat(1000) + "1";
      const result = validatePassword(longPassword, basePolicy);
      expect(result.valid).toBe(true);
    });

    it("aceita senha com exatamente o tamanho mínimo", () => {
      const result = validatePassword("Abcdef1x", basePolicy);
      expect(result.valid).toBe(true);
    });

    it("rejeita senha com tamanho mínimo - 1", () => {
      const result = validatePassword("Abcdef1", basePolicy);
      expect(result.valid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// checkPasswordStrength
// ---------------------------------------------------------------------------

describe("checkPasswordStrength", () => {
  it("retorna 'fraca' para senha vazia", () => {
    expect(checkPasswordStrength("")).toBe("fraca");
  });

  it("retorna 'fraca' para senha muito curta e simples", () => {
    expect(checkPasswordStrength("abc")).toBe("fraca");
  });

  it("retorna 'razoavel' para senha com comprimento e maiúsculas", () => {
    expect(checkPasswordStrength("abcdefghI")).toBe("razoavel");
  });

  it("retorna 'forte' para senha com complexidade moderada", () => {
    expect(checkPasswordStrength("Abcdef12")).toBe("forte");
  });

  it("retorna 'muito_forte' para senha com alta complexidade", () => {
    expect(checkPasswordStrength("MinhaSenh@123!")).toBe("muito_forte");
  });

  it("retorna 'forte' para senha longa com maiúsculas e números", () => {
    expect(checkPasswordStrength("Abcdefghij12")).toBe("forte");
  });

  it("retorna 'muito_forte' para senha com todos os tipos de caracteres", () => {
    expect(checkPasswordStrength("Abc123!@#$%xyz")).toBe("muito_forte");
  });
});

// ---------------------------------------------------------------------------
// checkPasswordExpiry
// ---------------------------------------------------------------------------

describe("checkPasswordExpiry", () => {
  it("retorna não expirado quando expiryDays é 0", () => {
    const result = checkPasswordExpiry("2025-01-01T00:00:00Z", 0);
    expect(result.expired).toBe(false);
    expect(result.daysUntilExpiry).toBeNull();
  });

  it("retorna não expirado quando lastChangedAt é null", () => {
    const result = checkPasswordExpiry(null, 90);
    expect(result.expired).toBe(false);
    expect(result.daysUntilExpiry).toBeNull();
  });

  it("retorna não expirado quando senha foi alterada recentemente", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);
    const result = checkPasswordExpiry(recentDate.toISOString(), 90);
    expect(result.expired).toBe(false);
    expect(result.daysUntilExpiry).toBeGreaterThan(70);
  });

  it("retorna expirado quando senha expirou", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const result = checkPasswordExpiry(oldDate.toISOString(), 90);
    expect(result.expired).toBe(true);
    expect(result.daysUntilExpiry).toBeLessThanOrEqual(0);
  });

  it("retorna não expirado quando está no limite exato", () => {
    const exactDate = new Date();
    exactDate.setDate(exactDate.getDate() - 89);
    const result = checkPasswordExpiry(exactDate.toISOString(), 90);
    expect(result.expired).toBe(false);
  });

  it("retorna expirado no dia exato da expiração", () => {
    const exactDate = new Date();
    exactDate.setDate(exactDate.getDate() - 90);
    const result = checkPasswordExpiry(exactDate.toISOString(), 90);
    expect(result.expired).toBe(true);
  });
});
