import { describe, expect, it } from "vitest";
import {
  maskCPF,
  maskCNPJ,
  maskEmail,
  maskPhone,
  maskToken,
  maskPassword,
  maskBankData,
  maskObject,
  maskArray,
  SENSITIVE_FIELDS,
} from "../masking";

// ── maskCPF ─────────────────────────────────────────────────────────────────

describe("maskCPF", () => {
  it("mostra apenas os 2 últimos dígitos do CPF formatado", () => {
    expect(maskCPF("123.456.789-00")).toBe("***.***.**-00");
  });

  it("funciona com CPF sem formatação (só dígitos)", () => {
    expect(maskCPF("12345678900")).toBe("***.***.**-00");
  });

  it("preserva os 2 últimos dígitos corretos", () => {
    expect(maskCPF("111.222.333-45")).toBe("***.***.**-45");
  });

  it("retorna valor padrão para null", () => {
    expect(maskCPF(null)).toBe("***.***.**-**");
  });

  it("retorna valor padrão para undefined", () => {
    expect(maskCPF(undefined)).toBe("***.***.**-**");
  });

  it("retorna valor padrão para string vazia", () => {
    expect(maskCPF("")).toBe("***.***.**-**");
  });

  it("funciona com CPF muito curto (1 dígito)", () => {
    expect(maskCPF("1")).toBe("***.***.**-**");
  });

  it("funciona com CPF com apenas 2 dígitos", () => {
    expect(maskCPF("12")).toBe("***.***.**-12");
  });
});

// ── maskCNPJ ────────────────────────────────────────────────────────────────

describe("maskCNPJ", () => {
  it("mostra apenas os 2 últimos dígitos do CNPJ formatado", () => {
    expect(maskCNPJ("12.345.678/0001-99")).toBe("**.***.***/****-99");
  });

  it("funciona com CNPJ sem formatação", () => {
    expect(maskCNPJ("12345678000199")).toBe("**.***.***/****-99");
  });

  it("preserva os 2 últimos dígitos corretos", () => {
    expect(maskCNPJ("11.222.333/0001-45")).toBe("**.***.***/****-45");
  });

  it("retorna valor padrão para null", () => {
    expect(maskCNPJ(null)).toBe("**.***.***/****-**");
  });

  it("retorna valor padrão para undefined", () => {
    expect(maskCNPJ(undefined)).toBe("**.***.***/****-**");
  });

  it("retorna valor padrão para string vazia", () => {
    expect(maskCNPJ("")).toBe("**.***.***/****-**");
  });

  it("funciona com CNPJ muito curto", () => {
    expect(maskCNPJ("1")).toBe("**.***.***/****-**");
  });

  it("funciona com CNPJ com 2 dígitos", () => {
    expect(maskCNPJ("99")).toBe("**.***.***/****-99");
  });
});

// ── maskEmail ───────────────────────────────────────────────────────────────

describe("maskEmail", () => {
  it("mostra primeiro caractere + domínio", () => {
    expect(maskEmail("joao@example.com")).toBe("j***@example.com");
  });

  it("funciona com email de domínio complexo", () => {
    expect(maskEmail("admin@empresa.com.br")).toBe("a***@empresa.com.br");
  });

  it("funciona com local part de 1 caractere", () => {
    expect(maskEmail("a@test.com")).toBe("a***@test.com");
  });

  it("retorna valor padrão para null", () => {
    expect(maskEmail(null)).toBe("***@***.com");
  });

  it("retorna valor padrão para undefined", () => {
    expect(maskEmail(undefined)).toBe("***@***.com");
  });

  it("retorna valor padrão para string vazia", () => {
    expect(maskEmail("")).toBe("***@***.com");
  });

  it("funciona com email sem @", () => {
    expect(maskEmail("invalido")).toBe("***@***.com");
  });

  it("funciona com email que começa com @", () => {
    expect(maskEmail("@test.com")).toBe("***@***.com");
  });
});

// ── maskPhone ───────────────────────────────────────────────────────────────

describe("maskPhone", () => {
  it("mostra apenas os 4 últimos dígitos", () => {
    expect(maskPhone("(11) 99999-1234")).toBe("*****-1234");
  });

  it("funciona com telefone sem formatação", () => {
    expect(maskPhone("11999991234")).toBe("*****-1234");
  });

  it("funciona com telefone fixo", () => {
    expect(maskPhone("(21) 3333-4567")).toBe("*****-4567");
  });

  it("retorna valor padrão para null", () => {
    expect(maskPhone(null)).toBe("*****-****");
  });

  it("retorna valor padrão para undefined", () => {
    expect(maskPhone(undefined)).toBe("*****-****");
  });

  it("retorna valor padrão para string vazia", () => {
    expect(maskPhone("")).toBe("*****-****");
  });

  it("funciona com telefone muito curto (< 4 dígitos)", () => {
    expect(maskPhone("123")).toBe("*****-****");
  });

  it("funciona com telefone com exatamente 4 dígitos", () => {
    expect(maskPhone("1234")).toBe("*****-1234");
  });
});

// ── maskToken ───────────────────────────────────────────────────────────────

