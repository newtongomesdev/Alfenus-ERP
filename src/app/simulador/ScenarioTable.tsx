import Link from "next/link";
import type { PricingScenarioOverview } from "@/lib/pricing/types";
import { PRICING_STATUS_CONFIG } from "@/lib/pricing/constants";

interface ScenarioTableProps {
  scenarios: PricingScenarioOverview[];
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
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
  }).format(new Date(iso));
}

export function ScenarioTable({ scenarios }: ScenarioTableProps) {
  if (scenarios.length === 0) {
    return (
      <div role="status" aria-live="polite" className="rounded-lg border bg-card p-12 text-center">
        <h3 className="text-lg font-medium text-muted-foreground">
          Nenhum cenário encontrado
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie seu primeiro cenário de precificação para começar a simular.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table aria-label="Lista de cenários de precificação" className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="px-4 py-3">Nome</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Versão</th>
            <th scope="col" className="px-4 py-3 text-right">Valor</th>
            <th scope="col" className="px-4 py-3">Criado em</th>
            <th scope="col" className="px-4 py-3">Atualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {scenarios.map((s) => {
            const statusConfig = PRICING_STATUS_CONFIG[s.status as keyof typeof PRICING_STATUS_CONFIG];
            return (
              <tr
                key={s.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/simulador/${s.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig?.color ?? "text-gray-600 bg-gray-50 border-gray-200"}`}
                  >
                    {statusConfig?.label ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.active_version_number != null
                    ? `v${s.active_version_number}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(s.total_amount_cents)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(s.created_at)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(s.updated_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
