import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getRequests, getRequestStats } from "@/lib/clm/queries";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
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
  juridico: "Juridico",
  administrativo: "Administrativo",
  empresarial: "Empresarial",
  trabalhista: "Trabalhista",
  financeiro: "Financeiro",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    priority?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const [stats, { requests, total }] = await Promise.all([
    getRequestStats(context),
    getRequests(
      context,
      params.status || params.priority
        ? {
            status: (params.status as any) || undefined,
            priority: params.priority || undefined,
          }
        : undefined,
      page,
      PAGE_SIZE
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitacoes de Contrato"
        description="Gerencie solicitacoes de contratos, acompanhamento de status e prioridades."
        actions={
          <Link
            href="/clm/solicitacoes/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Solicitacao
          </Link>
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Solicitacao criada com sucesso.
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
          detail="Solicitacoes registradas"
        />
        <MetricCard
          label="Em Andamento"
          value={(stats.byStatus["triagem"] ?? 0) + (stats.byStatus["minuta"] ?? 0) + (stats.byStatus["revisao"] ?? 0) + (stats.byStatus["negociacao"] ?? 0)}
          format="integer"
          detail="Em fase de elaboracao"
        />
        <MetricCard
          label="Aguardando Aprovacao"
          value={(stats.byStatus["aprovacao"] ?? 0) + (stats.byStatus["assinatura_pendente"] ?? 0)}
          format="integer"
          detail="Aguardando decisao"
        />
        <MetricCard
          label="Ativos"
          value={(stats.byStatus["ativo"] ?? 0) + (stats.byStatus["renovacao"] ?? 0)}
          format="integer"
          detail="Contratos vigentes"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Solicitacao", value: "solicitacao" },
          { label: "Triagem", value: "triagem" },
          { label: "Minuta", value: "minuta" },
          { label: "Revisao", value: "revisao" },
          { label: "Negociacao", value: "negociacao" },
          { label: "Aprovacao", value: "aprovacao" },
          { label: "Ativo", value: "ativo" },
          { label: "Encerramento", value: "encerramento" },
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
          {requests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma solicitacao registrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie uma nova solicitacao de contrato para comecar.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Necessaria</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.title}</div>
                    </TableCell>
                    <TableCell>
                      {categoryLabels[request.category] ?? request.category}
                    </TableCell>
                    <TableCell>{request.contractType ?? "—"}</TableCell>
                    <TableCell>
                      {priorityLabels[request.priority] ?? request.priority}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={request.status} />
                    </TableCell>
                    <TableCell>
                      {request.necessaryDate
                        ? new Date(request.necessaryDate).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString("pt-BR")}
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
        basePath="/clm/solicitacoes"
        totalRecords={total}
      />
    </div>
  );
}