describe("maskToken", () => {
  it("mostra apenas os 4 primeiros caracteres do token", () => {
    expect(maskToken("tok_abcdef123456")).toBe("tok_****");
  });

  it("funciona com token longo", () => {
    expect(maskToken("sk_live_abcdef1234567890")).toBe("sk_l****");
  });

  it("retorna **** para token com 4 ou menos caracteres", () => {
    expect(maskToken("tok")).toBe("****");
    expect(maskToken("ab")).toBe("****");
    expect(maskToken("a")).toBe("****");
  });

  it("retorna **** para null", () => {
    expect(maskToken(null)).toBe("****");
  });

  it("retorna **** para undefined", () => {
    expect(maskToken(undefined)).toBe("****");
  });

  it("retorna **** para string vazia", () => {
    expect(maskToken("")).toBe("****");
  });

  it("funciona com token de exatamente 5 caracteres", () => {
    expect(maskToken("abcde")).toBe("abcd****");
  });
});

// ── maskPassword ────────────────────────────────────────────────────────────

describe("maskPassword", () => {
  it("retorna sempre totalmente mascarada", () => {
    expect(maskPassword("minha_senha_secreta")).toBe("*******************");
  });

  it("mínimo de 8 asteriscos para senhas curtas", () => {
    expect(maskPassword("abc")).toBe("********");
  });

  it("mantém o tamanho para senhas longas", () => {
    expect(maskPassword("123456789012")).toBe("************");
  });

  it("retorna ******** para null", () => {
    expect(maskPassword(null)).toBe("********");
  });

  it("retorna ******** para undefined", () => {
    expect(maskPassword(undefined)).toBe("********");
  });

  it("retorna ******** para string vazia", () => {
    expect(maskPassword("")).toBe("********");
  });
});

// ── maskBankData ────────────────────────────────────────────────────────────

describe("maskBankData", () => {
  it("retorna dados bancários totalmente mascarados", () => {
    expect(maskBankData("12345678-9")).toBe("**********");
  });

  it("mínimo de 8 asteriscos para dados curtos", () => {
    expect(maskBankData("123")).toBe("********");
  });

  it("mantém o tamanho para dados longos", () => {
    expect(maskBankData("00012345678901234567")).toBe("********************");
  });

  it("retorna ******** para null", () => {
    expect(maskBankData(null)).toBe("********");
  });

  it("retorna ******** para undefined", () => {
    expect(maskBankData(undefined)).toBe("********");
  });

  it("retorna ******** para string vazia", () => {
    expect(maskBankData("")).toBe("********");
  });
});

// ── maskObject ──────────────────────────────────────────────────────────────

describe("maskObject", () => {
  it("mascara campos sensíveis especificados", () => {
    const obj = {
      name: "João da Silva",
      cpf: "123.456.789-00",
      email: "joao@example.com",
    };
    const masked = maskObject(obj, ["cpf", "email"]);
    expect(masked.name).toBe("João da Silva");
    expect(masked.cpf).toBe("***.***.**-00");
    expect(masked.email).toBe("j***@example.com");
  });

  it("mantém campos não sensíveis intactos", () => {
    const obj = { id: "123", name: "Teste", count: 42 };
    const masked = maskObject(obj, ["cpf"]);
    expect(masked).toEqual(obj);
  });

  it("usa SENSITIVE_FIELDS por padrão quando não especificado", () => {
    const obj = {
      name: "Teste",
      cpf: "12345678900",
      password: "secret123",
      email: "test@test.com",
    };
    const masked = maskObject(obj);
    expect(masked.cpf).toBe("***.***.**-00");
    expect(masked.password).toBe("*********");
    expect(masked.email).toBe("t***@test.com");
    expect(masked.name).toBe("Teste");
  });

  it("funciona com objeto vazio", () => {
    expect(maskObject({})).toEqual({});
  });

  it("mascara campos com caixa mista", () => {
    const obj = { CPF: "12345678900", Senha: "abc" };
    const masked = maskObject(obj);
    expect(masked.CPF).toBe("***.***.**-00");
    expect(masked.Senha).toBe("********");
  });
});

// ── maskArray ───────────────────────────────────────────────────────────────

describe("maskArray", () => {
  it("mascara campos sensíveis em todos os itens", () => {
    const items = [
      { name: "João", cpf: "12345678900" },
      { name: "Maria", cpf: "98765432100" },
    ];
    const masked = maskArray(items, ["cpf"]);
    expect(masked[0].cpf).toBe("***.***.**-00");
    expect(masked[1].cpf).toBe("***.***.**-00");
    expect(masked[0].name).toBe("João");
    expect(masked[1].name).toBe("Maria");
  });

  it("funciona com array vazio", () => {
    expect(maskArray([])).toEqual([]);
  });

  it("preserva a estrutura do array", () => {
    const items = [{ email: "a@b.com" }];
    const masked = maskArray(items, ["email"]);
    expect(Array.isArray(masked)).toBe(true);
    expect(masked).toHaveLength(1);
  });
});

// ── SENSITIVE_FIELDS ────────────────────────────────────────────────────────

describe("SENSITIVE_FIELDS", () => {
  it("contém campos essenciais", () => {
    expect(SENSITIVE_FIELDS).toContain("cpf");
    expect(SENSITIVE_FIELDS).toContain("cnpj");
    expect(SENSITIVE_FIELDS).toContain("email");
    expect(SENSITIVE_FIELDS).toContain("password");
    expect(SENSITIVE_FIELDS).toContain("token");
    expect(SENSITIVE_FIELDS).toContain("senha");
    expect(SENSITIVE_FIELDS).toContain("conta_bancaria");
  });

  it("é uma tupla imutável", () => {
    expect(typeof SENSITIVE_FIELDS).toBe("object");
    expect(SENSITIVE_FIELDS.length).toBeGreaterThan(0);
  });
});
