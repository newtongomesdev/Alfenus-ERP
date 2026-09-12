import { describe, expect, it } from "vitest";
import {
  parseCsvLine,
  parseCsvContent,
  mapRowToFields,
  validateRow,
  findDuplicates,
  processImport,
} from "./csv-parser";

describe("CSV parser – line parsing", () => {
  it("parses simple comma-separated values", () => {
    expect(parseCsvLine("João,joao@test.com,11999998888")).toEqual(["João", "joao@test.com", "11999998888"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvLine('"Maria, Silva",maria@test.com')).toEqual(["Maria, Silva", "maria@test.com"]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCsvLine('"João ""Silva""",joao@test.com')).toEqual(['João "Silva"', "joao@test.com"]);
  });

  it("trims whitespace", () => {
    expect(parseCsvLine("  João ,  joao@test.com  ")).toEqual(["João", "joao@test.com"]);
  });

  it("handles semicolon delimiter", () => {
    expect(parseCsvLine("João;joao@test.com", ";")).toEqual(["João", "joao@test.com"]);
  });
});

describe("CSV parser – content parsing", () => {
  it("parses multi-line CSV", () => {
    const csv = "name,email\nJoão,joao@test.com\nMaria,maria@test.com";
    const rows = parseCsvContent(csv);
    expect(rows).toHaveLength(3); // header + 2 data rows
    expect(rows[0].values).toEqual(["name", "email"]);
    expect(rows[1].values).toEqual(["João", "joao@test.com"]);
  });

  it("skips empty lines", () => {
    const csv = "name,email\nJoão,joao@test.com\n\nMaria,maria@test.com\n";
    expect(parseCsvContent(csv)).toHaveLength(3);
  });

  it("returns empty for empty content", () => {
    expect(parseCsvContent("")).toHaveLength(0);
    expect(parseCsvContent("  \n  ")).toHaveLength(0);
  });

  it("tracks line numbers", () => {
    const csv = "name,email\nJoão,joao@test.com\nMaria,maria@test.com";
    const rows = parseCsvContent(csv);
    expect(rows[0].lineNumber).toBe(1);
    expect(rows[1].lineNumber).toBe(2);
  });
});

describe("CSV parser – column mapping", () => {
  it("maps CSV columns to target fields", () => {
    const headers = ["nome", "email", "telefone"];
    const values = ["João", "joao@test.com", "1199999"];
    const mapping = [
      { csvColumn: "nome", targetField: "name" },
      { csvColumn: "email", targetField: "email" },
      { csvColumn: "telefone", targetField: "phone" },
    ];

    const result = mapRowToFields(values, headers, mapping);
    expect(result).toEqual({ name: "João", email: "joao@test.com", phone: "1199999" });
  });

  it("handles missing columns gracefully", () => {
    const headers = ["nome", "email"];
    const values = ["João", "joao@test.com"];
    const mapping = [
      { csvColumn: "nome", targetField: "name" },
      { csvColumn: "telefone", targetField: "phone" },
    ];

    const result = mapRowToFields(values, headers, mapping);
    expect(result).toEqual({ name: "João" });
    expect(result.phone).toBeUndefined();
  });
});

describe("CSV parser – row validation", () => {
  it("passes valid client row", () => {
    const errors = validateRow({ name: "João Silva" }, "client");
    expect(errors).toHaveLength(0);
  });

  it("fails when name is missing", () => {
    const errors = validateRow({ email: "test@test.com" }, "client");
    expect(errors).toContainEqual("Campo obrigatório 'name' está vazio");
  });

  it("fails for invalid personType", () => {
    const errors = validateRow({ name: "João", personType: "invalida" }, "client");
    expect(errors.some((e) => e.includes("Tipo de pessoa inválido"))).toBe(true);
  });

  it("fails for invalid email", () => {
    const errors = validateRow({ name: "João", email: "not-an-email" }, "client");
    expect(errors.some((e) => e.includes("Email inválido"))).toBe(true);
  });

  it("passes for valid email", () => {
    const errors = validateRow({ name: "João", email: "joao@test.com" }, "client");
    expect(errors).toHaveLength(0);
  });

  it("fails for invalid document length", () => {
    const errors = validateRow({ name: "João", document: "123" }, "client");
    expect(errors.some((e) => e.includes("Documento inválido"))).toBe(true);
  });

  it("allows empty optional fields", () => {
    const errors = validateRow({ name: "João", email: "", phone: "" }, "client");
    expect(errors).toHaveLength(0);
  });
});

describe("CSV parser – duplicate detection", () => {
  const existing = [
    { name: "João Silva", document: "12345678901", email: "joao@test.com" },
    { name: "Maria Santos", document: null, email: "maria@test.com" },
  ];

  it("detects duplicate by name", () => {
    const rows = [{ name: "João Silva", email: "" }];
    const dupes = findDuplicates(rows, existing);
    expect(dupes.has(0)).toBe(true);
  });

  it("detects duplicate by document", () => {
    const rows = [{ name: "Outro Nome", document: "123.456.789-01", email: "" }];
    const dupes = findDuplicates(rows, existing);
    expect(dupes.has(0)).toBe(true);
  });

  it("detects duplicate by email", () => {
    const rows = [{ name: "Novo", email: "maria@test.com" }];
    const dupes = findDuplicates(rows, existing);
    expect(dupes.has(0)).toBe(true);
  });

  it("does not flag unique records", () => {
    const rows = [{ name: "Pedro Costa", document: "99999999999", email: "pedro@test.com" }];
    const dupes = findDuplicates(rows, existing);
    expect(dupes.has(0)).toBe(false);
  });

  it("detects intra-file duplicates", () => {
    const rows = [
      { name: "João", email: "" },
      { name: "João", email: "" },
    ];
    const dupes = findDuplicates(rows, []);
    expect(dupes.has(0)).toBe(false); // first occurrence is not duplicate
    expect(dupes.has(1)).toBe(true);  // second occurrence is duplicate
  });
});

describe("CSV parser – full import pipeline", () => {
  const csv = "name,email,document\nJoão,joao@test.com,12345678901\nMaria,maria@test.com,98765432100\n,invalid,";
  const mapping = [
    { csvColumn: "name", targetField: "name" },
    { csvColumn: "email", targetField: "email" },
    { csvColumn: "document", targetField: "document" },
  ];

  it("counts total rows correctly", () => {
    const result = processImport(csv, "client", mapping, []);
    expect(result.totalRows).toBe(3);
  });

  it("identifies invalid rows", () => {
    const result = processImport(csv, "client", mapping, []);
    expect(result.invalidRows).toBe(1); // row with empty name
  });

  it("identifies duplicates", () => {
    const existing = [{ name: "João Silva", document: "12345678901", email: null }];
    const result = processImport(csv, "client", mapping, existing);
    expect(result.duplicateRows).toBeGreaterThanOrEqual(1);
  });

  it("returns preview of first 10 rows", () => {
    const result = processImport(csv, "client", mapping, []);
    expect(result.preview.length).toBeLessThanOrEqual(10);
  });

  it("returns empty result for empty CSV", () => {
    const result = processImport("", "client", mapping, []);
    expect(result.totalRows).toBe(0);
  });
});
