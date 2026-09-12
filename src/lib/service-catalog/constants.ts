/**
 * Service Catalog Constants
 * Constants for the service catalog module
 */

import type { ChargingModel, DurationUnit, ServiceStatus, ServiceStatusConfig } from "./types";

// ── Status config ─────────────────────────────────────────
export const SERVICE_STATUS_CONFIG: Record<ServiceStatus, ServiceStatusConfig> = {
  rascunho: { label: "Rascunho", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400" },
  ativo: { label: "Ativo", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
  inativo: { label: "Inativo", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400" },
  arquivado: { label: "Arquivado", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400" },
};

// ── Charging Models ───────────────────────────────────────
export const SERVICE_CHARGING_MODELS: { value: ChargingModel; label: string; description: string }[] = [
  { value: "consulta", label: "Consulta", description: "Cobrança por consulta" },
  { value: "fixo", label: "Valor Fixo", description: "Honorário fixo" },
  { value: "parcelado", label: "Parcelado", description: "Pagamento parcelado" },
  { value: "mensalidade", label: "Mensalidade", description: "Valor mensal fixo" },
  { value: "por_hora", label: "Por Hora", description: "Cobrança por hora trabalhada" },
  { value: "por_atividade", label: "Por Atividade", description: "Cobrança por atividade" },
  { value: "exito", label: "Êxito", description: "Percentual sobre o resultado" },
  { value: "hibrido", label: "Híbrido", description: "Fixo + Êxito" },
  { value: "personalizado", label: "Personalizado", description: "Definido pelo profissional" },
];

// ── Duration Units ──────────────────────────────────────
export const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
  { value: "horas", label: "Horas" },
  { value: "dias", label: "Dias" },
  { value: "semanas", label: "Semanas" },
  { value: "meses", label: "Meses" },
];

// ── Practice Areas ────────────────────────────────────────
export const SERVICE_PRACTICE_AREAS = [
  { value: "trabalhista", label: "Direito Trabalhista" },
  { value: "previdenciario", label: "Direito Previdenciário" },
  { value: "familia", label: "Direito de Família" },
  { value: "consumidor", label: "Direito do Consumidor" },
  { value: "civel", label: "Direito Civil" },
  { value: "criminal", label: "Direito Criminal" },
  { value: "imobiliario", label: "Direito Imobiliário" },
  { value: "empresarial", label: "Direito Empresarial" },
  { value: "tributario", label: "Direito Tributário" },
  { value: "administrativo", label: "Direito Administrativo" },
  { value: "outro", label: "Outra Área" },
] as const;

// ── Categories ────────────────────────────────────────────
export const SERVICE_CATEGORIES: { value: string; label: string }[] = [
  { value: "servico", label: "Serviço" },
  { value: "assessoria", label: "Assessoria" },
  { value: "contrato", label: "Contrato" },
  { value: "processual", label: "Processual" },
  { value: "extra_judicial", label: "Extrajudicial" },
  { value: "outro", label: "Outro" },
];

// ── Search/filter placeholders ─────────────────────────
export const SERVICE_SEARCH_PLACEHOLDER = "Pesquisar por nome, área ou descrição...";

// ── Empty state messages ────────────────────────────────
export const SERVICE_EMPTY_STATE = {
  title: "Nenhum serviço cadastrado",
  description: "Cadastre os serviços que você oferece para criar propostas e contratos com mais rapidez.",
  action: "Novo Serviço",
  href: "/servicos/novo",
};

// ── Platform Library disclaimer ────────────────────────
export const SERVICE_PLATFORM_DISCLAIMER = "Os exemplos servem apenas para organização interna. Defina escopo, valores e condições conforme o caso concreto, sua estratégia profissional e as regras aplicáveis.";

// ── Quick Actions ──────────────────────────────────────
export const SERVICE_QUICK_ACTIONS = [
  { id: "new_service", name: "Novo Serviço", icon: "Plus", href: "/servicos/novo", color: "blue" },
  { id: "new_proposal", name: "Nova Proposta", icon: "FileText", href: "/propostas/nova", color: "violet" },
  { id: "new_simulation", name: "Simular Honorários", icon: "Calculator", href: "/simulador", color: "amber" },
];

// ── Service columns for table ─────────────────────────
export const SERVICE_TABLE_COLUMNS = [
  { key: "name", label: "Nome", sortable: true },
  { key: "practice_area", label: "Área", sortable: true },
  { key: "charging_model", label: "Cobrança", sortable: true },
  { key: "reference_value_cents", label: "Valor de Referência", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "actions", label: "Ações", sortable: false },
];