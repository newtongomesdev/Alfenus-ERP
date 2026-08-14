"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setActivePricingVersionAction } from "@/lib/pricing/actions";

interface ScenarioVersionTableProps {
  scenarioId: string;
  scenarioStatus: string;
  versions: Array<{
    id: string;
    version_number: number;
    scenario_type: string;
    total_amount_cents: number;
    entry_amount_cents: number;
    installment_count: number;
    creation_at: string;
  }>;
  activeVersionId: string | null;
  canManage: boolean;
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function ScenarioVersionTable({
  scenarioId,
  scenarioStatus,
  versions,
  activeVersionId,
  canManage,
}: ScenarioVersionTableProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isArchived = scenarioStatus === "archived";

  async function handleActivate(versionId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setActivePricingVersionAction(scenarioId, versionId);
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error ?? "Erro ao ativar versão");
        }
      } catch {
        setError("Erro inesperado");
      }
    });
  }

  return (
    <section
      className="min-w-0 w-full overflow-hidden rounded-lg border bg-card p-4 sm:p-6"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
    >
      <h2 className="mb-4 text-lg font-medium">Versões</h2>

      {error && (
        <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma versão calculada ainda.
        </p>
      ) : (
        <div className="min-w-0 w-full max-w-full overflow-x-clip">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">Versões do cenário</caption>
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="pb-2">#</th>
                <th scope="col" className="pb-2">Tipo</th>
                <th scope="col" className="pb-2 text-right">Total</th>
                <th scope="col" className="pb-2 text-right">Entrada</th>
                <th scope="col" className="pb-2 text-right">Parcelas</th>
                <th scope="col" className="pb-2">Criada em</th>
                {canManage && !isArchived && <th scope="col" className="pb-2 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={v.id === activeVersionId ? "bg-muted/30" : ""}
                >
                  <td className="break-words py-2 font-medium">
                    v{v.version_number}
                    {v.id === activeVersionId && (
                      <span className="ml-1 text-xs text-emerald-600">(ativa)</span>
                    )}
                  </td>
                  <td className="break-words py-2 text-muted-foreground">{v.scenario_type}</td>
                  <td className="break-words py-2 text-right font-medium">
                    {formatCurrency(v.total_amount_cents)}
                  </td>
                  <td className="break-words py-2 text-right text-muted-foreground">
                    {formatCurrency(v.entry_amount_cents)}
                  </td>
                  <td className="break-words py-2 text-right text-muted-foreground">
                    {v.installment_count}x
                  </td>
                  <td className="break-words py-2 text-muted-foreground">
                    {formatDateTime(v.creation_at)}
                  </td>
                  {canManage && !isArchived && (
                    <td className="py-2 text-right">
                      {v.id === activeVersionId ? (
                        <span className="text-xs text-emerald-600">Ativa</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(v.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          Ativar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
