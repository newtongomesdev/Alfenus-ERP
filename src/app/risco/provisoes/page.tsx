import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import {
  getProvisions,
  getProvisionStats,
} from "@/lib/risco/queries";
import { brlFormatter } from "@/lib/formatters";
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
import { createProvisionAction } from "../actions";

const typeLabels: Record<string, string> = {
  constituida: "Constituida",
  contingente: "Contingente",
  reversao: "Reversao",
};

export default async function ProvisoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    provisaoType?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const [stats, { provisions, total }] = await Promise.all([
    getProvisionStats(context),
    getProvisions(
      context,
      params.status || params.provisaoType
        ? {
            status: params.status || undefined,
            provisionType: params.provisaoType || undefined,
          }
        : undefined,
      page,
      PAGE_SIZE
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const typeEntries = Object.entries(stats.byType).sort(
    (a, b) => b[1].value - a[1].value
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provisionamento"
        description="Gestao de provisoes processuais com valores, competencias e aprovacoes."
        actions={
          <a
            href="#nova-provisao"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Provisao
          </a>
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Provisao criada com sucesso.
          </CardContent>
        </Card>
      )}
      {params.erro && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : "Nao foi possivel concluir a operacao."}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Provisoes"
          value={stats.total}
          format="integer"
          detail="Provisoes registradas"
        />
        <MetricCard
          label="Valor Total"
          value={brlFormatter.format(stats.totalValue)}
          detail="Soma dos valores provisionados"
        />
        <MetricCard
          label="Pendentes"
          value={stats.byStatus["pendente"] ?? 0}
          format="integer"
          detail="Aguardando aprovacao"
        />
        <MetricCard
          label="Aprovadas"
          value={stats.byStatus["aprovada"] ?? 0}
          format="integer"
          detail="Provisoes confirmadas"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Lista de Provisoes</CardTitle>
          </CardHeader>
          <CardContent>
            {provisions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhuma provisao registrada.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie uma nova provisao para comecar a controlar valores
                  provisionados.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Competencia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provisions.map((provision) => (
                    <TableRow key={provision.id}>
                      <TableCell>
                        {typeLabels[provision.provisionType] ??
                          provision.provisionType}
                      </TableCell>
                      <TableCell>
                        {brlFormatter.format(provision.value)}
                      </TableCell>
                      <TableCell>{provision.competence ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge value={provision.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(
                          provision.createdAt
                        ).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeEntries.map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell>
                        {typeLabels[type] ?? type}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {data.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {brlFormatter.format(data.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {typeEntries.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground py-4"
                      >
                        Nenhum tipo registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card id="nova-provisao" className="rounded-lg">
            <CardHeader>
              <CardTitle>Nova Provisao</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createProvisionAction.bind(null, "/risco/provisoes")}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tipo de Provisao *
                  </label>
                  <select
                    name="provisionType"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="constituida">Constituida</option>
                    <option value="contingente">Contingente</option>
                    <option value="reversao">Reversao</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor (R$) *</label>
                  <input
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Competencia</label>
                  <input
                    name="competence"
                    placeholder="Ex.: 12/2025"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Justificativa
                  </label>
                  <textarea
                    name="justification"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                    placeholder="Motivo da provisao."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Salvar Provisao
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/risco/provisoes"
        totalRecords={total}
      />
    </div>
  );
}
