"use client";

import type { PricingScenarioVersionRow } from "@/lib/pricing/types";

interface ScenarioMemoryProps {
  version: PricingScenarioVersionRow | null;
  canViewMemory: boolean;
}

interface MemoryStep {
  step: string;
  description: string;
  value: unknown;
}

interface MemoryData {
  inputs?: Record<string, unknown>;
  steps?: MemoryStep[];
  assumptions?: string[];
  warnings?: string[];
  // Rich format from calculation engine
  engineVersion?: string;
  schemaVersion?: string;
  calculatedAt?: string;
  scenarioType?: string;
  sections?: Array<{
    id: string;
    title: string;
    items: Array<{
      label: string;
      description?: string;
      formula?: string;
      inputValues?: Record<string, unknown>;
      amountCents?: number;
      percentageBps?: number;
      result?: unknown;
      visibility?: string;
      order?: number;
    }>;
  }>;
  disclaimer?: string;
}

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    // Treat as cents if it looks like one
    if (value > 100 && value % 100 === 0) return formatCurrency(value);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function ScenarioMemory({ version, canViewMemory }: ScenarioMemoryProps) {
  if (!canViewMemory) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-lg font-medium">Memória de Cálculo</h2>
        <p className="text-sm text-muted-foreground">
          A memória de cálculo é visível apenas para o proprietário do escritório.
        </p>
      </section>
    );
  }

  if (!version) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-lg font-medium">Memória de Cálculo</h2>
        <p className="text-sm text-muted-foreground">
          Nenhuma versão ativa. Calcule o cenário primeiro.
        </p>
      </section>
    );
  }

  const memory = version.calculation_memory as MemoryData | null;

  if (!memory) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-lg font-medium">Memória de Cálculo</h2>
        <p className="text-sm text-muted-foreground">
          Sem dados de memória disponíveis para esta versão.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-6 print:break-inside-avoid">
      <h2 className="mb-2 text-lg font-medium">Memória de Cálculo</h2>

      {/* Rich format: sections */}
      {memory.sections && memory.sections.length > 0 ? (
        <div className="min-w-0 space-y-4">
          {memory.engineVersion && (
            <p className="text-xs text-muted-foreground">
              Motor: {memory.engineVersion} | Schema: {memory.schemaVersion} | Calculado: {memory.calculatedAt}
            </p>
          )}
          {memory.sections.map((section) => (
            <div key={section.id}>
              <h3 className="mb-2 text-sm font-medium border-b pb-1">{section.title}</h3>
              <div className="divide-y">
                {section.items
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((item, idx) => (
                    <div key={idx} className="flex min-w-0 items-start justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0 flex-1 break-words">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                        )}
                        {item.formula && (
                          <span className="ml-2 text-xs text-muted-foreground italic">({item.formula})</span>
                        )}
                      </div>
                      <div className="max-w-[45%] break-words text-right font-medium tabular-nums">
                        {item.amountCents != null
                          ? formatCurrency(item.amountCents)
                          : item.percentageBps != null
                            ? formatBps(item.percentageBps)
                            : formatValue(item.result)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {memory.disclaimer && (
            <p className="mt-4 text-xs text-muted-foreground italic">{memory.disclaimer}</p>
          )}
        </div>
      ) : (
        /* Simple format: steps */
        <div className="min-w-0 space-y-4">
          {/* Inputs */}
          {memory.inputs && Object.keys(memory.inputs).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Entradas</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(memory.inputs).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {memory.steps && memory.steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Etapas de Cálculo</h3>
              <div className="space-y-2">
                {memory.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-md bg-muted/30 p-3 text-sm"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium">{step.step}</span>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    <span className="font-medium tabular-nums">{formatValue(step.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          {memory.assumptions && memory.assumptions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Premissas</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {memory.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {memory.warnings && memory.warnings.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-amber-600">Avisos</h3>
              <ul className="list-disc pl-5 text-sm text-amber-600">
                {memory.warnings.map((w, idx) => (
                  <li key={idx}>{typeof w === "string" ? w : JSON.stringify(w)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Print button */}
      <div className="mt-6 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect width="12" height="8" x="6" y="14" />
          </svg>
          Imprimir memória
        </button>
      </div>
    </section>
  );
}
