"use client";

import type { WizardFormData } from "./PricingWizard";
import { PRICING_TYPE_CONFIG } from "@/lib/pricing/constants";

interface WizardStep3Props {
  form: WizardFormData;
  onPrev: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  formatCurrency: (cents: number | null) => string;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-md border bg-muted/30 p-4">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="divide-y">{children}</div>
    </section>
  );
}

export function WizardStep3({
  form,
  onPrev,
  onConfirm,
  isSubmitting,
  formatCurrency,
}: WizardStep3Props) {
  const typeConfig = PRICING_TYPE_CONFIG[form.scenarioType];

  // Quick estimate (same logic as calculator simplified)
  const hours = form.estimatedHours ?? 0;
  const rate = form.hourlyRateCents ?? 0;
  const workCost = hours * rate;
  const directExpenses = form.directExpensesCents ?? 0;
  const indirectExpenses = form.indirectExpensesCents ?? 0;
  const thirdParty = form.thirdPartyCostsCents ?? 0;
  const travel = form.travelCostsCents ?? 0;
  const feesTax = form.feesAndTaxesCents ?? 0;
  const other = form.otherCostsCents ?? 0;

  const totalCost =
    workCost + directExpenses + indirectExpenses + thirdParty + travel + feesTax + other;
  const marginBps = form.marginBps ?? 0;
  const marginAmount = Math.round(totalCost * marginBps / 10000);
  const manualAdj = form.manualAdjustmentCents ?? 0;
  const subtotal = totalCost + marginAmount + manualAdj;
  const totalFee = Math.max(0, subtotal);
  const entry = form.entryAmountCents ?? 0;
  const financed = Math.max(0, totalFee - entry);
  const installments = form.installmentCount ?? 0;
  const installmentValue = installments > 0 ? Math.floor(financed / installments) : 0;
  const successFeeBps = form.successFeeBps ?? 0;
  const successFee = Math.round(totalFee * successFeeBps / 10000);

  const hasCalcData =
    form.estimatedHours ||
    form.directExpensesCents ||
    form.thirdPartyCostsCents ||
    form.marginBps;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <h2 className="text-lg font-medium">3. Prévia e Confirmação</h2>
      <p className="text-sm text-muted-foreground">
        Revise os dados antes de criar o cenário.
      </p>

      {/* Resumo do cenário */}
      <div className="rounded-md bg-muted/30 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{form.name || "(Sem nome)"}</h3>
          {typeConfig && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
            >
              {typeConfig.label}
            </span>
          )}
        </div>
        {form.description && (
          <p className="text-xs text-muted-foreground">{form.description}</p>
        )}
        {form.serviceName && (
          <p className="text-xs text-muted-foreground">Serviço: {form.serviceName}</p>
        )}
      </div>

      {hasCalcData ? (
        <>
          <SummaryCard title="Custos">
            <SummaryRow label="Custo de trabalho" value={formatCurrency(workCost)} />
            <SummaryRow label="Despesas diretas" value={formatCurrency(directExpenses)} />
            <SummaryRow label="Despesas indiretas" value={formatCurrency(indirectExpenses)} />
            <SummaryRow label="Terceiros" value={formatCurrency(thirdParty)} />
            <SummaryRow label="Deslocamento" value={formatCurrency(travel)} />
            <SummaryRow label="Honorários/Impostos" value={formatCurrency(feesTax)} />
            <SummaryRow label="Outros" value={formatCurrency(other)} />
            <SummaryRow label="Total custos" value={formatCurrency(totalCost)} />
          </SummaryCard>

          <SummaryCard title="Cálculo">
            <SummaryRow
              label={`Margem (${marginBps} bps)`}
              value={formatCurrency(marginAmount)}
            />
            <SummaryRow label="Ajuste manual" value={formatCurrency(manualAdj)} />
            <SummaryRow label="Receita bruta (mousedown)" value={formatCurrency(totalFee)} />
          </SummaryCard>

          <SummaryCard title="Pagamento">
            <SummaryRow label="Entrada" value={formatCurrency(entry)} />
            <SummaryRow label="Financiado" value={formatCurrency(financed)} />
            <SummaryRow
              label={`${installments}x`}
              value={formatCurrency(installmentValue)}
            />
            {successFeeBps > 0 && (
              <SummaryRow
                label={`Taxa êxito (${successFeeBps} bps)`}
                value={formatCurrency(successFee)}
              />
            )}
          </SummaryCard>
        </>
      ) : (
        <div className="rounded-md bg-muted/30 p-4 text-sm text-muted-foreground">
          Nenhum dado de cálculo preenchido. O cenário será criado como rascunho.
          Você poderá calcular posteriormente na página do cenário.
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Criando..." : "Criar Cenário"}
        </button>
      </div>
    </div>
  );
}