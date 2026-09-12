// ============================================================
// MEMORY — Motor de cálculo puro
// ETAPA 5.2.2.3 — Memória de cálculo
// ============================================================

import type {
  PricingCalculationInput,
  PricingCalculationResult,
  PricingCalculationMemory,
  PricingMemorySection,
  PricingMemoryItem,
} from "./calculation-types";
import {
  PRICING_CALCULATION_ENGINE_VERSION,
  PRICING_SCHEMA_VERSION,
} from "./calculation-types";
import type { PricingScenarioType } from "./types";

// ── Parâmetros ──────────────────────────────────────────────
interface BuildPricingCalculationMemoryParams {
  input: PricingCalculationInput;
  result: PricingCalculationResult;
  calculatedAt: string;
  scenarioType: PricingScenarioType;
}

// ── Helpers ─────────────────────────────────────────────────
const VISIBILITY_INTERNAL = "internal" as const;

function item(
  label: string,
  result: unknown,
  order: number,
  opts?: { description?: string; formula?: string; inputValues?: Record<string, unknown>; amountCents?: number; percentageBps?: number },
): PricingMemoryItem {
  return {
    label,
    result,
    visibility: VISIBILITY_INTERNAL,
    order,
    inputValues: opts?.inputValues ?? {},
    ...(opts?.description !== undefined ? { description: opts.description } : {}),
    ...(opts?.formula !== undefined ? { formula: opts.formula } : {}),
    ...(opts?.amountCents !== undefined ? { amountCents: opts.amountCents } : {}),
    ...(opts?.percentageBps !== undefined ? { percentageBps: opts.percentageBps } : {}),
  };
}

function section(id: string, title: string, items: PricingMemoryItem[]): PricingMemorySection {
  return { id, title, items };
}

