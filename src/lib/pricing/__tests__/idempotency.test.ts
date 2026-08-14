import { describe, it, expect } from "vitest";
import {
  generateDeterministicIdempotencyKey,
  generateIdempotencyKey,
  validateIdempotencyKey,
  generateInputHash,
  computeInputHash,
  computeCalculationHash,
} from "../idempotency";

// ─── generateDeterministicIdempotencyKey ───────────────

describe("idempotency/generateDeterministicIdempotencyKey", () => {
  it("retorna string hexadecimal de 32 caracteres", () => {
    const key = generateDeterministicIdempotencyKey({
      tenantId: "tenant-1",
      scenarioId: "sc-1",
      operation: "create_version",
      paramsHash: "abc123",
    });

    expect(typeof key).toBe("string");
    expect(key).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(key)).toBe(true);
  });

  it("é determinístico: mesmos parâmetros → mesma chave", () => {
    const params = {
      tenantId: "tenant-1",
      scenarioId: "sc-1",
      operation: "create_version" as const,
      paramsHash: "abc123",
    };

    const key1 = generateDeterministicIdempotencyKey(params);
    const key2 = generateDeterministicIdempotencyKey(params);
    expect(key1).toBe(key2);
  });

  it("gera chaves diferentes para operações distintas", () => {
    const base = {
      tenantId: "tenant-1",
      scenarioId: "sc-1",
      paramsHash: "abc123",
    };

    const key1 = generateDeterministicIdempotencyKey({ ...base, operation: "create_version" });
    const key2 = generateDeterministicIdempotencyKey({ ...base, operation: "activate" });
    const key3 = generateDeterministicIdempotencyKey({ ...base, operation: "duplicate" });

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });

  it("gera chaves diferentes para tenants distintos", () => {
    const base = {
      scenarioId: "sc-1",
      operation: "create_version" as const,
      paramsHash: "abc123",
    };

    const key1 = generateDeterministicIdempotencyKey({ ...base, tenantId: "tenant-1" });
    const key2 = generateDeterministicIdempotencyKey({ ...base, tenantId: "tenant-2" });
    expect(key1).not.toBe(key2);
  });

  it("gera chaves diferentes para scenarios distintos", () => {
    const base = {
      tenantId: "tenant-1",
      operation: "create_version" as const,
      paramsHash: "abc123",
    };

    const key1 = generateDeterministicIdempotencyKey({ ...base, scenarioId: "sc-1" });
    const key2 = generateDeterministicIdempotencyKey({ ...base, scenarioId: "sc-2" });
    expect(key1).not.toBe(key2);
  });
});

// ─── generateIdempotencyKey (por request) ─────────────

describe("idempotency/generateIdempotencyKey", () => {
  it("retorna chave no formato action:tenant:user:scenario:timestamp:random", () => {
    const key = generateIdempotencyKey("create_version", "t-1", "u-1", "sc-1");
    expect(key).toMatch(/^create_version:t-1:u-1:sc-1:\d+:[a-f0-9]+$/);
  });

  it("gera chaves diferentes para requests distintos", () => {
    const key1 = generateIdempotencyKey("create_version", "t-1", "u-1", "sc-1");
    const key2 = generateIdempotencyKey("create_version", "t-1", "u-1", "sc-1");
    expect(key1).not.toBe(key2);
  });

  it("gera chaves diferentes para actions distintas", () => {
    const key1 = generateIdempotencyKey("create_version", "t-1", "u-1", "sc-1");
    const key2 = generateIdempotencyKey("activate", "t-1", "u-1", "sc-1");
    expect(key1).not.toBe(key2);
  });

  it("contém timestamp como número", () => {
    const key = generateIdempotencyKey("test", "t-1", "u-1", "sc-1");
    const parts = key.split(":");
    expect(Number(parts[4])).toBeGreaterThan(0);
  });
});

// ─── validateIdempotencyKey ───────────────────────────

describe("idempotency/validateIdempotencyKey", () => {
  it("aceita chave válida com caracteres permitidos", () => {
    expect(validateIdempotencyKey("create_version:t-1:u-1:sc-1:12345:abc")).toBe(true);
  });

  it("aceita chave com apenas alfanuméricos", () => {
    expect(validateIdempotencyKey("abc123XYZ")).toBe(true);
  });

  it("aceita chave com hífens", () => {
    expect(validateIdempotencyKey("key-with-hyphens")).toBe(true);
  });

  it("aceita chave com underscores", () => {
    expect(validateIdempotencyKey("key_with_underscores")).toBe(true);
  });

  it("aceita chave de 1 caractere", () => {
    expect(validateIdempotencyKey("a")).toBe(true);
  });

  it("aceita chave de 256 caracteres", () => {
    expect(validateIdempotencyKey("a".repeat(256))).toBe(true);
  });

  it("rejeita string vazia", () => {
    expect(validateIdempotencyKey("")).toBe(false);
  });

  it("rejeita chave com mais de 256 caracteres", () => {
    expect(validateIdempotencyKey("a".repeat(257))).toBe(false);
  });

  it("rejeita caracteres não permitidos (espaço)", () => {
    expect(validateIdempotencyKey("key with space")).toBe(false);
  });

  it("rejeita caracteres não permitidos (ponto)", () => {
    expect(validateIdempotencyKey("key.with.dots")).toBe(false);
  });

  it("rejeita caracteres não permitidos (@)", () => {
    expect(validateIdempotencyKey("key@domain")).toBe(false);
  });

  it("rejeita não-string", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateIdempotencyKey(123 as any)).toBe(false);
  });
});

// ─── generateInputHash ────────────────────────────────

