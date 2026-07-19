import { describe, it, expect } from "vitest";

import { toCSV, type ExportResult } from "./csv";

describe("CSV Export", () => {
  describe("toCSV", () => {
    it("gera CSV simples com headers e rows", () => {
      const result: ExportResult = {
        headers: ["Nome", "E-mail"],
        rows: [
          ["João", "joao@email.com"],
          ["Maria", "maria@email.com"],
        ],
        filename: "test",
        totalRows: 2,
      };

      const csv = toCSV(result);
      const lines = csv.split("\n");
      expect(lines[0]).toContain("Nome,E-mail");
      expect(lines[1]).toContain("João,joao@email.com");
      expect(lines[2]).toContain("Maria,maria@email.com");
    });

    it("inclui BOM UTF-8 para compatibilidade com Excel", () => {
      const result: ExportResult = {
        headers: ["ID"],
        rows: [["1"]],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it("escapa campos com vírgula", () => {
      const result: ExportResult = {
        headers: ["Descrição"],
        rows: [["Valor alto, muito alto"]],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      expect(csv).toContain('"Valor alto, muito alto"');
    });

    it("escapa campos com aspas", () => {
      const result: ExportResult = {
        headers: ["Nome"],
        rows: [['João "da Silva"']],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      expect(csv).toContain('"João ""da Silva"""');
    });

    it("escapa campos com quebra de linha", () => {
      const result: ExportResult = {
        headers: ["Notas"],
        rows: [["Linha 1\nLinha 2"]],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      expect(csv).toContain('"Linha 1\nLinha 2"');
    });

    it("trata valores null como string vazia", () => {
      const result: ExportResult = {
        headers: ["A", "B"],
        rows: [[null, ""]],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      const lines = csv.split("\n");
      expect(lines[1]).toBe(",");
    });

    it("trata valores numéricos corretamente", () => {
      const result: ExportResult = {
        headers: ["Valor"],
        rows: [[150.5]],
        filename: "test",
        totalRows: 1,
      };

      const csv = toCSV(result);
      expect(csv).toContain("150.5");
    });

    it("gera CSV vazio com apenas headers", () => {
      const result: ExportResult = {
        headers: ["Col1", "Col2"],
        rows: [],
        filename: "test",
        totalRows: 0,
      };

      const csv = toCSV(result);
      const lines = csv.split("\n").filter((l) => l.trim());
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("Col1,Col2");
    });

    it("múltiplas rows", () => {
      const result: ExportResult = {
        headers: ["ID", "Nome"],
        rows: [
          ["1", "João"],
          ["2", "Maria"],
          ["3", "Pedro"],
        ],
        filename: "test",
        totalRows: 3,
      };

      const csv = toCSV(result);
      const lines = csv.split("\n").filter((l) => l.trim());
      expect(lines).toHaveLength(4); // header + 3 rows
    });
  });
});
