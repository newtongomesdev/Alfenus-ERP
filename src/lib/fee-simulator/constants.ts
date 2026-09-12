import type { SimulatorScenario, ScenarioLevel } from "./types";

// ── Cenários padrão ───────────────────────────────────────
export const DEFAULT_SCENARIOS: SimulatorScenario[] = [
  {
    id: "conservador",
    level: "conservador",
    label: "Conservador",
    description: "Valor abaixo do mercado, ideal para atrair clientes",
    multiplier: 0.8,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "padrao",
    level: "padrao",
    label: "Padrão",
    description: "Valor de mercado, equilíbrio entre competitividade e margem",
    multiplier: 1.0,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    id: "agressivo",
    level: "agressivo",
    label: "Premium",
    description: "Valor acima do mercado, para escritórios com diferencial",
    multiplier: 1.25,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
];

// ── Configuração de campos por modelo de cobrança ──────────
export interface ChargingModelConfig {
  value: string;
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
}

export const CHARGING_MODEL_CONFIGS: ChargingModelConfig[] = [
  {
    value: "consulta",
    label: "Consulta",
    description: "Valor fixo por consulta",
    requiredFields: ["baseValueCents"],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "fixo",
    label: "Honorário Fixo",
    description: "Valor fixo total do serviço",
    requiredFields: ["baseValueCents"],
    optionalFields: ["estimatedHours", "estimatedExpensesCents"],
  },
  {
    value: "parcelado",
    label: "Parcelado",
    description: "Valor dividido em parcelas",
    requiredFields: ["baseValueCents", "numberOfInstallments"],
    optionalFields: ["upfrontPercentage", "estimatedExpensesCents"],
  },
  {
    value: "mensalidade",
    label: "Mensalidade",
    description: "Cobrança recorrente mensal",
    requiredFields: ["monthlyValueCents"],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "por_hora",
    label: "Por Hora",
    description: "Cobrança por hora trabalhada",
    requiredFields: ["hourlyRateCents", "estimatedHours"],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "por_atividade",
    label: "Por Atividade",
    description: "Cobrança por atividade realizada",
    requiredFields: ["unitPriceCents", "quantity"],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "exito",
    description: "Percentual sobre o valor da causa",
    label: "Êxito",
    requiredFields: ["baseValueCents", "successFeePercentage"],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "hibrido",
    label: "Híbrido",
    description: "Fixo + percentual de êxito",
    requiredFields: [
      "baseValueCents",
      "successFeePercentage",
    ],
    optionalFields: ["estimatedExpensesCents"],
  },
  {
    value: "personalizado",
    label: "Personalizado",
    description: "Cálculo customizado pelo advogado",
    requiredFields: ["baseValueCents"],
    optionalFields: [
      "estimatedHours",
      "hourlyRateCents",
      "successFeePercentage",
      "estimatedExpensesCents",
    ],
  },
];

// ── Helper para buscar config do modelo ────────────────────
export function getChargingModelConfig(model: string): ChargingModelConfig {
  return (
    CHARGING_MODEL_CONFIGS.find((c) => c.value === model) ??
    CHARGING_MODEL_CONFIGS[0]
  );
}

// ── Placeholder dos campos ─────────────────────────────────
export const FIELD_PLACEHOLDERS: Record<string, string> = {
  baseValueCents: "Ex: R$ 5.000,00",
  monthlyValueCents: "Ex: R$ 1.500,00/mês",
  hourlyRateCents: "Ex: R$ 300,00/hora",
  estimatedHours: "Ex: 20",
  numberOfInstallments: "Ex: 6",
  upfrontPercentage: "Ex: 30",
  successFeePercentage: "Ex: 10",
  estimatedExpensesCents: "Ex: R$ 500,00",
  unitPriceCents: "Ex: R$ 150,00",
  quantity: "Ex: 10",
};

// ── Textos da UI ───────────────────────────────────────────
export const SIMULATOR_EMPTY_STATE = {
  title: "Simule honorários antes de propos",
  description:
    "Selecione um serviço do catálogo ou configure manualmente para calcular valores em diferentes cenários.",
  cta: "Selecionar Serviço",
};

export const SIMULATOR_RESULT_EMPTY = {
  title: "Preencha os dados para simular",
  description:
    "Configure o modelo de cobrança e valores base para gerar os cenários de honorários.",
};

export const SCENARIO_COMPARISON_TITLE = "Comparação de Cenários";
export const SCENARIO_COMPARISON_DESCRIPTION =
  "Compare valores entre cenários conservador, padrão e premium para escolher a melhor proposta.";

// ── Taxa IR estimada (para referência) ────────────────────
export const ESTIMATED_TAX_PERCENTAGE = 15; // MEI/Simples Nacional referência
