"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceOverview } from "@/lib/service-catalog/types";
import { WizardStep1 } from "./WizardStep1";
import { WizardStep2 } from "./WizardStep2";
import { WizardStep3 } from "./WizardStep3";

const STEPS = [
  { key: "servico", label: "Serviço" },
  { key: "parametros", label: "Parâmetros" },
  { key: "previa", label: "Prévia" },
];

export interface WizardFormData {
  // Step 1
  name: string;
  description: string;
  serviceId: string;
  serviceName: string;
  // Step 2
  scenarioType: "conservative" | "main" | "expanded" | "custom";
  estimatedHours: number | null;
  hourlyRateCents: number | null;
  directExpensesCents: number | null;
  indirectExpensesCents: number | null;
  thirdPartyCostsCents: number | null;
  travelCostsCents: number | null;
  feesAndTaxesCents: number | null;
  otherCostsCents: number | null;
  marginBps: number | null;
  manualAdjustmentCents: number | null;
  entryAmountCents: number | null;
  installmentCount: number | null;
  successFeeBps: number | null;
  notes: string;
  // Preview (computed)
  previewResult: PreviewResult | null;
}

export interface PreviewResult {
  total_fee_cents: number;
  base_fee_cents: number;
  expenses_cents: number;
  entry_amount_cents: number;
  financed_amount_cents: number;
  installment_count: number;
  installment_value_cents: number;
  success_fee_cents: number;
  monthly_fee_cents: number;
  warnings: string[];
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

const EMPTY_FORM: WizardFormData = {
  name: "",
  description: "",
  serviceId: "",
  serviceName: "",
  scenarioType: "main",
  estimatedHours: null,
  hourlyRateCents: null,
  directExpensesCents: null,
  indirectExpensesCents: null,
  thirdPartyCostsCents: null,
  travelCostsCents: null,
  feesAndTaxesCents: null,
  otherCostsCents: null,
  marginBps: null,
  manualAdjustmentCents: null,
  entryAmountCents: null,
  installmentCount: null,
  successFeeBps: null,
  notes: "",
  previewResult: null,
};

interface PricingWizardProps {
  services: ServiceOverview[];
}

export function PricingWizard({ services }: PricingWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdScenarioIdRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const router = useRouter();

  function updateForm(partial: Partial<WizardFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function next() {
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function getClientIdempotencyKey() {
    if (!idempotencyKeyRef.current) {
      const timestamp = Date.now();
      const random = globalThis.crypto?.randomUUID?.()?.replace(/-/g, "") ?? `${timestamp}`;
      idempotencyKeyRef.current = `create_version:${timestamp}:${random}`;
    }

    return idempotencyKeyRef.current;
  }

  function resetSubmissionState() {
    createdScenarioIdRef.current = null;
    idempotencyKeyRef.current = null;
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      let scenarioId = createdScenarioIdRef.current;
      if (!scenarioId) {
        const { createPricingScenarioAction } = await import("@/lib/pricing/actions");
        const result = await createPricingScenarioAction({
          name: form.name,
          description: form.description || undefined,
          service_id: form.serviceId || undefined,
        });

        if (!result.ok || !result.id) {
          setError(result.error ?? "Erro ao criar cenário");
          setIsSubmitting(false);
          return;
        }

        scenarioId = result.id;
        createdScenarioIdRef.current = result.id;
      }

      // If calc params are filled, also create a version
      if (form.estimatedHours || form.directExpensesCents || form.marginBps) {
        const { calculateAndCreatePricingVersionAction } = await import("@/lib/pricing/actions");
        const idempotencyKey = getClientIdempotencyKey();
        const calcResult = await calculateAndCreatePricingVersionAction({
          scenario_id: scenarioId,
          scenario_type: form.scenarioType,
          fee_type: form.scenarioType,
          fee_value_cents: form.hourlyRateCents ?? 0,
          currency: "BRL",
          payment_method: "parcelado",
          installments: form.installmentCount ?? 1,
          success_fee_rate_bps: form.successFeeBps ?? undefined,
          activate: true,
          idempotency_key: idempotencyKey,
        });

        if (!calcResult.ok) {
          setError(calcResult.error ?? "Erro ao calcular versão");
          setIsSubmitting(false);
          return;
        }
      }

      const finalScenarioId = scenarioId;
      resetSubmissionState();
      router.push(`/simulador/${finalScenarioId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <nav aria-label="Etapas do formulário" className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              aria-current={i === step ? "step" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium ${
                i < step
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px w-8 bg-muted-foreground/20" aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <WizardStep1
          form={form}
          services={services}
          onChange={updateForm}
          onNext={next}
        />
      )}
      {step === 1 && (
        <WizardStep2
          form={form}
          onChange={updateForm}
          onPrev={prev}
          onNext={next}
        />
      )}
      {step === 2 && (
        <WizardStep3
          form={form}
          onPrev={prev}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
