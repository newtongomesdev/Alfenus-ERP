import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { getAccessRequests, getActiveSessions } from "@/lib/assisted-access/queries";
import { getSessionTimeRemaining } from "@/lib/assisted-access/service";
import type { AccessRequestStatus } from "@/lib/assisted-access/constants";
import { AccessRequestCard } from "@/components/assisted-access/access-request-card";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "aprovada_com_restrições", label: "Aprovada com restrições" },
  { value: "recusada", label: "Recusada" },
  { value: "utilizada", label: "Em uso" },
  { value: "encerrada", label: "Encerrada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "expirada", label: "Expirada" },
];

export default async function AssistedAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  ) {
    return (
      <AppShell memberName={null}>
        <PageHeader
          title="Acesso Assistido"
          description="Gerencie solicitações de acesso de operadores de suporte."
        />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {context.status === "missing-env"
              ? "Configure o Supabase para gerenciar acessos assistidos."
              : (
                <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>
                  {context.status === "missing-tenant" ? "Criar escritório" : "Entrar"}
                </Link>
              )}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const canManage = can(context.member.role, "configuracoes.administrar");
  const filterStatus = (params.status as AccessRequestStatus | undefined) ?? undefined;
  const page = Math.max(1, Number(params.page ?? 1));

  const [requestsResult, activeSessions] = await Promise.all([
    getAccessRequests(
      context.lawFirm.id,
      filterStatus ? { status: filterStatus } : {},
      page,
      15,
    ),
    getActiveSessions(context.lawFirm.id),
  ]);

  const filterParts: string[] = [];
  if (filterStatus) filterParts.push(`status=${filterStatus}`);
  const basePath = filterParts.length > 0
    ? `/configuracoes/acesso-assistido?${filterParts.join("&")}`
    : "/configuracoes/acesso-assistido";

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader
          title="Acesso Assistido"
          description="Gerencie solicitações de acesso de operadores de suporte ao seu escritório."
        />

        {activeSessions.length > 0 && (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardHeader>
              <CardTitle>Sessões ativas</CardTitle>
              <CardDescription>
                {activeSessions.length} sessão(ões) de acesso assistido em andamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Restante</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => {
                    const remaining = getSessionTimeRemaining(session);
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.operator?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(session.started_at)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(session.expires_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={remaining <= 10 ? "destructive" : "outline"}>
                            {remaining} min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/configuracoes/acesso-assistido/${session.access_request_id}`}
                            className="text-sm text-primary underline-offset-4 hover:underline"
                          >
                            Detalhes
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Solicitações</CardTitle>
                <CardDescription>
                  {requestsResult.count} solicitação(ões) no total.
                </CardDescription>
              </div>
              {canManage && (
                <form method="get" className="flex items-center gap-2">
                  <select
                    name="status"
                    defaultValue={filterStatus ?? ""}
                    className="flex h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Filtrar
                  </button>
                </form>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {requestsResult.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma solicitação encontrada.
              </p>
            ) : (
              <div className="space-y-3">
                {requestsResult.data.map((request) => (
                  <AccessRequestCard
                    key={request.id}
                    request={request}
                    baseUrl="/configuracoes/acesso-assistido"
                    canManage={canManage}
                  />
                ))}
              </div>
            )}

            {requestsResult.totalPages > 1 && (
              <Pagination
                currentPage={requestsResult.page}
                totalPages={requestsResult.totalPages}
                basePath={basePath}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