// ── Build ───────────────────────────────────────────────────
export function buildPricingCalculationMemory(
  params: BuildPricingCalculationMemoryParams,
): PricingCalculationMemory {
  const { input, result, calculatedAt, scenarioType } = params;

  const sections: PricingMemorySection[] = [];

  // ── 1. identification ────────────────────────────────────
  sections.push(section("identification", "Identificação", [
    item("Tipo de cenário", scenarioType, 1, {
      description: "Cenário de precificação selecionado",
      inputValues: { scenarioType },
    }),
    item("Data de cálculo", calculatedAt, 2, {
      description: "Data e hora do cálculo",
      inputValues: { calculationDate: input.calculationDate },
    }),
    item("Moeda", input.currency, 3, {
      description: "Moeda utilizada no cálculo",
      inputValues: { currency: input.currency },
    }),
    item("Versão do motor", PRICING_CALCULATION_ENGINE_VERSION, 4, {
      description: "Versão do motor de cálculo",
      inputValues: {},
    }),
    item("Versão do schema", PRICING_SCHEMA_VERSION, 5, {
      description: "Versão do schema de dados",
      inputValues: {},
    }),
    ...(input.notes ? [item("Observações", input.notes, 6, { inputValues: { notes: input.notes } })] : []),
  ]));

  // ── 2. work ──────────────────────────────────────────────
  sections.push(section("work", "Trabalho", [
    item("Horas estimadas", result.estimatedHours, 1, {
      description: "Quantidade estimada de horas de trabalho",
      formula: "estimatedHours",
      inputValues: { estimatedHours: input.estimatedHours },
    }),
    item("Valor hora (centavos)", result.hourlyRateCents, 2, {
      description: "Valor por hora em centavos",
      formula: "hourlyRateCents",
      inputValues: { hourlyRateCents: input.hourlyRateCents },
    }),
    item("Custo do trabalho (centavos)", result.workCostCents, 3, {
      description: "Custo total do trabalho",
      formula: "estimatedHours * hourlyRateCents",
      inputValues: { estimatedHours: input.estimatedHours, hourlyRateCents: input.hourlyRateCents },
      amountCents: result.workCostCents,
    }),
  ]));

  // ── 3. costs ─────────────────────────────────────────────
  const costItems: PricingMemoryItem[] = [];

  costItems.push(item("Despesas diretas", result.directExpensesCents, 1, {
    formula: "directExpensesCents",
    inputValues: { directExpensesCents: input.directExpensesCents },
    amountCents: result.directExpensesCents,
  }));
  costItems.push(item("Despesas indiretas", result.indirectExpensesCents, 2, {
    formula: "indirectExpensesCents",
    inputValues: { indirectExpensesCents: input.indirectExpensesCents },
    amountCents: result.indirectExpensesCents,
  }));
  costItems.push(item("Custos de terceiros", result.thirdPartyCostsCents, 3, {
    formula: "thirdPartyCostsCents",
    inputValues: { thirdPartyCostsCents: input.thirdPartyCostsCents },
    amountCents: result.thirdPartyCostsCents,
  }));
  costItems.push(item("Custos de deslocamento", result.travelCostsCents, 4, {
    formula: "travelCostsCents",
    inputValues: { travelCostsCents: input.travelCostsCents },
    amountCents: result.travelCostsCents,
  }));
  costItems.push(item("Impostos e taxas", result.feesAndTaxesCents, 5, {
    formula: "feesAndTaxesCents",
    inputValues: { feesAndTaxesCents: input.feesAndTaxesCents },
    amountCents: result.feesAndTaxesCents,
  }));
  costItems.push(item("Outros custos", result.otherCostsCents, 6, {
    formula: "otherCostsCents",
    inputValues: { otherCostsCents: input.otherCostsCents },
    amountCents: result.otherCostsCents,
  }));
  costItems.push(item("Custos customizados", result.customCostsCents, 7, {
    formula: "customCostsCents",
    inputValues: { customCostItems: input.customCostItems },
    amountCents: result.customCostsCents,
  }));
  costItems.push(item("Total de despesas", result.totalExpensesCents, 8, {
    description: "Soma de todas as despesas",
    formula: "sumDirect + sumIndirect + sumThirdParty + sumTravel + sumFees + sumOther + sumCustom",
    inputValues: {},
    amountCents: result.totalExpensesCents,
  }));
  costItems.push(item("Custo total estimado", result.totalEstimatedCostCents, 9, {
    description: "Custo total estimado (trabalho + despesas)",
    formula: "workCostCents + totalExpensesCents",
    inputValues: {},
    amountCents: result.totalEstimatedCostCents,
  }));

  sections.push(section("costs", "Custos", costItems));

  // ── 4. margin ────────────────────────────────────────────
  const marginFormula = input.marginBase === "custom_base"
    ? `marginBps * customMarginBaseCents / 10000`
    : input.marginBase === "work_cost"
      ? `marginBps * workCostCents / 10000`
      : input.marginBase === "expenses_only"
        ? `marginBps * totalExpensesCents / 10000`
        : `marginBps * totalEstimatedCostCents / 10000`;

  sections.push(section("margin", "Margem", [
    item("Base da margem", result.marginBaseCents, 1, {
      description: "Base utilizada para cálculo de margem",
      formula: `base = ${input.marginBase ?? "total_cost"}`,
      inputValues: { marginBase: input.marginBase },
      amountCents: result.marginBaseCents,
    }),
    item("Margem (BPS)", input.marginBps ?? 0, 2, {
      description: "Margem em basis points",
      formula: "marginBps",
      inputValues: { marginBps: input.marginBps },
      percentageBps: input.marginBps ?? 0,
    }),
    item("Valor da margem", result.marginAmountCents, 3, {
      description: "Valor em centavos da margem aplicada",
      formula: marginFormula,
      inputValues: { marginBps: input.marginBps, marginBase: input.marginBase, customMarginBaseCents: input.customMarginBaseCents },
      amountCents: result.marginAmountCents,
    }),
    item("Fórmula de cálculo da margem", marginFormula, 4, {
      description: "Fórmula utilizada para cálculo da margem",
      inputValues: { marginBase: input.marginBase },
    }),
  ]));

  // ── 5. adjustments ───────────────────────────────────────
  sections.push(section("adjustments", "Ajustes", [
    item("Ajuste manual", result.manualAdjustmentCents, 1, {
      description: "Ajuste manual aplicado ao preço",
      formula: "manualAdjustmentCents",
      inputValues: { manualAdjustmentCents: input.manualAdjustmentCents, manualAdjustmentReason: input.manualAdjustmentReason },
      amountCents: result.manualAdjustmentCents,
    }),
    item("Motivo do ajuste", input.manualAdjustmentReason ?? "Não informado", 2, {
      description: "Justificativa do ajuste manual",
      inputValues: { manualAdjustmentReason: input.manualAdjustmentReason },
    }),
  ]));

  // ── 6. discounts ─────────────────────────────────────────
  sections.push(section("discounts", "Descontos", [
    item("Desconto fixo", result.fixedDiscountCents, 1, {
      description: "Desconto fixo em centavos",
      formula: "fixedDiscountCents",
      inputValues: { fixedDiscountCents: input.fixedDiscountCents },
      amountCents: result.fixedDiscountCents,
    }),
    item("Desconto percentual", result.percentageDiscountCents, 2, {
      description: "Desconto percentual em centavos",
      formula: "percentageDiscountBps * subtotalBeforeDiscount / 10000",
      inputValues: { percentageDiscountBps: input.percentageDiscountBps },
      amountCents: result.percentageDiscountCents,
    }),
    item("Total de descontos", result.totalDiscountCents, 3, {
      description: "Soma dos descontos aplicados",
      formula: "fixedDiscountCents + percentageDiscountCents",
      inputValues: {},
      amountCents: result.totalDiscountCents,
    }),
  ]));

  // ── 7. fixedFee ──────────────────────────────────────────
  sections.push(section("fixedFee", "Honorários Fixos", [
    item("Total do honorário fixo", result.fixedFeeTotalCents, 1, {
      description: "Valor total do honorário fixo",
      formula: "fixedFeeTotalCents",
      inputValues: {},
      amountCents: result.fixedFeeTotalCents,
    }),
  ]));

  // ── 8. entry ─────────────────────────────────────────────
  sections.push(section("entry", "Entrada", [
    item("Valor da entrada", result.entryAmountCents, 1, {
      description: "Valor da entrada em centavos",
      formula: "entryAmountCents",
      inputValues: { entryAmountCents: input.entryAmountCents },
      amountCents: result.entryAmountCents,
    }),
    item("Valor financiado", result.financedAmountCents, 2, {
      description: "Valor financiado em centavos",
      formula: "fixedFeeTotalCents - entryAmountCents",
      inputValues: { fixedFeeTotalCents: result.fixedFeeTotalCents, entryAmountCents: result.entryAmountCents },
      amountCents: result.financedAmountCents,
    }),
  ]));

  // ── 9. installments ──────────────────────────────────────
  const installmentItems: PricingMemoryItem[] = [];

  installmentItems.push(item("Quantidade de parcelas", result.installmentCount, 1, {
    description: "Número de parcelas",
    inputValues: { installmentCount: input.installmentCount },
  }));
  installmentItems.push(item("Total das parcelas", result.installmentTotalCents, 2, {
    description: "Valor total das parcelas",
    formula: "installmentTotalCents",
    inputValues: {},
    amountCents: result.installmentTotalCents,
  }));

  for (let i = 0; i < result.installments.length; i++) {
    const inst = result.installments[i];
    installmentItems.push(item(`Parcela ${inst.number}`, inst.amountCents, 3 + i, {
      description: `Parcela ${inst.number} com vencimento em ${inst.dueDate}`,
      inputValues: { number: inst.number, dueDate: inst.dueDate, principalCents: inst.principalCents, roundingAdjustmentCents: inst.roundingAdjustmentCents },
      amountCents: inst.amountCents,
    }));
  }

  sections.push(section("installments", "Parcelas", installmentItems));

  // ── 10. recurringFees ────────────────────────────────────
  sections.push(section("recurringFees", "Mensalidades", [
    item("Mensalidade mensal", result.monthlyFeeCents, 1, {
      description: "Valor da mensalidade mensal",
      formula: "monthlyFeeCents",
      inputValues: { monthlyFeeCents: input.monthlyFeeCents },
      amountCents: result.monthlyFeeCents,
    }),
    item("Quantidade de mensalidades", result.monthlyFeeCount, 2, {
      description: "Número de mensalidades",
      inputValues: { monthlyFeeCount: input.monthlyFeeCount },
    }),
    item("Total das mensalidades", result.monthlyFeeTotalCents, 3, {
      description: "Valor total das mensalidades",
      formula: "monthlyFeeCents * monthlyFeeCount",
      inputValues: { monthlyFeeCents: result.monthlyFeeCents, monthlyFeeCount: result.monthlyFeeCount },
      amountCents: result.monthlyFeeTotalCents,
    }),
  ]));

  // ── 11. successFee ───────────────────────────────────────
  sections.push(section("successFee", "Honorário de Êxito", [
    item("BPS do honorário de êxito", result.successFeeBps, 1, {
      description: "Percentual do honorário de êxito em basis points",
      formula: "successFeeBps",
      inputValues: { successFeeBps: input.successFeeBps },
      percentageBps: result.successFeeBps,
    }),
    item("Base de cálculo", result.successFeeBaseCents, 2, {
      description: "Base em centavos para cálculo do honorário de êxito",
      formula: "successFeeBaseCents",
      inputValues: { successFeeBaseCents: input.successFeeBaseCents },
      amountCents: result.successFeeBaseCents,
    }),
    item("Honorário de êxito estimado", result.estimatedSuccessFeeCents, 3, {
      description: "Valor estimado do honorário de êxito",
      formula: "successFeeBaseCents * successFeeBps / 10000",
      inputValues: {},
      amountCents: result.estimatedSuccessFeeCents,
    }),
    item("Aviso", "Honorário de êxito é uma projeção e não garantido", 4, {
      description: "Aviso sobre a natureza estimada do honorário de êxito",
      inputValues: {},
    }),
  ]));

  // ── 12. projection ───────────────────────────────────────
  const projectionItems: PricingMemoryItem[] = [];

  for (let i = 0; i < (result.revenueProjection ?? []).length; i++) {
    const proj = result.revenueProjection[i];
    projectionItems.push(item(`${proj.description} (${proj.date})`, proj.amountCents, i + 1, {
      description: `${proj.sourceType} — ${proj.guaranteed ? "garantido" : "não garantido"}`,
      inputValues: { date: proj.date, sourceType: proj.sourceType, guaranteed: proj.guaranteed },
      amountCents: proj.amountCents,
    }));
  }

  if (projectionItems.length === 0) {
    projectionItems.push(item("Sem projeções", 0, 1, { description: "Nenhuma projeção de receita configurada", inputValues: {} }));
  }

  sections.push(section("projection", "Projeção de Receita", projectionItems));

  // ── 13. warnings ─────────────────────────────────────────
  const warningItems: PricingMemoryItem[] = [];

  for (let i = 0; i < (result.warnings ?? []).length; i++) {
    const warning = result.warnings[i];
    warningItems.push(item(warning.title, warning.description, i + 1, {
      description: warning.description,
      inputValues: { code: warning.code, severity: warning.severity },
    }));
  }

  if (warningItems.length === 0) {
    warningItems.push(item("Sem avisos", 0, 1, { description: "Nenhum aviso gerado no cálculo", inputValues: {} }));
  }

  sections.push(section("warnings", "Avisos", warningItems));

  // ── 14. assumptions ──────────────────────────────────────
  const assumptionItems: PricingMemoryItem[] = [];

  for (let i = 0; i < (result.assumptions ?? []).length; i++) {
    assumptionItems.push(item(`Pressuposto ${i + 1}`, result.assumptions[i], i + 1, {
      description: result.assumptions[i],
      inputValues: {},
    }));
  }

  if (assumptionItems.length === 0) {
    assumptionItems.push(item("Sem pressupostos", 0, 1, { description: "Nenhum pressuposto adicional", inputValues: {} }));
  }

  sections.push(section("assumptions", "Pressupostos", assumptionItems));

  // ── Montagem final ───────────────────────────────────────
  return {
    engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
    schemaVersion: PRICING_SCHEMA_VERSION,
    calculatedAt,
    scenarioType,
    sections,
    warnings: result.warnings ?? [],
    assumptions: result.assumptions ?? [],
    disclaimer: "Este cálculo é uma estimativa e não constitui proposta formal.",
  };
}