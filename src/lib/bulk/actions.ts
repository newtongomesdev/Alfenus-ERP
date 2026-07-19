/**
 * Bulk action logic for batch operations on entities.
 *
 * Pure logic — no database access. Handles:
 * - Action validation
 * - Permission checking per action type
 * - Batch grouping
 * - Progress tracking
 * - Result aggregation
 */

export type BulkActionType =
  | "delete"
  | "update_status"
  | "assign_responsible"
  | "add_tag"
  | "remove_tag"
  | "archive";

export type EntityType = "client" | "lead" | "legal_case" | "task" | "contract";

export interface BulkActionRequest {
  entityType: EntityType;
  action: BulkActionType;
  ids: string[];
  params?: Record<string, string>;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
  entityType: EntityType;
  action: BulkActionType;
}

export interface ActionValidation {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

const ACTION_PERMISSIONS: Record<BulkActionType, string[]> = {
  delete: ["clientes.administrar", "processos.administrar", "tarefas.administrar", "contratos.administrar"],
  update_status: ["clientes.editar", "processos.editar", "tarefas.editar", "contratos.editar"],
  assign_responsible: ["clientes.editar", "processos.editar", "tarefas.editar", "contratos.editar"],
  add_tag: ["clientes.editar", "processos.editar", "contratos.editar"],
  remove_tag: ["clientes.editar", "processos.editar", "contratos.editar"],
  archive: ["clientes.editar", "processos.editar", "contratos.editar"],
};

const ENTITY_ACTIONS: Record<EntityType, BulkActionType[]> = {
  client: ["delete", "update_status", "assign_responsible", "add_tag", "remove_tag", "archive"],
  lead: ["delete", "update_status", "assign_responsible", "archive"],
  legal_case: ["delete", "update_status", "assign_responsible", "add_tag", "remove_tag", "archive"],
  task: ["delete", "update_status", "assign_responsible", "archive"],
  contract: ["delete", "update_status", "assign_responsible", "add_tag", "remove_tag", "archive"],
};

const VALID_STATUSES: Record<EntityType, string[]> = {
  client: ["ativo", "inativo", "inadimplente"],
  lead: ["novo", "contatado", "convertido", "descartado"],
  legal_case: ["em_andamento", "suspenso", "arquivado", "concluido"],
  task: ["pendente", "em_andamento", "concluida", "cancelada"],
  contract: ["rascunho", "ativo", "suspenso", "concluido", "cancelado"],
};

const MAX_IDS_PER_BATCH = 100;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateBulkAction(
  request: BulkActionRequest,
  userPermissions: string[],
): ActionValidation {
  const errors: string[] = [];

  // Validate entity type
  if (!ENTITY_ACTIONS[request.entityType]) {
    errors.push(`Tipo de entidade inválido: '${request.entityType}'`);
  }

  // Validate action for entity type
  const allowedActions = ENTITY_ACTIONS[request.entityType] || [];
  if (!allowedActions.includes(request.action)) {
    errors.push(`Ação '${request.action}' não é permitida para '${request.entityType}'`);
  }

  // Validate IDs
  if (!request.ids || request.ids.length === 0) {
    errors.push("Nenhum ID selecionado");
  }
  if (request.ids && request.ids.length > MAX_IDS_PER_BATCH) {
    errors.push(`Máximo de ${MAX_IDS_PER_BATCH} registros por vez`);
  }

  // Check for duplicate IDs
  if (request.ids) {
    const uniqueIds = new Set(request.ids);
    if (uniqueIds.size !== request.ids.length) {
      errors.push("IDs duplicados na seleção");
    }
  }

  // Validate params for specific actions
  if (request.action === "update_status" && request.params?.status) {
    const validStatuses = VALID_STATUSES[request.entityType] || [];
    if (!validStatuses.includes(request.params.status)) {
      errors.push(`Status inválido: '${request.params.status}' para '${request.entityType}'`);
    }
  }

  if (request.action === "add_tag" && (!request.params?.tag || request.params.tag.trim().length === 0)) {
    errors.push("Tag é obrigatória para ação 'add_tag'");
  }

  if (request.action === "remove_tag" && (!request.params?.tag || request.params.tag.trim().length === 0)) {
    errors.push("Tag é obrigatória para ação 'remove_tag'");
  }

  // Permission check
  const requiredPermissions = ACTION_PERMISSIONS[request.action] || [];
  // User needs at least one of the entity-specific permissions
  const entityPermission = `${request.entityType === "legal_case" ? "processos" : request.entityType}s`;
  const hasPermission = requiredPermissions.some((p) => {
    const prefix = p.split(".")[0];
    return userPermissions.some((up) => up.startsWith(prefix));
  });

  if (!hasPermission && requiredPermissions.length > 0) {
    errors.push(`Sem permissão para '${request.action}' em '${request.entityType}'`);
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Batch chunking
// ---------------------------------------------------------------------------

export function chunkIds(ids: string[], chunkSize = 50): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Result aggregation
// ---------------------------------------------------------------------------

export function aggregateResults(results: BulkActionResult[]): BulkActionResult {
  const merged: BulkActionResult = {
    success: 0,
    failed: 0,
    errors: [],
    entityType: results[0]?.entityType ?? "client",
    action: results[0]?.action ?? "delete",
  };

  for (const r of results) {
    merged.success += r.success;
    merged.failed += r.failed;
    merged.errors.push(...r.errors);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

export interface ProgressState {
  total: number;
  processed: number;
  success: number;
  failed: number;
  startedAt: Date;
  estimatedEndAt: Date | null;
}

export function calculateProgress(
  total: number,
  processed: number,
  success: number,
  failed: number,
  startedAt: Date,
): ProgressState {
  const elapsed = Date.now() - startedAt.getTime();
  const rate = processed > 0 ? elapsed / processed : 0;
  const remaining = total - processed;
  const estimatedEndAt = remaining > 0 ? new Date(Date.now() + rate * remaining) : null;

  return { total, processed, success, failed, startedAt, estimatedEndAt };
}

// ---------------------------------------------------------------------------
// Action execution plan
// ---------------------------------------------------------------------------

export interface ActionPlan {
  entityType: EntityType;
  action: BulkActionType;
  chunks: string[][];
  totalIds: number;
  params?: Record<string, string>;
}

export function buildActionPlan(request: BulkActionRequest): ActionPlan {
  return {
    entityType: request.entityType,
    action: request.action,
    chunks: chunkIds(request.ids),
    totalIds: request.ids.length,
    params: request.params,
  };
}
