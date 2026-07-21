import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdvancedRequests } from "../actions";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    prioridade?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const PAGE_SIZE = 20;
  const canCreate = can(context.member?.role ?? "visualizador", "prazos.criar");

  const { requests, total } = await getAdvancedRequests(
    {
      status: params.status || undefined,
      priority: params.prioridade || undefined,
    },
    page,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(overrides: Record<string, string>) {
    const url = new URL("/solicitacoes/pedidos", "http://localhost");
    const status = overrides.status ?? params.status ?? "";
    const prioridade = overrides.prioridade ?? params.prioridade ?? "";
    if (status) url.searchParams.set("status", status);
    if (prioridade) url.searchParams.set("prioridade", prioridade);
    if (overrides.page) url.searchParams.set("page", overrides.page);
    return url.pathname + url.search;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Solicitação"
        description={`${total} solicitações encontradas.`}
        actions={
          canCreate ? (
            <Link
              href="/solicitacoes/pedidos/novo"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Nova Solicitação
            </Link>
          ) : undefined
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            Solicitação criada com sucesso.
          </CardContent>
        </Card>
      )}

      {params.erro && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel não tem permissão para esta operação."
              : "Não foi possível concluir a operação."}
          </CardContent>
        </Card>
      )}

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={buildHref({ status: opt.value })}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              (params.status ?? "") === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Filtros de prioridade */}
      <div className="flex flex-wrap gap-2">
        {PRIORITY_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={buildHref({ prioridade: opt.value })}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              (params.prioridade ?? "") === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação encontrada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.title}</div>
                      {req.clientName && (
                        <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {req.clientName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {req.documentType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={req.priority} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.requestedByName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.assignedToName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.dueDate ? formatDate(`${req.dueDate}T00:00:00`) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={req.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/solicitacoes/pedidos"
        totalRecords={total}
      />
    </div>
  );
}
