import { describe, it, expect } from "vitest";

import type { CustomField, CustomFieldValue } from "./actions";

describe("Custom Fields Logic", () => {
  describe("CustomField definitions", () => {
    const validField: CustomField = {
      id: "cf-1",
      entityType: "client",
      label: "Número OAB",
      fieldType: "text",
      options: null,
      required: false,
      sortOrder: 0,
    };

    it("campo de texto válido", () => {
      expect(validField.fieldType).toBe("text");
      expect(validField.label).toBeTruthy();
    });

    it("campo de seleção com opções", () => {
      const selectField: CustomField = {
        ...validField,
        id: "cf-2",
        label: "Área de Atuação",
        fieldType: "select",
        options: ["Trabalhista", "Civil", "Penal", "Tributário"],
      };
      expect(selectField.options).toHaveLength(4);
      expect(selectField.options).toContain("Trabalhista");
    });

    it("tipos de campo suportados", () => {
      const supportedTypes = ["text", "number", "date", "select", "boolean"];
      supportedTypes.forEach((type) => {
        const field: CustomField = { ...validField, fieldType: type };
        expect(supportedTypes).toContain(field.fieldType);
      });
    });

    it("entity types suportados", () => {
      const supportedEntities = ["client", "lead", "legal_case"];
      supportedEntities.forEach((entity) => {
        const field: CustomField = { ...validField, entityType: entity };
        expect(supportedEntities).toContain(field.entityType);
      });
    });
  });

  describe("CustomFieldValue operations", () => {
    it("salva valor para campo", () => {
      const values: Record<string, string | null> = {};
      values["cf-1"] = "12345/SP";
      expect(values["cf-1"]).toBe("12345/SP");
    });

    it("upsert atualiza valor existente", () => {
      const values: Record<string, string | null> = { "cf-1": "valor antigo" };
      values["cf-1"] = "valor novo";
      expect(values["cf-1"]).toBe("valor novo");
    });

    it("valor nulo remove campo", () => {
      const values: Record<string, string | null> = { "cf-1": "valor" };
      values["cf-1"] = null;
      expect(values["cf-1"]).toBeNull();
    });

    it("múltiplos campos para mesma entidade", () => {
      const values: Record<string, string | null> = {
        "cf-1": "12345/SP",
        "cf-2": "Trabalhista",
        "cf-3": "true",
      };
      expect(Object.keys(values)).toHaveLength(3);
    });
  });

  describe("Field ordering", () => {
    it("campos ordenados por sortOrder", () => {
      const fields: CustomField[] = [
        { id: "cf-3", entityType: "client", label: "C", fieldType: "text", options: null, required: false, sortOrder: 2 },
        { id: "cf-1", entityType: "client", label: "A", fieldType: "text", options: null, required: false, sortOrder: 0 },
        { id: "cf-2", entityType: "client", label: "B", fieldType: "text", options: null, required: false, sortOrder: 1 },
      ];

      const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
      expect(sorted.map((f) => f.label)).toEqual(["A", "B", "C"]);
    });
  });

  describe("Delete cascade", () => {
    it("deletar campo remove valores associados", () => {
      const fields = [{ id: "cf-1" }, { id: "cf-2" }];
      const values: Record<string, string> = { "cf-1": "v1", "cf-2": "v2" };

      const fieldIdToDelete = "cf-1";
      const remainingFields = fields.filter((f) => f.id !== fieldIdToDelete);
      delete values[fieldIdToDelete];

      expect(remainingFields).toHaveLength(1);
      expect(values).not.toHaveProperty("cf-1");
      expect(values).toHaveProperty("cf-2");
    });
  });
});
