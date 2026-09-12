import { describe, it, expect } from "vitest";
import {
  ScenarioNotFoundError,
  ScenarioArchivedError,
  DuplicateScenarioError,
  VersionNotFoundError,
  VersionImmutabilityError,
  OptimisticLockError,
  IdempotencyConflictError,
  ServiceNotFoundError,
  ReferenceTenantError,
  AssistedAccessBlockedError,
} from "../application-errors";

// ─── Erros de Cenário ─────────────────────────────────

describe("application-errors/ScenarioNotFoundError", () => {
  it("tem code correto", () => {
    const err = new ScenarioNotFoundError("sc-1");
    expect(err.code).toBe("SCENARIO_NOT_FOUND");
  });

  it("tem message com o scenarioId", () => {
    const err = new ScenarioNotFoundError("sc-99");
    expect(err.message).toContain("sc-99");
  });

  it("é instância de Error", () => {
    expect(new ScenarioNotFoundError("sc-1")).toBeInstanceOf(Error);
  });

  it("tem name correto", () => {
    expect(new ScenarioNotFoundError("sc-1").name).toBe("ScenarioNotFoundError");
  });
});

describe("application-errors/ScenarioArchivedError", () => {
  it("tem code correto", () => {
    const err = new ScenarioArchivedError("sc-1");
    expect(err.code).toBe("SCENARIO_ARCHIVED");
  });

  it("tem message com o scenarioId", () => {
    const err = new ScenarioArchivedError("sc-10");
    expect(err.message).toContain("sc-10");
  });

  it("tem name correto", () => {
    expect(new ScenarioArchivedError("sc-1").name).toBe("ScenarioArchivedError");
  });
});

describe("application-errors/DuplicateScenarioError", () => {
  it("tem code correto", () => {
    const err = new DuplicateScenarioError("sc-1");
    expect(err.code).toBe("DUPLICATE_SCENARIO");
  });

  it("tem name correto", () => {
    expect(new DuplicateScenarioError("sc-1").name).toBe("DuplicateScenarioError");
  });
});

// ─── Erros de Versão ──────────────────────────────────

describe("application-errors/VersionNotFoundError", () => {
  it("tem code correto", () => {
    const err = new VersionNotFoundError("ver-1");
    expect(err.code).toBe("VERSION_NOT_FOUND");
  });

  it("tem message com o versionId", () => {
    const err = new VersionNotFoundError("ver-42");
    expect(err.message).toContain("ver-42");
  });

  it("tem name correto", () => {
    expect(new VersionNotFoundError("ver-1").name).toBe("VersionNotFoundError");
  });
});

describe("application-errors/VersionImmutabilityError", () => {
  it("tem code correto", () => {
    const err = new VersionImmutabilityError("ver-1");
    expect(err.code).toBe("VERSION_IMMUTABLE");
  });

  it("tem message com o versionId", () => {
    const err = new VersionImmutabilityError("ver-5");
    expect(err.message).toContain("ver-5");
  });

  it("tem name correto", () => {
    expect(new VersionImmutabilityError("ver-1").name).toBe("VersionImmutabilityError");
  });
});

// ─── Erros de Concorrência ────────────────────────────

describe("application-errors/OptimisticLockError", () => {
  it("tem code correto", () => {
    const err = new OptimisticLockError();
    expect(err.code).toBe("OPTIMISTIC_LOCK_CONFLICT");
  });

  it("usa mensagem padrão quando não fornecida", () => {
    const err = new OptimisticLockError();
    expect(err.message).toContain("Conflito de concorrência");
  });

  it("aceita mensagem customizada", () => {
    const err = new OptimisticLockError("Custom message");
    expect(err.message).toBe("Custom message");
  });

  it("tem name correto", () => {
    expect(new OptimisticLockError().name).toBe("OptimisticLockError");
  });
});

// ─── Erros de Idempotência ────────────────────────────

describe("application-errors/IdempotencyConflictError", () => {
  it("tem code correto", () => {
    const err = new IdempotencyConflictError("key-123");
    expect(err.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("tem message com a chave", () => {
    const err = new IdempotencyConflictError("key-123");
    expect(err.message).toContain("key-123");
  });

  it("tem name correto", () => {
    expect(new IdempotencyConflictError("key-123").name).toBe("IdempotencyConflictError");
  });
});

// ─── Erros de Serviço / Lead / Cliente ────────────────

describe("application-errors/ServiceNotFoundError", () => {
  it("tem code correto", () => {
    const err = new ServiceNotFoundError("svc-1");
    expect(err.code).toBe("SERVICE_NOT_FOUND");
  });

  it("tem message com o serviceId", () => {
    const err = new ServiceNotFoundError("svc-99");
    expect(err.message).toContain("svc-99");
  });

  it("tem name correto", () => {
    expect(new ServiceNotFoundError("svc-1").name).toBe("ServiceNotFoundError");
  });
});

describe("application-errors/ReferenceTenantError", () => {
  it("tem code correto", () => {
    const err = new ReferenceTenantError("serviço", "ref-1");
    expect(err.code).toBe("REFERENCE_TENANT_MISMATCH");
  });

  it("tem message com entity e id", () => {
    const err = new ReferenceTenantError("lead", "lead-42");
    expect(err.message).toContain("lead");
    expect(err.message).toContain("lead-42");
  });

  it("aceita todas as entidades", () => {
    for (const entity of ["serviço", "lead", "cliente"] as const) {
      const err = new ReferenceTenantError(entity, "ref-1");
      expect(err.message).toContain(entity);
    }
  });

  it("tem name correto", () => {
    expect(new ReferenceTenantError("serviço", "ref-1").name).toBe("ReferenceTenantError");
  });
});

// ─── Erros de Acesso Assistido ────────────────────────

describe("application-errors/AssistedAccessBlockedError", () => {
  it("tem code correto", () => {
    const err = new AssistedAccessBlockedError("create_version");
    expect(err.code).toBe("ASSISTED_ACCESS_BLOCKED");
  });

  it("tem message com a operação", () => {
    const err = new AssistedAccessBlockedError("activate");
    expect(err.message).toContain("activate");
  });

  it("tem name correto", () => {
    expect(
      new AssistedAccessBlockedError("create_version").name,
    ).toBe("AssistedAccessBlockedError");
  });
});