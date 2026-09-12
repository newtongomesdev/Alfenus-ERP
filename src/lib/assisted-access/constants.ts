// ── Status da solicitação de acesso ─────────────────────────────────────────
export const ACCESS_REQUEST_STATUSES = {
  rascunho: "rascunho",
  pendente: "pendente",
  visualizada: "visualizada",
  aprovada: "aprovada",
  aprovada_com_restrições: "aprovada_com_restrições",
  recusada: "recusada",
  cancelada: "cancelada",
  expirada: "expirada",
  utilizada: "utilizada",
  encerrada: "encerrada",
} as const;

export type AccessRequestStatus =
  (typeof ACCESS_REQUEST_STATUSES)[keyof typeof ACCESS_REQUEST_STATUSES];

// ── Status da sessão assistida ──────────────────────────────────────────────
export const SESSION_STATUSES = {
  aguardando_inicio: "aguardando_inicio",
  ativa: "ativa",
  suspensa: "suspensa",
  encerrada: "encerrada",
  revogada: "revogada",
  expirada: "expirada",
} as const;

export type SessionStatus = (typeof SESSION_STATUSES)[keyof typeof SESSION_STATUSES];

// ── Módulos acessíveis ──────────────────────────────────────────────────────
export const ASSISTED_MODULES = [
  "dashboard",
  "configuracoes",
  "usuarios",
  "clientes",
  "processos",
  "contratos",
  "prazos",
  "tarefas",
  "documentos",
  "relatorios",
  "suporte",
  "onboarding",
  "integracoes",
  "financeiro",
] as const;

export type AssistedModule = (typeof ASSISTED_MODULES)[number];

// ── Ações permitidas ────────────────────────────────────────────────────────
export const ASSISTED_ACTIONS = [
  "visualizar",
  "diagnosticar",
  "editar_configuracao",
  "criar_registro_tecnico",
  "executar_correcao",
  "visualizar_metadados",
  "visualizar_logs",
] as const;

export type AssistedAction = (typeof ASSISTED_ACTIONS)[number];

// ── Ações proibidas (nunca permitidas em acesso assistido) ──────────────────
export const FORBIDDEN_ACTIONS = [
  "excluir",
  "exportar",
  "baixar",
  "alterar_financeiro",
  "alterar_permissoes",
  "alterar_proprietario",
  "visualizar_docs_confidenciais",
  "acessar_dados_altamente_confidenciais",
  "alterar_autenticacao",
  "alterar_mfa",
  "alterar_plano",
  "acessar_secrets",
  "acessar_tokens",
  "executar_sql",
  "acessar_storage_direto",
  "registrar_pagamento",
  "estornar",
  "alterar_saldo",
  "alterar_parcela",
  "efetuar_repasse",
] as const;

// ── Duração ─────────────────────────────────────────────────────────────────
export const DURATION_OPTIONS = [
  { label: "15 minutos", value: 15 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
] as const;

export const MAX_DURATION_MINUTES = 240; // 4 hours max

// ── Tipos de evento de auditoria ────────────────────────────────────────────
export const EVENT_TYPES = [
  "solicitacao_criada",
  "solicitacao_visualizada",
  "escopo_solicitado",
  "escopo_alterado",
  "solicitacao_aprovada",
  "solicitacao_recusada",
  "sessao_iniciada",
  "rota_acessada",
  "registro_visualizado",
  "configuracao_alterada",
  "tentativa_permitida",
  "tentativa_bloqueada",
  "documento_visualizado",
  "sessao_revogada",
  "sessao_expirada",
  "sessao_encerrada",
  "resumo_enviado",
  "solicitacao_cancelada",
] as const;

// ── Helpers de permissão ────────────────────────────────────────────────────
export const canApproveAccess = (role: string) =>
  ["proprietario", "administrador"].includes(role);

export const canRevokeAccess = (role: string) =>
  ["proprietario", "administrador"].includes(role);

// ── Transições válidas de status da solicitação ─────────────────────────────
export const VALID_REQUEST_TRANSITIONS: Record<AccessRequestStatus, AccessRequestStatus[]> = {
  rascunho: ["pendente", "cancelada"],
  pendente: ["visualizada", "aprovada", "aprovada_com_restrições", "recusada", "cancelada", "expirada"],
  visualizada: ["aprovada", "aprovada_com_restrições", "recusada", "cancelada"],
  aprovada: ["utilizada", "encerrada", "expirada"],
  aprovada_com_restrições: ["utilizada", "encerrada", "expirada"],
  recusada: [],
  cancelada: [],
  expirada: [],
  utilizada: ["encerrada"],
  encerrada: [],
};
