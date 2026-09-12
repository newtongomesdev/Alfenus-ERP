import type { ChargingModel } from "@/lib/service-catalog/types";

// ── Cenários de simulação ──────────────────────────────────
export type ScenarioLevel = "conservador" | "padrao" | "agressivo";

export interface SimulatorScenario {
  id: string;
  level: ScenarioLevel;
  label: string;
  description: string;
  multiplier: number; // multiplica o valor base
  color: string;
}

// ── Entrada da simulação ───────────────────────────────────
export interface SimulatorInput {
  serviceId?: string; // opcional: pode simular sem vincular a serviço
  serviceName: string;
  chargingModel: ChargingModel;
  practiceArea: string;

  // Valores base (centavos)
  baseValueCents: number;
  minValueCents?: number;
  maxValueCents?: number;

  // Parâmetros de cálculo
  estimatedHours?: number;
  hourlyRateCents?: number; // valor por hora (centavos)
  numberOfInstallments?: number;
  upfrontPercentage?: number; // percentual de entrada (0-100)
  successFeePercentage?: number; // % de êxito
  monthlyValueCents?: number; // para mensalidade

  // Despesas
  estimatedExpensesCents?: number;

  // Quantidade (para por_atividade)
  quantity?: number;
  unitPriceCents?: number;
}

// ── Resultado da simulação ─────────────────────────────────
export interface FeeBreakdownItem {
  label: string;
  valueCents: number;
  description?: string;
}

export interface SimulatorResult {
  scenarioLevel: ScenarioLevel;
  scenarioLabel: string;

  // Valores principais
  totalFeeCents: number;
  baseFeeCents: number;
  expensesCents: number;
  taxEstimateCents?: number;

  // Detalhamento
  breakdown: FeeBreakdownItem[];

  // Parcelamento
  installmentValueCents?: number;
  numberOfInstallments?: number;
  upfrontValueCents?: number;

  // Êxito
  successFeeValueCents?: number;

  // Valores auxiliares
  hourlyEffectiveCents?: number;
  monthlyEffectiveCents?: number;

  // Notas
  notes?: string;
}

// ── Simulação completa (input + resultados) ────────────────
export interface FeeSimulation {
  id: string;
  lawFirmId: string;
  input: SimulatorInput;
  results: SimulatorResult[];
  createdAt: string;
  clientName?: string;
  clientEmail?: string;
  notes?: string;
}

// ── Salvar simulação ───────────────────────────────────────
export interface SimulationSaveInput {
  lawFirmId: string;
  serviceId?: string;
  serviceName: string;
  chargingModel: ChargingModel;
  practiceArea: string;
  inputParams: SimulatorInput;
  results: SimulatorResult[];
  clientName?: string;
  clientEmail?: string;
  notes?: string;
}

export interface SimulationRow {
  id: string;
  law_firm_id: string;
  service_id: string | null;
  service_name: string;
  charging_model: ChargingModel;
  practice_area: string;
  input_params: SimulatorInput;
  results: SimulatorResult[];
  client_name: string | null;
  client_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
