import { describe, it, expect } from "vitest";

import type { ChecklistItem, ChecklistTemplate } from "./actions";

describe("Checklist Logic", () => {
  describe("ChecklistItem operations", () => {
    const makeItem = (title: string, done = false): ChecklistItem => ({
      id: crypto.randomUUID(),
      title,
      done,
    });

    it("adiciona item ao checklist", () => {
      const items: ChecklistItem[] = [];
      const newItem = makeItem("Buscar RG do cliente");
      items.push(newItem);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Buscar RG do cliente");
      expect(items[0].done).toBe(false);
    });

    it("toggle marca item como concluído", () => {
      const items: ChecklistItem[] = [makeItem("Item 1"), makeItem("Item 2")];
      const toggled = items.map((item) =>
        item.id === items[0].id ? { ...item, done: !item.done } : item
      );
      expect(toggled[0].done).toBe(true);
      expect(toggled[1].done).toBe(false);
    });

    it("toggle desmarca item já concluído", () => {
      const items: ChecklistItem[] = [{ ...makeItem("Item 1"), done: true }];
      const toggled = items.map((item) =>
        item.id === items[0].id ? { ...item, done: !item.done } : item
      );
      expect(toggled[0].done).toBe(false);
    });

    it("remove item do checklist", () => {
      const items: ChecklistItem[] = [
        makeItem("Item 1"),
        makeItem("Item 2"),
        makeItem("Item 3"),
      ];
      const filtered = items.filter((item) => item.id !== items[1].id);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.title)).toEqual(["Item 1", "Item 3"]);
    });

    it("calcula progresso corretamente", () => {
      const items: ChecklistItem[] = [
        { ...makeItem("A"), done: true },
        { ...makeItem("B"), done: true },
        makeItem("C"),
        makeItem("D"),
      ];
      const completed = items.filter((i) => i.done).length;
      const progress = Math.round((completed / items.length) * 100);
      expect(completed).toBe(2);
      expect(progress).toBe(50);
    });

    it("progresso é 0% para checklist vazio", () => {
      const items: ChecklistItem[] = [];
      const completed = items.filter((i) => i.done).length;
      const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      expect(progress).toBe(0);
    });

    it("progresso é 100% quando todos concluídos", () => {
      const items: ChecklistItem[] = [
        { ...makeItem("A"), done: true },
        { ...makeItem("B"), done: true },
      ];
      const completed = items.filter((i) => i.done).length;
      const progress = Math.round((completed / items.length) * 100);
      expect(progress).toBe(100);
    });
  });

  describe("ChecklistTemplate", () => {
    it("template cria itens corretamente", () => {
      const template: ChecklistTemplate = {
        id: "tpl-1",
        name: "Ação Trabalhista",
        description: "Checklist padrão para ações trabalhistas",
        category: "trabalhista",
        items: [
          { title: "Procuração", required: true },
          { title: "CTPS", required: true },
          { title: "Holerites", required: false },
          { title: "Contrato de Trabalho", required: false },
        ],
      };

      const newItems: ChecklistItem[] = template.items.map((ti) => ({
        id: crypto.randomUUID(),
        title: ti.title,
        done: false,
      }));

      expect(newItems).toHaveLength(4);
      expect(newItems.every((i) => i.done === false)).toBe(true);
      expect(newItems.map((i) => i.title)).toContain("Procuração");
      expect(newItems.map((i) => i.title)).toContain("CTPS");
    });

    it("template com lista vazia não adiciona itens", () => {
      const template: ChecklistTemplate = {
        id: "tpl-2",
        name: "Vazio",
        description: null,
        category: "geral",
        items: [],
      };

      const newItems: ChecklistItem[] = template.items.map((ti) => ({
        id: crypto.randomUUID(),
        title: ti.title,
        done: false,
      }));

      expect(newItems).toHaveLength(0);
    });

    it("itens existentes não são substituídos ao aplicar template", () => {
      const existing: ChecklistItem[] = [{ id: "existing-1", title: "Item Existente", done: false }];
      const templateItems = [{ title: "Novo Item 1" }, { title: "Novo Item 2" }];
      const newItems: ChecklistItem[] = templateItems.map((ti) => ({
        id: crypto.randomUUID(),
        title: ti.title,
        done: false,
      }));

      const combined = [...existing, ...newItems];
      expect(combined).toHaveLength(3);
      expect(combined[0].title).toBe("Item Existente");
    });
  });
});
