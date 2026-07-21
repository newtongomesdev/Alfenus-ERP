import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getClaims, getClaimStats } from "@/lib/risco/queries";
import { brlFormatter } from "@/lib/formatters";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const categoryLabels: Record<string, string> = {
  tributario: "Tributario",
  civil: "Civil",
  trabalhista: "Trabalhista",
  administrativo: "Administrativo",
  penal: "Penal",
  ambiental: "Ambiental",
  consumidor: "Consumidor",
  outro: "Outro",
};

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    category?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const [stats, { claims, total }] = await Promise.all([
    getClaimStats(context),
    getClaims(
      context,
      params.status || params.category
        ? {
            status: params.status || undefined,
            category: params.category || undefined,
          }
        : undefined,
      page,
      PAGE_SIZE
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusCount = (s: string) => stats.byStatus[s] ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos Processuais"
        description="Gerencie pedidos de valores processuais, indenizacoes e reajustes."
        actions={
          <Link
            href="/risco/pedidos/novo"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Novo Pedido
          </Link>
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Pedido criado com sucesso.
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
          label="Total"
          value={stats.total}
          format="integer"
          detail="Pedidos registrados"
        />
        <MetricCard
          label="Valor Total"
          value={brlFormatter.format(stats.totalValue)}
          detail="Soma dos valores"
        />
        <MetricCard
          label="Pendentes"
          value={statusCount("pendente")}
          format="integer"
          detail="Aguardando analise"
        />
        <MetricCard
          label="Concluidos"
          value={statusCount("concluido")}
          format="integer"
          detail="Pedidos finalizados"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Pendente", value: "pendente" },
          { label: "Em Analise", value: "em_analise" },
          { label: "Aprovado", value: "aprovado" },
          { label: "Indeferido", value: "indeferido" },
          { label: "Concluido", value: "concluido" },
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
        <CardContent className="pt-6">
          {claims.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum pedido registrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um novo pedido para comecar a gerenciar valores
                processuais.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor Original</TableHead>
                  <TableHead>Valor Atualizado</TableHead>
                  <TableHead>Indice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <div className="font-medium">{claim.description}</div>
                    </TableCell>
                    <TableCell>
                      {categoryLabels[claim.category] ?? claim.category}
                    </TableCell>
                    <TableCell>
                      {claim.originalValue
                        ? brlFormatter.format(claim.originalValue)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {claim.updatedValue
                        ? brlFormatter.format(claim.updatedValue)
                        : "—"}
                    </TableCell>
                    <TableCell>{claim.indexName ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge value={claim.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(claim.createdAt).toLocaleDateString("pt-BR")}
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
        basePath="/risco/pedidos"
        totalRecords={total}
      />
    </div>
  );
}