describe("idempotency/generateInputHash", () => {
  it("retorna string hexadecimal de 64 caracteres (SHA-256)", () => {
    const hash = generateInputHash({ a: 1, b: "teste" });
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("é determinístico com mesmos dados", () => {
    const input = { a: 1, b: "hello", c: true };
    expect(generateInputHash(input)).toBe(generateInputHash(input));
  });

  it("é determinístico independente da ordem das chaves", () => {
    const h1 = generateInputHash({ a: 1, b: 2 });
    const h2 = generateInputHash({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it("canonicaliza strings para lowercase", () => {
    const h1 = generateInputHash({ a: "ABC" });
    const h2 = generateInputHash({ a: "abc" });
    expect(h1).toBe(h2);
  });

  it("canonicaliza com trim", () => {
    const h1 = generateInputHash({ a: "  hello  " });
    const h2 = generateInputHash({ a: "hello" });
    expect(h1).toBe(h2);
  });

  it("gera hashes diferentes para dados diferentes", () => {
    const h1 = generateInputHash({ a: 1 });
    const h2 = generateInputHash({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it("ignora null e undefined recursivamente", () => {
    const h1 = generateInputHash({ a: 1, b: null, c: undefined });
    const h2 = generateInputHash({ a: 1 });
    expect(h1).toBe(h2);
  });

  it("lida com objetos aninhados", () => {
    const h1 = generateInputHash({ a: { b: 1, c: 2 } });
    const h2 = generateInputHash({ a: { c: 2, b: 1 } });
    expect(h1).toBe(h2);
  });

  it("lida com arrays", () => {
    const h1 = generateInputHash({ a: [1, 2, 3] });
    const h2 = generateInputHash({ a: [1, 2, 3] });
    expect(h1).toBe(h2);
  });

  it("gera hash diferente para arrays com ordem diferente", () => {
    const h1 = generateInputHash({ a: [1, 2, 3] });
    const h2 = generateInputHash({ a: [3, 2, 1] });
    expect(h1).not.toBe(h2);
  });

  it("gera hash diferente quando engineVersion muda", () => {
    const h1 = generateInputHash({
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      engineVersion: "1.0.0",
      schemaVersion: "1",
    });
    const h2 = generateInputHash({
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      engineVersion: "1.0.1",
      schemaVersion: "1",
    });

    expect(h1).not.toBe(h2);
  });

  it("gera hash diferente quando schemaVersion muda", () => {
    const h1 = generateInputHash({
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      engineVersion: "1.0.0",
      schemaVersion: "1",
    });
    const h2 = generateInputHash({
      scenarioType: "main",
      feeType: "fixed",
      feeValueCents: 100000,
      engineVersion: "1.0.0",
      schemaVersion: "2",
    });

    expect(h1).not.toBe(h2);
  });
});

// ─── computeInputHash ─────────────────────────────────

describe("idempotency/computeInputHash", () => {
  it("retorna string hexadecimal de 16 caracteres", () => {
    const hash = computeInputHash({ a: 1, b: "teste" });
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
  });

  it("é determinístico com mesmos dados", () => {
    const input = { a: 1, b: "hello", c: true };
    expect(computeInputHash(input)).toBe(computeInputHash(input));
  });

  it("é determinístico independente da ordem das chaves", () => {
    const h1 = computeInputHash({ a: 1, b: 2 });
    const h2 = computeInputHash({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it("gera hashes diferentes para dados diferentes", () => {
    const h1 = computeInputHash({ a: 1 });
    const h2 = computeInputHash({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it("ignora null e undefined", () => {
    const h1 = computeInputHash({ a: 1, b: null, c: undefined });
    const h2 = computeInputHash({ a: 1 });
    expect(h1).toBe(h2);
  });

  it(" trata valores camelCase e snake_case como strings diferentes", () => {
    const h1 = computeInputHash({ camelCase: "abc" });
    const h2 = computeInputHash({ camel_case: "abc" });
    expect(h1).not.toBe(h2);
  });
});

// ─── computeCalculationHash ───────────────────────────

describe("idempotency/computeCalculationHash", () => {
  const baseParams = {
    serviceId: "svc-1",
    feeType: "fixed",
    feeValue: 100000,
    currency: "BRL",
    paymentMethod: "single",
    installments: 6,
    engineVersion: "1.0.0",
    schemaVersion: "1",
  };

  it("retorna string hexadecimal de 16 caracteres", () => {
    const hash = computeCalculationHash(baseParams);
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
  });

  it("é determinístico com mesmos parâmetros", () => {
    const h1 = computeCalculationHash(baseParams);
    const h2 = computeCalculationHash(baseParams);
    expect(h1).toBe(h2);
  });

  it("gera hashes diferentes para parâmetros diferentes", () => {
    const h1 = computeCalculationHash(baseParams);
    const h2 = computeCalculationHash({ ...baseParams, feeValue: 999999 });
    expect(h1).not.toBe(h2);
  });

  it("normaliza opções undefined para null", () => {
    const p1 = { ...baseParams, successFeeRate: undefined, recurringMonths: undefined };
    const p2 = { ...baseParams, successFeeRate: null, recurringMonths: null };
    expect(computeCalculationHash(p1)).toBe(computeCalculationHash(p2));
  });

  it("gera hash diferente quando successFeeRate está definido", () => {
    const h1 = computeCalculationHash(baseParams);
    const h2 = computeCalculationHash({ ...baseParams, successFeeRate: 500 });
    expect(h1).not.toBe(h2);
  });

  it("gera hash diferente quando billingFrequency está definido", () => {
    const h1 = computeCalculationHash(baseParams);
    const h2 = computeCalculationHash({ ...baseParams, billingFrequency: "monthly" });
    expect(h1).not.toBe(h2);
  });
});
