"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { comparePricingVersionsAction } from "@/lib/pricing/actions";

interface ComparisonVersion {
  id: string;
  version_number: number;
  scenario_type: string;
  total_amount_cents: number;
  entry_amount_cents: number;
  installment_count: number;
  created_at: string;
}

interface ComparisonResult {
  versionIdA: string;
  versionIdB: string;
  versionNumberA: number;
  versionNumberB: number;
  diffs: Array<{
    field: string;
    label: string;
    from: string | number | boolean | null;
    to: string | number | boolean | null;
  }>;
  resultDiffs: Array<{
    field: string;
    label: string;
    valueA: number | null;
    valueB: number | null;
    delta: number | null;
    deltaPercentage: number | null;
  }>;
  identicalInputs: boolean;
  identicalResults: boolean;
}

interface ComparisonClientProps {
  scenarioId: string;
  versions: ComparisonVersion[];
  initialVersionA: string | null;
  initialVersionB: string | null;
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDelta(delta: number | null, deltaPct: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  const pct = deltaPct !== null ? ` (${sign}${deltaPct}%)` : "";
  return `${sign}${formatCurrency(delta)}${pct}`;
}

export function ComparisonClient({
  scenarioId,
  versions,
  initialVersionA,
  initialVersionB,
}: ComparisonClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedA, setSelectedA] = useState(initialVersionA ?? "");
  const [selectedB, setSelectedB] = useState(initialVersionB ?? "");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function syncSelection(nextA: string, nextB: string) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB && nextB !== nextA) params.set("b", nextB);
    router.replace(`/simulador/${scenarioId}/comparar${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  async function runComparison(versionA: string, versionB: string) {
    if (!versionA || !versionB || versionA === versionB) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await comparePricingVersionsAction(scenarioId, versionA, versionB);
        if (res.ok && res.comparison) {
          setResult(res.comparison as unknown as ComparisonResult);
          syncSelection(versionA, versionB);
        } else {
          setError(res.error ?? "Erro ao comparar versões");
        }
      } catch {
        setError("Erro inesperado");
      }
    });
  }

  useEffect(() => {
    if (initialVersionA && initialVersionB && initialVersionA !== initialVersionB) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runComparison(initialVersionA, initialVersionB);
    }
    // The initial URL is the only source for this automatic comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCompare() {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      setError("Selecione duas versões diferentes");
      return;
    }
    void runComparison(selectedA, selectedB);
  }

  const vA = versions.find((v) => v.id === selectedA);
  const vB = versions.find((v) => v.id === selectedB);

  return (
    <div className="space-y-6">
      {/* Seletores */}
      <div className="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label htmlFor="version-a" className="text-sm font-medium">Versão A</label>
            <select
              id="version-a"
              value={selectedA}
              onChange={(e) => {
                setSelectedA(e.target.value);
                syncSelection(e.target.value, selectedB);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.scenario_type} — {formatCurrency(v.total_amount_cents)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="version-b" className="text-sm font-medium">Versão B</label>
            <select
              id="version-b"
              value={selectedB}
              onChange={(e) => {
                setSelectedB(e.target.value);
                syncSelection(selectedA, e.target.value);
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.scenario_type} — {formatCurrency(v.total_amount_cents)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCompare}
            disabled={isPending || !selectedA || !selectedB || selectedA === selectedB}
            aria-busy={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Comparando..." : "Comparar"}
          </button>
          {selectedA && selectedB && selectedA === selectedB && (
            <span className="text-xs text-muted-foreground">
              Selecione versões diferentes
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {/* Resultado da comparação */}
      {result && (
    <div className="min-w-0 space-y-6">
          {/* Cabeçalho */}
          <div className="grid grid-cols-2 gap-4">
            <VersionSummary label="Versão A" version={vA} />
            <VersionSummary label="Versão B" version={vB} />
          </div>

          {/* Diffs de parâmetros */}
          <section className="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-medium">Parâmetros</h2>
            {result.identicalInputs ? (
              <p className="text-sm text-muted-foreground">Sem diferenças nos parâmetros de entrada.</p>
            ) : (
              <div className="min-w-0 max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Comparação de parâmetros entre versões</caption>
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="pb-2">Campo</th>
                      <th scope="col" className="pb-2">Versão A</th>
                      <th scope="col" className="pb-2">Versão B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.diffs.map((d) => (
                      <tr key={d.field}>
                        <td className="py-2 font-medium">{d.label}</td>
                        <td className="py-2 text-muted-foreground">{String(d.from ?? "—")}</td>
                        <td className="py-2 text-muted-foreground">{String(d.to ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Diffs de resultado */}
          <section className="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-medium">Resultados</h2>
            {result.identicalResults ? (
              <p className="text-sm text-muted-foreground">Sem diferenças nos resultados.</p>
            ) : (
              <div className="min-w-0 max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Comparação de resultados entre versões</caption>
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="pb-2">Campo</th>
                      <th scope="col" className="pb-2 text-right">Versão A</th>
                      <th scope="col" className="pb-2 text-right">Versão B</th>
                      <th scope="col" className="pb-2 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.resultDiffs.map((d) => (
                      <tr key={d.field}>
                        <td className="py-2 font-medium">{d.label}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(d.valueA)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(d.valueB)}</td>
                        <td
                          className={`py-2 text-right font-medium ${
                            d.delta !== null && d.delta > 0
                              ? "text-emerald-600"
                              : d.delta !== null && d.delta < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatDelta(d.delta, d.deltaPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Estado vazio */}
      {!result && !error && (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          Selecione duas versões e clique em &ldquo;Comparar&rdquo; para ver as diferenças.
        </div>
      )}
    </div>
  );
}

function VersionSummary({
  label,
  version,
}: {
  label: string;
  version?: ComparisonVersion;
}) {
  if (!version) return <div className="rounded-lg border bg-card p-4" />;

  return (
    <div className="min-w-0 rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">v{version.version_number}</p>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <p>Tipo: {version.scenario_type}</p>
        <p>Total: {formatCurrency(version.total_amount_cents)}</p>
        <p>Criado: {formatDate(version.created_at)}</p>
      </div>
    </div>
  );
}
