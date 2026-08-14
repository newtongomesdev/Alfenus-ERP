"use client";

import type { ServiceOverview } from "@/lib/service-catalog/types";
import type { WizardFormData } from "./PricingWizard";

interface WizardStep1Props {
  form: WizardFormData;
  services: ServiceOverview[];
  onChange: (partial: Partial<WizardFormData>) => void;
  onNext: () => void;
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function WizardStep1({ form, services, onChange, onNext }: WizardStep1Props) {
  const isValid = form.name.trim().length > 0;

  function handleSelectService(id: string) {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;

    // Auto-fill from catalog
    onChange({
      serviceId: id,
      serviceName: svc.name,
      name: svc.name,
      hourlyRateCents:
        svc.reference_value_cents && svc.charging_model === "por_hora"
          ? svc.reference_value_cents
          : null,
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <h2 className="text-lg font-medium">1. Serviço e Identificação</h2>
      <p className="text-sm text-muted-foreground">
        Selecione um serviço do catálogo (opcional) e defina o nome do cenário.
      </p>

      {/* Nome do cenário */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nome do cenário *
        </label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Cenário principal — Ação Trabalhista"
          maxLength={500}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descreva brevemente o cenário..."
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Seleção de serviço */}
      <div className="space-y-2">
        <label htmlFor="service-select" className="text-sm font-medium">Serviço do catálogo</label>
        <select
          id="service-select"
          value={form.serviceId}
          onChange={(e) => handleSelectService(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Nenhum serviço selecionado</option>
          {services.map((svc) => (
            <option key={svc.id} value={svc.id}>
              {svc.name} — {svc.practice_area} ({svc.charging_model})
              {svc.reference_value_cents != null
                ? ` (${formatCurrency(svc.reference_value_cents)})`
                : ""}
            </option>
          ))}
        </select>
        {form.serviceId && (
          <button
            type="button"
            aria-label="Limpar seleção de serviço"
            onClick={() => onChange({ serviceId: "", serviceName: "" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar seleção
          </button>
        )}
      </div>

      {/* Resumo do serviço selecionado */}
      {form.serviceId && (
        <div className="rounded-md bg-muted/50 p-4">
          <h3 className="text-sm font-medium">{form.serviceName}</h3>
          {(() => {
            const svc = services.find((s) => s.id === form.serviceId);
            if (!svc) return null;
            return (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Área: {svc.practice_area}</div>
                <div>Modelo: {svc.charging_model}</div>
                <div>Valor ref.: {formatCurrency(svc.reference_value_cents)}</div>
                {svc.short_description && (
                  <div className="col-span-2">{svc.short_description}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}