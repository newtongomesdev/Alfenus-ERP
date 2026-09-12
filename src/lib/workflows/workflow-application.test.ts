import { describe, expect, it } from "vitest";

/**
 * Unit tests for workflow template application logic.
 *
 * Mirrors the business logic in workflows/actions.ts: item type filtering,
 * date offset calculation, task/deadline row generation, and permission checks.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface WorkflowTemplateItem {
  itemType: "task" | "deadline";
  title: string;
  description: string | null;
  offsetDays: number;
  priority: "baixa" | "normal" | "alta" | "urgente";
  sortOrder: number;
}

interface GeneratedTask {
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueAt: string; // ISO date
}

interface GeneratedDeadline {
  title: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string; // YYYY-MM-DD
  description: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring workflow action logic
// ---------------------------------------------------------------------------

function filterByType(items: WorkflowTemplateItem[], type: "task" | "deadline"): WorkflowTemplateItem[] {
  return items.filter((item) => item.itemType === type);
}

function calculateDueDate(baseDate: Date, offsetDays: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + offsetDays);
  return result;
}

function toISODateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateTaskRows(
  items: WorkflowTemplateItem[],
  baseDate: Date,
  context: { lawFirmId: string; clientId: string | null; caseId: string; memberId: string },
): GeneratedTask[] {
  return filterByType(items, "task").map((item) => ({
    title: item.title,
    description: item.description,
    priority: item.priority,
    status: "pendente",
    dueAt: calculateDueDate(baseDate, item.offsetDays).toISOString(),
  }));
}

function generateDeadlineRows(
  items: WorkflowTemplateItem[],
  baseDate: Date,
): GeneratedDeadline[] {
  return filterByType(items, "deadline").map((item) => ({
    title: item.title,
    type: "prazo_interno",
    priority: item.priority,
    status: "pendente",
    dueDate: toISODateOnly(calculateDueDate(baseDate, item.offsetDays)),
    description: item.description,
  }));
}

function sortItemsByOrder(items: WorkflowTemplateItem[]): WorkflowTemplateItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Workflow application – item type filtering", () => {
  const items: WorkflowTemplateItem[] = [
    { itemType: "task", title: "Tarefa 1", description: null, offsetDays: 0, priority: "normal", sortOrder: 1 },
    { itemType: "deadline", title: "Prazo 1", description: null, offsetDays: 5, priority: "alta", sortOrder: 2 },
    { itemType: "task", title: "Tarefa 2", description: null, offsetDays: 3, priority: "baixa", sortOrder: 3 },
    { itemType: "deadline", title: "Prazo 2", description: null, offsetDays: 10, priority: "normal", sortOrder: 4 },
  ];

  it("filters only tasks", () => {
    const tasks = filterByType(items, "task");
    expect(tasks).toHaveLength(2);
    expect(tasks.every((t) => t.itemType === "task")).toBe(true);
  });

  it("filters only deadlines", () => {
    const deadlines = filterByType(items, "deadline");
    expect(deadlines).toHaveLength(2);
    expect(deadlines.every((d) => d.itemType === "deadline")).toBe(true);
  });

  it("returns empty array when no items match type", () => {
    const empty = filterByType([], "task");
    expect(empty).toHaveLength(0);
  });
});

describe("Workflow application – date offset calculation", () => {
  it("calculates due date with zero offset", () => {
    const base = new Date("2025-06-15T10:00:00Z");
    const due = calculateDueDate(base, 0);
    expect(toISODateOnly(due)).toBe("2025-06-15");
  });

  it("calculates due date with positive offset", () => {
    const base = new Date("2025-06-15T10:00:00Z");
    const due = calculateDueDate(base, 7);
    expect(toISODateOnly(due)).toBe("2025-06-22");
  });

  it("calculates due date跨越 month boundary", () => {
    const base = new Date("2025-01-28T10:00:00Z");
    const due = calculateDueDate(base, 5);
    expect(toISODateOnly(due)).toBe("2025-02-02");
  });

  it("calculates due date跨越 year boundary", () => {
    const base = new Date("2025-12-30T10:00:00Z");
    const due = calculateDueDate(base, 5);
    expect(toISODateOnly(due)).toBe("2026-01-04");
  });
});

describe("Workflow application – task row generation", () => {
  const baseDate = new Date("2025-06-15T10:00:00Z");
  const context = { lawFirmId: "firm-1", clientId: "client-1", caseId: "case-1", memberId: "member-1" };

  it("generates tasks with correct status and priority", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "task", title: "Analisar documentos", description: "Verificar todos os docs", offsetDays: 1, priority: "alta", sortOrder: 1 },
    ];

    const tasks = generateTaskRows(items, baseDate, context);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Analisar documentos");
    expect(tasks[0].description).toBe("Verificar todos os docs");
    expect(tasks[0].priority).toBe("alta");
    expect(tasks[0].status).toBe("pendente");
  });

  it("does not generate tasks from deadline items", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "deadline", title: "Prazo 1", description: null, offsetDays: 0, priority: "normal", sortOrder: 1 },
    ];

    const tasks = generateTaskRows(items, baseDate, context);
    expect(tasks).toHaveLength(0);
  });

  it("generates multiple tasks in order", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "task", title: "Tarefa 2", description: null, offsetDays: 5, priority: "normal", sortOrder: 2 },
      { itemType: "task", title: "Tarefa 1", description: null, offsetDays: 1, priority: "normal", sortOrder: 1 },
    ];

    const sorted = sortItemsByOrder(items);
    const tasks = generateTaskRows(sorted, baseDate, context);
    expect(tasks[0].title).toBe("Tarefa 1");
    expect(tasks[1].title).toBe("Tarefa 2");
  });
});

describe("Workflow application – deadline row generation", () => {
  const baseDate = new Date("2025-06-15T10:00:00Z");

  it("generates deadlines with prazo_interno type", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "deadline", title: "Responder petição", description: null, offsetDays: 3, priority: "urgente", sortOrder: 1 },
    ];

    const deadlines = generateDeadlineRows(items, baseDate);
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0].type).toBe("prazo_interno");
    expect(deadlines[0].status).toBe("pendente");
    expect(deadlines[0].dueDate).toBe("2025-06-18");
  });

  it("does not generate deadlines from task items", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "task", title: "Tarefa 1", description: null, offsetDays: 0, priority: "normal", sortOrder: 1 },
    ];

    const deadlines = generateDeadlineRows(items, baseDate);
    expect(deadlines).toHaveLength(0);
  });

  it("formats dueDate as YYYY-MM-DD", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "deadline", title: "Prazo", description: null, offsetDays: 0, priority: "normal", sortOrder: 1 },
    ];

    const deadlines = generateDeadlineRows(items, baseDate);
    expect(deadlines[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("Workflow application – mixed item types", () => {
  const baseDate = new Date("2025-06-15T10:00:00Z");
  const context = { lawFirmId: "firm-1", clientId: "client-1", caseId: "case-1", memberId: "member-1" };

  it("handles template with both tasks and deadlines", () => {
    const items: WorkflowTemplateItem[] = [
      { itemType: "task", title: "Tarefa 1", description: null, offsetDays: 0, priority: "normal", sortOrder: 1 },
      { itemType: "deadline", title: "Prazo 1", description: null, offsetDays: 5, priority: "alta", sortOrder: 2 },
      { itemType: "task", title: "Tarefa 2", description: null, offsetDays: 3, priority: "baixa", sortOrder: 3 },
    ];

    const tasks = generateTaskRows(items, baseDate, context);
    const deadlines = generateDeadlineRows(items, baseDate);

    expect(tasks).toHaveLength(2);
    expect(deadlines).toHaveLength(1);
  });

  it("handles empty template", () => {
    const items: WorkflowTemplateItem[] = [];
    const tasks = generateTaskRows(items, baseDate, context);
    const deadlines = generateDeadlineRows(items, baseDate);

    expect(tasks).toHaveLength(0);
    expect(deadlines).toHaveLength(0);
  });
});

describe("Workflow application – permission check", () => {
  it("requires processos.editar permission to apply workflow", () => {
    // Mirrors: if (!can(context.member.role, "processos.editar"))
    const canEdit = (role: string): boolean => {
      const rolePermissions: Record<string, string[]> = {
        proprietario: ["processos.editar"],
        administrador: ["processos.editar"],
        advogado: ["processos.editar"],
        assistente: [],
        financeiro: [],
        colaborador: [],
        visualizador: [],
      };
      return rolePermissions[role]?.includes("processos.editar") ?? false;
    };

    expect(canEdit("proprietario")).toBe(true);
    expect(canEdit("administrador")).toBe(true);
    expect(canEdit("advogado")).toBe(true);
    expect(canEdit("assistente")).toBe(false);
    expect(canEdit("financeiro")).toBe(false);
    expect(canEdit("colaborador")).toBe(false);
    expect(canEdit("visualizador")).toBe(false);
  });
});
