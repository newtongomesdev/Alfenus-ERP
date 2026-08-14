"use client";

import type { WizardFormData } from "./PricingWizard";
import { PRICING_TYPE_CONFIG } from "@/lib/pricing/constants";

interface WizardStep2Props {
  form: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  onPrev: () => void;
  onNext: () => void;
}

function formatCents(value: number | null): string {
  if (value === null || value === undefined) return "";
  return String(Math.round(value / 100));
}

function parseCents(value: string): number | null {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) return null;
  return num * 100;
}

function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <input
          id={id}
          type="number"
          min={0}
          value={formatCents(value)}
          onChange={(e) => onChange(parseCents(e.target.value))}
          placeholder={placeholder ?? "0"}
          className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

export function WizardStep2({ form, onChange, onPrev, onNext }: WizardStep2Props) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <h2 className="text-lg font-medium">2. Parâmetros de Cálculo</h2>
      <p className="text-sm text-muted-foreground">
        Configure os custos, horas estimadas e margem para o cálculo do cenário.
      </p>

      {/* Tipo de cenário */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de cenário</label>
        <div role="radiogroup" aria-label="Tipo de cenário" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.entries(PRICING_TYPE_CONFIG) as [string, { label: string; description: string; multiplier: number }][]).map(
            ([value, config]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={form.scenarioType === value}
                onClick={() =>
                  onChange({ scenarioType: value as WizardFormData["scenarioType"] })
                }
                className={`rounded-md border p-3 text-left text-sm transition-colors ${
                  form.scenarioType === value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-muted-foreground/20 bg-background text-muted-foreground hover:border-muted-foreground/40"
                }`}
              >
                <div className="font-medium">{config.label}</div>
                <div className="mt-0.5 text-xs">
                  {config.multiplier}x — {config.description}
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Custos */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Custos e Despesas</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InputField
            id="estimated-hours"
            label="Horas estimadas"
            value={form.estimatedHours}
            onChange={(v) => onChange({ estimatedHours: v ? Math.round(v / 100) : null })}
            placeholder="Ex: 20"
            helpText="Quantidade de horas estimadas"
          />
          <InputField
            id="hourly-rate"
            label="Valor hora"
            value={form.hourlyRateCents}
            onChange={(v) => onChange({ hourlyRateCents: v })}
            placeholder="Ex: 500"
            helpText="Valor por hora em reais"
          />
          <InputField
            id="direct-expenses"
            label="Despesas diretas"
            value={form.directExpensesCents}
            onChange={(v) => onChange({ directExpensesCents: v })}
            helpText="Despesas diretas com o caso"
          />
          <InputField
            id="indirect-expenses"
            label="Despesas indiretas"
            value={form.indirectExpensesCents}
            onChange={(v) => onChange({ indirectExpensesCents: v })}
          />
          <InputField
            id="third-party-costs"
            label="Custos de terceiros"
            value={form.thirdPartyCostsCents}
            onChange={(v) => onChange({ thirdPartyCostsCents: v })}
          />
          <InputField
            id="travel-costs"
            label="Deslocamento"
            value={form.travelCostsCents}
            onChange={(v) => onChange({ travelCostsCents: v })}
          />
          <InputField
            id="fees-taxes"
            label="Honorários e impostos"
            value={form.feesAndTaxesCents}
            onChange={(v) => onChange({ feesAndTaxesCents: v })}
          />
          <InputField
            id="other-costs"
            label="Outros custos"
            value={form.otherCostsCents}
            onChange={(v) => onChange({ otherCostsCents: v })}
          />
        </div>
      </div>

      {/* Margem e desconto */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Margem e Ajustes</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InputField
            id="margin-bps"
            label="Margem (bps)"
            value={form.marginBps}
            onChange={(v) => onChange({ marginBps: v })}
            helpText="Ex: 2500 = 25%"
          />
          <InputField
            id="manual-adjustment"
            label="Ajuste manual"
            value={form.manualAdjustmentCents}
            onChange={(v) => onChange({ manualAdjustmentCents: v })}
            helpText="Positivo (+) ou negativo (−)"
          />
        </div>
      </div>

      {/* Pagamento */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Pagamento</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InputField
            id="entry-amount"
            label="Entrada"
            value={form.entryAmountCents}
            onChange={(v) => onChange({ entryAmountCents: v })}
          />
          <InputField
            id="installment-count"
            label="Número de parcelas"
            value={form.installmentCount}
            onChange={(v) => onChange({ installmentCount: v ? Math.round(v / 100) : null })}
            placeholder="Ex: 12"
          />
          <InputField
            id="success-fee-bps"
            label="Taxa de êxito (bps)"
            value={form.successFeeBps}
            onChange={(v) => onChange({ successFeeBps: v })}
            helpText="Ex: 1000 = 10%"
          />
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Notas</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Observações adicionais..."
          maxLength={2000}
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}