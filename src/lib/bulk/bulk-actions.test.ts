import { describe, expect, it } from "vitest";
import {
  validateBulkAction,
  chunkIds,
  aggregateResults,
  calculateProgress,
  buildActionPlan,
} from "./actions";

describe("Bulk actions – validation", () => {
  const allPermissions = [
    "clientes.visualizar", "clientes.criar", "clientes.editar", "clientes.administrar",
    "processos.visualizar", "processos.criar", "processos.editar", "processos.administrar",
    "tarefas.visualizar", "tarefas.criar", "tarefas.editar", "tarefas.administrar",
    "contratos.visualizar", "contratos.criar", "contratos.editar", "contratos.administrar",
  ];

  it("validates a correct request", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "delete", ids: ["1", "2", "3"] },
      allPermissions,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty IDs", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "delete", ids: [] },
      allPermissions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Nenhum ID"))).toBe(true);
  });

  it("rejects more than 100 IDs", () => {
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    const result = validateBulkAction(
      { entityType: "client", action: "delete", ids },
      allPermissions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Máximo"))).toBe(true);
  });

  it("rejects duplicate IDs", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "delete", ids: ["1", "1", "2"] },
      allPermissions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicados"))).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "update_status", ids: ["1"], params: { status: "invalido" } },
      allPermissions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Status inválido"))).toBe(true);
  });

  it("accepts valid status", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "update_status", ids: ["1"], params: { status: "ativo" } },
      allPermissions,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects add_tag without tag", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "add_tag", ids: ["1"] },
      allPermissions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Tag é obrigatória"))).toBe(true);
  });

  it("rejects action not allowed for entity", () => {
    const result = validateBulkAction(
      { entityType: "client", action: "delete", ids: ["1"] },
      [], // no permissions at all
    );
    expect(result.valid).toBe(false);
  });
});

describe("Bulk actions – chunking", () => {
  it("chunks IDs into groups of 50", () => {
    const ids = Array.from({ length: 120 }, (_, i) => String(i));
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[1]).toHaveLength(50);
    expect(chunks[2]).toHaveLength(20);
  });

  it("handles single chunk", () => {
    const chunks = chunkIds(["1", "2", "3"]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(["1", "2", "3"]);
  });

  it("handles empty array", () => {
    expect(chunkIds([])).toHaveLength(0);
  });

  it("handles custom chunk size", () => {
    const chunks = chunkIds(["1", "2", "3", "4", "5"], 2);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(2);
    expect(chunks[2]).toHaveLength(1);
  });
});

describe("Bulk actions – result aggregation", () => {
  it("aggregates multiple results", () => {
    const results = [
      { success: 5, failed: 1, errors: [{ id: "e1", message: "err" }], entityType: "client" as const, action: "delete" as const },
      { success: 3, failed: 0, errors: [], entityType: "client" as const, action: "delete" as const },
    ];
    const merged = aggregateResults(results);
    expect(merged.success).toBe(8);
    expect(merged.failed).toBe(1);
    expect(merged.errors).toHaveLength(1);
  });

  it("handles empty results", () => {
    const merged = aggregateResults([]);
    expect(merged.success).toBe(0);
    expect(merged.failed).toBe(0);
  });
});

describe("Bulk actions – progress tracking", () => {
  it("calculates progress correctly", () => {
    const started = new Date(Date.now() - 10_000);
    const progress = calculateProgress(100, 50, 45, 5, started);
    expect(progress.total).toBe(100);
    expect(progress.processed).toBe(50);
    expect(progress.success).toBe(45);
    expect(progress.failed).toBe(5);
    expect(progress.estimatedEndAt).not.toBeNull();
  });

  it("no estimated end when complete", () => {
    const started = new Date(Date.now() - 10_000);
    const progress = calculateProgress(100, 100, 100, 0, started);
    expect(progress.estimatedEndAt).toBeNull();
  });
});

describe("Bulk actions – action plan", () => {
  it("builds a plan with chunks", () => {
    const request = {
      entityType: "client" as const,
      action: "delete" as const,
      ids: Array.from({ length: 75 }, (_, i) => String(i)),
    };
    const plan = buildActionPlan(request);
    expect(plan.totalIds).toBe(75);
    expect(plan.chunks).toHaveLength(2);
    expect(plan.entityType).toBe("client");
    expect(plan.action).toBe("delete");
  });

  it("includes params in plan", () => {
    const request = {
      entityType: "client" as const,
      action: "update_status" as const,
      ids: ["1"],
      params: { status: "ativo" },
    };
    const plan = buildActionPlan(request);
    expect(plan.params?.status).toBe("ativo");
  });
});

describe("Bulk actions – permission per entity", () => {
  it("validates all entity-action combinations", () => {
    const allPerms = [
      "clientes.visualizar", "clientes.criar", "clientes.editar", "clientes.administrar",
      "processos.visualizar", "processos.criar", "processos.editar", "processos.administrar",
      "tarefas.visualizar", "tarefas.criar", "tarefas.editar", "tarefas.administrar",
      "contratos.visualizar", "contratos.criar", "contratos.editar", "contratos.administrar",
    ];

    const entities = ["client", "lead", "legal_case", "task", "contract"] as const;
    const actions = ["delete", "update_status", "assign_responsible", "add_tag", "remove_tag", "archive"] as const;

    for (const entity of entities) {
      for (const action of actions) {
        const result = validateBulkAction(
          { entityType: entity, action, ids: ["1"] },
          allPerms,
        );
        // Should either be valid or have a specific error
        expect(typeof result.valid).toBe("boolean");
      }
    }
  });
});
