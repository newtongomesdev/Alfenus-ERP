/**
 * ETAPA 5.2.2.4 — Erros de aplicação do pricing.
 *
 * Separados do motor puro (errors.ts) para manter
 * o motor livre de dependências de infraestrutura.
 */

// ─── Cenário ───────────────────────────────────────────

export class ScenarioNotFoundError extends Error {
  readonly code = "SCENARIO_NOT_FOUND" as const;

  constructor(scenarioId: string) {
    super(`Cenário não encontrado: ${scenarioId}`);
    this.name = "ScenarioNotFoundError";
  }
}

export class ScenarioArchivedError extends Error {
  readonly code = "SCENARIO_ARCHIVED" as const;

  constructor(scenarioId: string) {
    super(`Cenário arquivado: ${scenarioId}. Restaure antes de operar.`);
    this.name = "ScenarioArchivedError";
  }
}

export class DuplicateScenarioError extends Error {
  readonly code = "DUPLICATE_SCENARIO" as const;

  constructor(_scenarioId: string) {
    super(`Já existe um cenário com este nome para o serviço selecionado.`);
    this.name = "DuplicateScenarioError";
  }
}

// ─── Versão ────────────────────────────────────────────

export class VersionNotFoundError extends Error {
  readonly code = "VERSION_NOT_FOUND" as const;

  constructor(versionId: string) {
    super(`Versão não encontrada: ${versionId}`);
    this.name = "VersionNotFoundError";
  }
}

export class VersionImmutabilityError extends Error {
  readonly code = "VERSION_IMMUTABLE" as const;

  constructor(versionId: string) {
    super(`Versão ${versionId} é imutável e não pode ser alterada.`);
    this.name = "VersionImmutabilityError";
  }
}

// ─── Concorrência ──────────────────────────────────────

export class OptimisticLockError extends Error {
  readonly code = "OPTIMISTIC_LOCK_CONFLICT" as const;

  constructor(
    message = "Conflito de concorrência. O cenário foi modificado por outro usuário. Recarregue e tente novamente.",
  ) {
    super(message);
    this.name = "OptimisticLockError";
  }
}

// ─── Idempotência ──────────────────────────────────────

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT" as const;

  constructor(key: string) {
    super(`Chave de idempotência já utilizada com resultado diferente: ${key}`);
    this.name = "IdempotencyConflictError";
  }
}

// ─── Serviço / Lead / Cliente ──────────────────────────

export class ServiceNotFoundError extends Error {
  readonly code = "SERVICE_NOT_FOUND" as const;

  constructor(serviceId: string) {
    super(`Serviço não encontrado: ${serviceId}`);
    this.name = "ServiceNotFoundError";
  }
}

export class ReferenceTenantError extends Error {
  readonly code = "REFERENCE_TENANT_MISMATCH" as const;

  constructor(entity: "serviço" | "lead" | "cliente", id: string) {
    super(`Referência de ${entity} pertence a outro tenant: ${id}`);
    this.name = "ReferenceTenantError";
  }
}

// ─── Serviço Assistido ─────────────────────────────────

export class AssistedAccessBlockedError extends Error {
  readonly code = "ASSISTED_ACCESS_BLOCKED" as const;

  constructor(operation: string) {
    super(`Operação não autorizada para suporte assistido: ${operation}`);
    this.name = "AssistedAccessBlockedError";
  }
}
