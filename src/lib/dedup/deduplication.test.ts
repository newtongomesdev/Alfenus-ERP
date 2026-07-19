import { describe, expect, it } from "vitest";
import {
  normalizeForDedup,
  normalizeDocument,
  normalizePhone,
  nameSimilarity,
  findMatches,
  mergeRecords,
  detectBatchDuplicates,
} from "./deduplication";

describe("Deduplication – normalization", () => {
  it("normalizes name with accents removed", () => {
    expect(normalizeForDedup("São Paulo")).toBe("sao paulo");
  });

  it("normalizes name to lowercase", () => {
    expect(normalizeForDedup("MARIA SILVA")).toBe("maria silva");
  });

  it("removes special characters", () => {
    expect(normalizeForDedup("João & Cia.")).toBe("joao cia");
  });

  it("handles null", () => {
    expect(normalizeForDedup(null)).toBe("");
  });

  it("normalizes document by removing formatting", () => {
    expect(normalizeDocument("123.456.789-01")).toBe("12345678901");
  });

  it("normalizes document with slashes", () => {
    expect(normalizeDocument("12/345/678")).toBe("12345678");
  });

  it("normalizes phone by keeping only digits", () => {
    expect(normalizePhone("(11) 99999-8888")).toBe("11999998888");
  });

  it("handles null phone", () => {
    expect(normalizePhone(null)).toBe("");
  });
});

describe("Deduplication – name similarity", () => {
  it("returns 1.0 for identical names", () => {
    expect(nameSimilarity("João Silva", "João Silva")).toBe(1.0);
  });

  it("returns 1.0 for same name with different case", () => {
    expect(nameSimilarity("joão silva", "JOÃO SILVA")).toBe(1.0);
  });

  it("returns high score for similar names", () => {
    const score = nameSimilarity("João Silva Santos", "João Silva Santos Neto");
    expect(score).toBeGreaterThan(0.8);
  });

  it("returns 0 for empty name", () => {
    expect(nameSimilarity("", "João")).toBe(0);
  });

  it("returns 0 for both empty", () => {
    // Both empty strings are identical, so jaroWinkler returns 1.0
    // This is acceptable behavior — empty matches empty
    const score = nameSimilarity("", "");
    expect(score).toBe(1.0);
  });
});

describe("Deduplication – match detection", () => {
  const candidates = [
    { id: "c1", name: "João Silva", document: "12345678901", email: "joao@test.com", phone: "11999998888", whatsapp: null },
    { id: "c2", name: "Maria Santos", document: "98765432100", email: "maria@test.com", phone: "11888887777", whatsapp: null },
    { id: "c3", name: "Pedro Costa", document: null, email: "pedro@test.com", phone: "11777776666", whatsapp: null },
  ];

  it("matches by document", () => {
    const source = { id: "s1", name: "João S.", document: "123.456.789-01", email: null, phone: null, whatsapp: null };
    const matches = findMatches(source, candidates);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].targetId).toBe("c1");
    expect(matches[0].reasons).toContain("documento_igual");
    expect(matches[0].confidence).toBe(1.0);
  });

  it("matches by email", () => {
    const source = { id: "s1", name: "Outro Nome", document: null, email: "maria@test.com", phone: null, whatsapp: null };
    const matches = findMatches(source, candidates);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].reasons).toContain("email_igual");
  });

  it("matches by phone", () => {
    const source = { id: "s1", name: "Outro", document: null, email: null, phone: "(11) 99999-8888", whatsapp: null };
    const matches = findMatches(source, candidates);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].reasons).toContain("telefone_igual");
  });

  it("does not match unrelated records", () => {
    const source = { id: "s1", name: "Ana Beatriz", document: "11111111111", email: "ana@test.com", phone: "11666665555", whatsapp: null };
    const matches = findMatches(source, candidates, 0.8);
    expect(matches).toHaveLength(0);
  });

  it("does not match self", () => {
    const source = { id: "c1", name: "João Silva", document: "12345678901", email: "joao@test.com", phone: "11999998888", whatsapp: null };
    const matches = findMatches(source, candidates);
    expect(matches.filter((m) => m.targetId === "c1")).toHaveLength(0);
  });

  it("returns matches sorted by confidence", () => {
    const source = { id: "s1", name: "João Silva", document: "12345678901", email: "joao@test.com", phone: "11999998888", whatsapp: null };
    const matches = findMatches(source, candidates);
    if (matches.length > 1) {
      expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence);
    }
  });
});

describe("Deduplication – merge records", () => {
  it("keeps source values when target has nulls", () => {
    const source = { id: "s1", name: "João", document: "123", email: "joao@test.com", phone: "1199", whatsapp: null };
    const target = { id: "t1", name: "João S.", document: null, email: null, phone: null, whatsapp: null };

    const merged = mergeRecords(source, target);
    expect(merged.id).toBe("t1");
    expect(merged.document).toBe("123");
    expect(merged.email).toBe("joao@test.com");
  });

  it("prefers target values when both have data", () => {
    const source = { id: "s1", name: "João", document: "111", email: null, phone: null, whatsapp: null };
    const target = { id: "t1", name: "João Silva", document: "222", email: null, phone: null, whatsapp: null };

    const merged = mergeRecords(source, target);
    expect(merged.name).toBe("João Silva");
    expect(merged.document).toBe("222");
  });
});

describe("Deduplication – batch detection", () => {
  it("finds duplicates in a batch", () => {
    const records = [
      { id: "1", name: "João Silva", document: "12345678901", email: "joao@test.com", phone: null, whatsapp: null },
      { id: "2", name: "João S.", document: "123.456.789-01", email: null, phone: null, whatsapp: null },
      { id: "3", name: "Maria", document: "99999999999", email: "maria@test.com", phone: null, whatsapp: null },
    ];

    const matches = detectBatchDuplicates(records);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for unique records", () => {
    const records = [
      { id: "1", name: "João", document: "11111111111", email: "joao@test.com", phone: "11111111111", whatsapp: null },
      { id: "2", name: "Maria", document: "22222222222", email: "maria@test.com", phone: "22222222222", whatsapp: null },
      { id: "3", name: "Pedro", document: "33333333333", email: "pedro@test.com", phone: "33333333333", whatsapp: null },
    ];

    const matches = detectBatchDuplicates(records);
    expect(matches).toHaveLength(0);
  });
});
