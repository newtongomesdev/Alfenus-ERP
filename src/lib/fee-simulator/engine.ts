import type {
  SimulatorInput,
  SimulatorResult,
  SimulatorScenario,
  FeeBreakdownItem,
  ScenarioLevel,
} from "./types";
import { DEFAULT_SCENARIOS, ESTIMATED_TAX_PERCENTAGE } from "./constants";

// ── Formatação de centavos para exibição ───────────────────
export function formatCents(valueCents: number): string {
  return `R$ ${(valueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^\d,]/g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : Math.round(value * 100);
}

// ── Motor de cálculo por modelo de cobrança ────────────────
function calculateByModel(
  input: SimulatorInput,
  multiplier: number
): { baseFee: FeeBreakdownItem[]; totalBase: number } {
  const breakdown: FeeBreakdownItem[] = [];
  let totalBase = 0;

  switch (input.chargingModel) {
    case "consulta":
    case "fixo": {
      const val = Math.round(input.baseValueCents * multiplier);
      totalBase = val;
      breakdown.push({ label: "Honorário Fixo", valueCents: val });
      break;
    }

    case "parcelado": {
      const val = Math.round(input.baseValueCents * multiplier);
      totalBase = val;
      const installments = input.numberOfInstallments ?? 3;
      const upfrontPct = input.upfrontPercentage ?? 0;
      const upfrontVal = Math.round(val * (upfrontPct / 100));
      const parcelaVal = installments > 0
        ? Math.round((val - upfrontVal) / installments)
        : val;

      if (upfrontVal > 0) {
        breakdown.push({ label: "Entrada", valueCents: upfrontVal, description: `${upfrontPct}% do total` });
      }
      breakdown.push({ label: `${installments}x parcelas`, valueCents: parcelaVal, description: `De R$ ${(parcelaVal / 100).toFixed(2)} cada` });
      break;
    }

    case "mensalidade": {
      const val = Math.round((input.monthlyValueCents ?? input.baseValueCents) * multiplier);
      totalBase = val;
      breakdown.push({ label: "Mensalidade", valueCents: val, description: "Valor recorrente mensal" });
      break;
    }

    case "por_hora": {
      const rate = Math.round((input.hourlyRateCents ?? input.baseValueCents) * multiplier);
      const hours = input.estimatedHours ?? 1;
      totalBase = rate * hours;
      breakdown.push({ label: `Horas estimadas`, valueCents: rate * hours, description: `${hours}h × ${formatCents(rate)}/h` });
      break;
    }

    case "por_atividade": {
      const unit = Math.round((input.unitPriceCents ?? input.baseValueCents) * multiplier);
      const qty = input.quantity ?? 1;
      totalBase = unit * qty;
      breakdown.push({ label: `${qty} atividades`, valueCents: unit * qty, description: `${qty} × ${formatCents(unit)}` });
      break;
    }

    case "exito": {
      const base = Math.round(input.baseValueCents * multiplier);
      const pct = input.successFeePercentage ?? 10;
      totalBase = Math.round(base * (pct / 100));
      breakdown.push({ label: "Valor da causa", valueCents: base, description: "Base de cálculo" });
      breakdown.push({ label: `Honorário de êxito (${pct}%)`, valueCents: totalBase });
      break;
    }

    case "hibrido": {
      const fixo = Math.round(input.baseValueCents * multiplier);
      const pct = input.successFeePercentage ?? 10;
      totalBase = fixo;
      breakdown.push({ label: "Honorário Fixo", valueCents: fixo });
      breakdown.push({ label: `+ Êxito (${pct}%)`, valueCents: 0, description: `Adicional de ${pct}% sobre a causa` });
      break;
    }

    case "personalizado": {
      const val = Math.round(input.baseValueCents * multiplier);
      totalBase = val;
      breakdown.push({ label: "Honorário Personalizado", valueCents: val });
      break;
    }

    default: {
      const val = Math.round(input.baseValueCents * multiplier);
      totalBase = val;
      breakdown.push({ label: "Honorário", valueCents: val });
    }
  }

  return { baseFee: breakdown, totalBase };
}

// ── Calcular um cenário ────────────────────────────────────
export function calculateScenario(
  input: SimulatorInput,
  scenario: SimulatorScenario
): SimulatorResult {
  const { baseFee, totalBase } = calculateByModel(input, scenario.multiplier);

  const expenses = Math.round(input.estimatedExpensesCents ?? 0);
  const totalFee = totalBase + expenses;

  // Detalhamento completo
  const breakdown: FeeBreakdownItem[] = [
    ...baseFee,
    ...(expenses > 0
      ? [{ label: "Despesas estimadas", valueCents: expenses }]
      : []),
  ];

  // Parcelamento
  let installmentValueCents: number | undefined;
  let numberOfInstallments: number | undefined;
  let upfrontValueCents: number | undefined;

  if (input.chargingModel === "parcelado" && input.numberOfInstallments) {
    numberOfInstallments = input.numberOfInstallments;
    const upfrontPct = input.upfrontPercentage ?? 0;
    upfrontValueCents = Math.round(totalFee * (upfrontPct / 100));
    installmentValueCents =
      numberOfInstallments > 0
        ? Math.round((totalFee - upfrontValueCents) / numberOfInstallments)
        : totalFee;
  }

  // Êxito
  let successFeeValueCents: number | undefined;
  if (
    (input.chargingModel === "exito" || input.chargingModel === "hibrido") &&
    input.successFeePercentage
  ) {
    successFeeValueCents = totalBase;
  }

  // Efetivo por hora
  let hourlyEffectiveCents: number | undefined;
  if (input.estimatedHours && input.estimatedHours > 0) {
    hourlyEffectiveCents = Math.round(totalFee / input.estimatedHours);
  }

  // Efetivo mensal (para mensalidade)
  let monthlyEffectiveCents: number | undefined;
  if (input.chargingModel === "mensalidade") {
    monthlyEffectiveCents = totalFee;
  }

  return {
    scenarioLevel: scenario.level,
    scenarioLabel: scenario.label,
    totalFeeCents: totalFee,
    baseFeeCents: totalBase,
    expensesCents: expenses,
    breakdown,
    installmentValueCents,
    numberOfInstallments,
    upfrontValueCents,
    successFeeValueCents,
    hourlyEffectiveCents,
    monthlyEffectiveCents,
  };
}

// ── Calcular todos os cenários ─────────────────────────────
export function calculateAllScenarios(
  input: SimulatorInput,
  scenarios: SimulatorScenario[] = DEFAULT_SCENARIOS
): SimulatorResult[] {
  return scenarios.map((scenario) => calculateScenario(input, scenario));
}

// ── Gerar ID único ─────────────────────────────────────────
export function generateSimulationId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Converter valor do formulário (string) para centavos ───
export function centsToFormValue(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formValueToCents(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}
