// ============================================================
// CONSTANTS — Pricing Scenarios
// ETAPA 5.2.2.2 — Simulador de Honorários
// ============================================================

import type {
  PricingScenarioStatus,
  PricingScenarioType,
  PricingItemType,
  PricingEventType,
  PricingScenarioStatusConfig,
  PricingScenarioTypeConfig,
} from "./types";

// ── Status do cenário ──────────────────────────────────────
export const PRICING_STATUS_CONFIG: Record<
  PricingScenarioStatus,
  PricingScenarioStatusConfig
> = {
  draft: {
    label: "Rascunho",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    description: "Cenário em construção, sem versões calculadas",
  },
  saved: {
    label: "Salvo",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    description: "Cenário com pelo menos uma versão calculada",
  },
  archived: {
    label: "Arquivado",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    description: "Cenário arquivado, somente leitura",
  },
  converted_to_proposal: {
    label: "Convertido",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description: "Cenário convertido em proposta comercial",
  },
};

// ── Tipo do cenário ────────────────────────────────────────
export const PRICING_TYPE_CONFIG: Record<
  PricingScenarioType,
  PricingScenarioTypeConfig
> = {
  conservative: {
    label: "Conservador",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    description: "Valor abaixo do mercado",
    multiplier: 0.8,
  },
  main: {
    label: "Principal",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description: "Valor de mercado",
    multiplier: 1.0,
  },
  expanded: {
    label: "Premium",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    description: "Valor acima do mercado",
    multiplier: 1.25,
  },
  custom: {
    label: "Personalizado",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    description: "Cálculo customizado",
    multiplier: 1.0,
  },
};

// ── Tipos de item ──────────────────────────────────────────
export interface PricingItemTypeConfig {
  value: PricingItemType;
  label: string;
  category: "custo" | "despesa" | "ajuste" | "imposto";
}

export const PRICING_ITEM_TYPE_CONFIG: PricingItemTypeConfig[] = [
  { value: "work_hours", label: "Horas de trabalho", category: "custo" },
  { value: "direct_expense", label: "Despesa direta", category: "despesa" },
  { value: "indirect_expense", label: "Despesa indireta", category: "despesa" },
  { value: "third_party_cost", label: "Custo terceirizado", category: "custo" },
  { value: "travel", label: "Deslocamento", category: "despesa" },
  { value: "hearing", label: "Audiência", category: "custo" },
  { value: "activity", label: "Atividade", category: "custo" },
  { value: "fee", label: "Honorário", category: "custo" },
  { value: "tax", label: "Imposto", category: "imposto" },
  { value: "adjustment", label: "Ajuste", category: "ajuste" },
  { value: "discount", label: "Desconto", category: "ajuste" },
  { value: "other", label: "Outro", category: "custo" },
];

// ── Tipos de evento ────────────────────────────────────────
export interface PricingEventTypeConfig {
  value: PricingEventType;
  label: string;
  category: "cenario" | "versao" | "memoria" | "conversao";
}

export const PRICING_EVENT_TYPE_CONFIG: PricingEventTypeConfig[] = [
  { value: "scenario_created", label: "Cenário criado", category: "cenario" },
  { value: "scenario_updated", label: "Cenário atualizado", category: "cenario" },
  { value: "scenario_duplicated", label: "Cenário duplicado", category: "cenario" },
  { value: "scenario_archived", label: "Cenário arquivado", category: "cenario" },
  { value: "scenario_restored", label: "Cenário restaurado", category: "cenario" },
  { value: "version_created", label: "Versão criada", category: "versao" },
  { value: "version_activated", label: "Versão ativada", category: "versao" },
  { value: "comparison_generated", label: "Comparação gerada", category: "versao" },
  { value: "memory_viewed", label: "Memória visualizada", category: "memoria" },
  { value: "memory_printed", label: "Memória impressa", category: "memoria" },
  { value: "memory_exported", label: "Memória exportada", category: "memoria" },
  { value: "conversion_started", label: "Conversão iniciada", category: "conversao" },
  { value: "conversion_completed", label: "Conversão concluída", category: "conversao" },
  { value: "conversion_failed", label: "Conversão falhou", category: "conversao" },
];

// ── Permissões do módulo ───────────────────────────────────
export const PRICING_PERMISSIONS = {
  USE_SIMULATOR: "pricing_simulator.use",
  VIEW_SCENARIOS: "pricing_scenarios.view",
  CREATE_SCENARIOS: "pricing_scenarios.create",
  EDIT_SCENARIOS: "pricing_scenarios.edit",
  ARCHIVE_SCENARIOS: "pricing_scenarios.archive",
  RESTORE_SCENARIOS: "pricing_scenarios.restore",
  DUPLICATE_SCENARIOS: "pricing_scenarios.duplicate",
  COMPARE_SCENARIOS: "pricing_scenarios.compare",
  VIEW_INTERNAL_COSTS: "pricing_scenarios.view_internal_costs",
  VIEW_INTERNAL_MARGIN: "pricing_scenarios.view_internal_margin",
  EXPORT_INTERNAL_MEMORY: "pricing_scenarios.export_internal_memory",
  VIEW_EVENTS: "pricing_scenarios.view_events",
} as const;

export type PricingPermission =
  (typeof PRICING_PERMISSIONS)[keyof typeof PRICING_PERMISSIONS];

// ── Configuração de permissões por papel (Plano Solo) ──────
export const PRICING_ROLE_PERMISSIONS: Record<string, PricingPermission[]> = {
  proprietario: Object.values(PRICING_PERMISSIONS),
  advogado: [
    PRICING_PERMISSIONS.USE_SIMULATOR,
    PRICING_PERMISSIONS.VIEW_SCENARIOS,
    PRICING_PERMISSIONS.CREATE_SCENARIOS,
    PRICING_PERMISSIONS.EDIT_SCENARIOS,
    PRICING_PERMISSIONS.VIEW_EVENTS,
  ],
  assistente: [
    PRICING_PERMISSIONS.USE_SIMULATOR,
    PRICING_PERMISSIONS.VIEW_SCENARIOS,
  ],
  financeiro: [
    PRICING_PERMISSIONS.USE_SIMULATOR,
    PRICING_PERMISSIONS.VIEW_SCENARIOS,
    PRICING_PERMISSIONS.VIEW_INTERNAL_COSTS,
  ],
};

// ── Limites ────────────────────────────────────────────────
export const PRICING_LIMITS = {
  MAX_NAME_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_VERSIONS_PER_SCENARIO: 100,
  MAX_ITEMS_PER_VERSION: 200,
  MAX_BPS: 10000, // 100%
  MIN_VERSION_NUMBER: 1,
} as const;

// ── Textos da UI ───────────────────────────────────────────
export const PRICING_EMPTY_STATE = {
  title: "Nenhum cenário encontrado",
  description: "Crie seu primeiro cenário de precificação para começar a simular.",
  cta: "Novo Cenário",
};

export const PRICING_SCENARIO_EMPTY = {
  title: "Cenário sem versões",
  description: "Execute o simulador para calcular e salvar a primeira versão.",
};
