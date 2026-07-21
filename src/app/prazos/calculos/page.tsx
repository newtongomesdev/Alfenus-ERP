import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getCalculations, getCalculationStats } from "@/lib/prazos/queries";
import { formatDeadlineResult } from "@/lib/prazos/engine";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  calculado: "Calculado",
  aguardando_revisao: "Aguard. Revisão",
  revisado: "Revisado",
  confirmado: "Confirmado",
  substituido: "Substituído",
  cancelado: "Cancelado",
};

export default async function DeadlineCalculationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const PAGE_SIZE = 20;

  let stats;
  let calculations;
  let total;
  try {
    [stats, { calculations, total }] = await Promise.all([
      getCalculationStats(context),
      getCalculations(
        context,
        params.status ? { status: params.status } : undefined,
        page,
        PAGE_SIZE
      ),
    ]);
  } catch {
    console.error("[prazos/calculos] Falha ao carregar cálculos — migrations podem não estar aplicadas");
    stats = { total: 0, byStatus: {}, avgDaysToResolve: 0 };
    calculations = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCount = (s: string) => stats.byStatus[s] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cálculo de Prazos"
        description="Motor de cálculo auditável para prazos jurídicos com versionamento e dupla conferência."
        actions={
          <Link
            href="/prazos/calculos/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Calculação
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total"
          value={stats.total}
          format="integer"
          detail="Cálculos registrados"
        />
        <MetricCard
          label="Calculados"
          value={statusCount("calculado")}
          format="integer"
          detail="Aguardando revisão"
        />
        <MetricCard
          label="Aguard. Revisão"
          value={statusCount("aguardando_revisao")}
          format="integer"
          detail="Dupla conferência"
        />
        <MetricCard
          label="Confirmados"
          value={statusCount("confirmado")}
          format="integer"
          detail="Prazos aprovados"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Rascunho", value: "rascunho" },
          { label: "Calculado", value: "calculado" },
          { label: "Aguard. Revisão", value: "aguardando_revisao" },
          { label: "Confirmado", value: "confirmado" },
          { label: "Cancelado", value: "cancelado" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `?status=${f.value}` : "?"}
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
              (params.status ?? "") === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Cálculos de Prazo</CardTitle>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum cálculo registrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um novo cálculo para começar a controlar prazos jurídicos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Parâmetros</TableHead>
                  <TableHead>Data Calculada</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell>
                      <div className="font-medium">{calc.tribunal}</div>
                      {calc.procedureType && (
                        <div className="text-xs text-muted-foreground">
                          {calc.procedureType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {calc.quantity} {calc.unit}
                        {calc.businessDays ? " (úteis)" : " (corridos)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Início: {calc.startDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDeadlineResult(calc)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">v{calc.version}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        value={statusLabels[calc.status] ?? calc.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/prazos/calculos"
        totalRecords={total}
      />
    </div>
  );
}
