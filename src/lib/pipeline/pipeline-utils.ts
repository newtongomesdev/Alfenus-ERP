export const FUNNEL_STAGES = [
  { id: "novo", label: "Novo", color: "bg-slate-100 text-slate-700" },
  { id: "contato", label: "Em Contato", color: "bg-blue-100 text-blue-700" },
  { id: "proposta", label: "Proposta", color: "bg-amber-100 text-amber-700" },
  { id: "negociacao", label: "Negociação", color: "bg-orange-100 text-orange-700" },
  { id: "fechado_ganho", label: "Fechado (Ganho)", color: "bg-emerald-100 text-emerald-700" },
  { id: "fechado_perdido", label: "Fechado (Perdido)", color: "bg-red-100 text-red-700" },
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]["id"];

export const PROBABILITY_MAP: Record<FunnelStageId, number> = {
  novo: 10,
  contato: 25,
  proposta: 50,
  negociacao: 75,
  fechado_ganho: 100,
  fechado_perdido: 0,
};
