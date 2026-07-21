import { Search } from "lucide-react";
import Link from "next/link";

import { getAdminContext } from "@/lib/admin/auth";
import { getPlatformAccessRequests } from "@/lib/assisted-access/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccessRequestStatus } from "@/lib/assisted-access/constants";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "aprovada_com_restrições", label: "Aprovada com restrições" },
  { value: "recusada", label: "Recusada" },
  { value: "utilizada", label: "Em uso" },
  { value: "encerrada", label: "Encerrada" },
];

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const { adminClient, email } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  const filterStatus = (params.status as AccessRequestStatus | undefined) ?? undefined;

  const requests = await getPlatformAccessRequests(
    filterStatus ? { status: filterStatus } : {},
    page,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(requests.count / PAGE_SIZE));
  const pendingCount = requests.data.filter((r) => r.status === "pendente").length;
  const activeCount = requests.data.filter((r) => r.status === "utilizada").length;

  const filterParts: string[] = [];
  if (filterStatus) filterParts.push(`status=${filterStatus}`);
  const basePath = filterParts.length > 0
    ? `/admin/suporte/acessos?${filterParts.join("&")}`
    : "/admin/suporte/acessos";

  // Buscar law_firm_name a partir dos dados retornados
  const rowsWithTenant = requests.data.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = r as any;
    return {
      ...r,
      lawFirmName: any.law_firms?.name ?? "—",
      lawFirmPlan: any.law_firms?.plan ?? "—",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acessos Assistidos"
        description="Visão global das solicitações de acesso assistido de todos os tenants."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total"
          value={requests.count}
          format="integer"
          detail="Solicitações"
        />
        <MetricCard
          label="Pendentes"
          value={pendingCount}
          format="integer"
          detail="Aguardando ação"
        />
        <MetricCard
          label="Ativas"
          value={activeCount}
          format="integer"
          detail="Sessões em uso"
        />
      </section>

      <Card className="rounded-lg">
        <CardContent className="space-y-4 pt-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={filterStatus ?? ""}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Filtrar
            </button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithTenant.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Link
                      href={`/admin/suporte/acessos/${request.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {request.lawFirmName}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {request.lawFirmPlan}
                    </span>
                  </TableCell>
                  <TableCell>{request.operator?.name ?? "—"}</TableCell>
                  <TableCell>
                    {request.ticket ? (
                      <Badge variant="outline">{request.ticket.protocol}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {request.reason}
                  </TableCell>
                  <TableCell>{request.duration_minutes} min</TableCell>
                  <TableCell>
                    <StatusBadge value={request.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {rowsWithTenant.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
