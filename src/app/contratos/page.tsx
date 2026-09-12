import { AlertTriangle, Plus, Search } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppContext, getLawFirmMembers } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractListOptions, getContractsOverview, type ContractListFilters } from "@/lib/contracts/queries";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

function ContractsUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar contratos reais."
      : status === "signed-out"
        ? "Entre para acessar contratos, honorários e parcelas."
        : "Crie o primeiro escritório antes de gerenciar contratos.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Contratos" description="Honorários, contratos, parcelamentos e situação financeira." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            {status !== "missing-env" ? (
              <Link
                href={href}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                {action}
              </Link>
            ) : null}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; erro?: string; page?: string; q?: string; status?: string; clientId?: string; responsibleMemberId?: string; origin?: "proposal" | "manual"; de?: string; ate?: string; arquivados?: string; sort?: ContractListFilters["sort"]; direction?: "asc" | "desc" }>;
}) {
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const parsedPage = Number(params.page ?? 1);
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
  const filters: ContractListFilters = { search: params.q?.trim() || undefined, status: params.status || undefined, clientId: params.clientId || undefined, responsibleMemberId: params.responsibleMemberId || undefined, origin: params.origin, dateFrom: params.de, dateTo: params.ate, includeArchived: params.arquivados === "1", sort: params.sort, direction: params.direction };

  let context: Awaited<ReturnType<typeof getAppContext>>;
  let overview: Awaited<ReturnType<typeof getContractsOverview>>;
  let members: Awaited<ReturnType<typeof getLawFirmMembers>> = [];
  let options: Awaited<ReturnType<typeof getContractListOptions>> = { clients: [] };

  try {
    context = await getAppContext();
  } catch {
    return (
      <AppShell memberName={null}>
        <div className="space-y-6">
          <PageHeader title="Contratos" description="Honorários, contratos, parcelamentos e situação financeira." />
          <Card className="rounded-lg border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">Não foi possível carregar os contratos. Verifique a configuração do Supabase.</CardContent></Card>
        </div>
      </AppShell>
    );
  }
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <ContractsUnavailable status={context.status} />;
  }
  try {
    [overview, members, options] = await Promise.all([getContractsOverview(context.lawFirm.id, page, PAGE_SIZE, filters), getLawFirmMembers(context.lawFirm.id), getContractListOptions(context.lawFirm.id)]);
  } catch {
    return (
      <AppShell memberName={null}>
        <div className="space-y-6">
          <PageHeader title="Contratos" description="Honorários, contratos, parcelamentos e situação financeira." />
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Não foi possível carregar os contratos. Verifique a configuração do Supabase.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const canManageContracts = can(context.member.role, "contratos.gerenciar");
  const totalPages = Math.max(1, Math.ceil(overview.totalCount / PAGE_SIZE));
  const filterQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({ q: params.q, status: params.status, clientId: params.clientId, responsibleMemberId: params.responsibleMemberId, origin: params.origin, de: params.de, ate: params.ate, arquivados: params.arquivados, sort: params.sort, direction: params.direction })) if (value) filterQuery.set(key, value);
  const paginationPath = filterQuery.toString() ? `/contratos?${filterQuery.toString()}` : "/contratos";

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Contratos"
          description="Controle contratos de honorários, parcelamentos e valores em aberto."
          actions={
            canManageContracts ? (
              <Link
                href="/contratos/novo"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
              >
                <Plus className="size-4" />
                Novo contrato
              </Link>
            ) : null
          }
        />

        {params.criado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">Contrato criado com parcelas vinculadas.</CardContent>
          </Card>
        ) : null}

        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Não foi possível concluir a operação. Verifique permissões e configuração do Supabase.
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Contratos ativos" value={overview.activeContracts} format="integer" detail="Status ativo" />
          <MetricCard label="Carteira contratada" value={overview.totalPortfolioCents} format="currency" detail="Todos os contratos" />
          <MetricCard label="Em aberto" value={overview.openAmountCents} format="currency" detail="Saldo ainda não pago" />
          <MetricCard label="Vencido" value={overview.overdueAmountCents} format="currency" detail="Parcelas vencidas" />
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Contratos de honorários</CardTitle>
            <CardDescription>Contratos reais do tenant ativo, com cliente, parcelas e status financeiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-4 xl:grid-cols-8">
              <label className="relative md:col-span-2 xl:col-span-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Buscar</span><Input name="q" className="pl-9" placeholder="Cliente, contrato ou pagamento" defaultValue={params.q ?? ""} /></label>
              <select name="status" aria-label="Status" defaultValue={params.status ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Todos os status</option><option value="rascunho">Rascunho</option><option value="aguardando_assinatura">Aguardando assinatura</option><option value="ativo">Ativo</option><option value="quitado">Quitado</option><option value="inadimplente">Inadimplente</option><option value="cancelado">Cancelado</option></select>
              <select name="origin" aria-label="Origem" defaultValue={params.origin ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Todas as origens</option><option value="proposal">Proposta aceita</option><option value="manual">Manual</option></select>
              <select name="clientId" aria-label="Cliente" defaultValue={params.clientId ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Todos os clientes</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
              <select name="responsibleMemberId" aria-label="Responsável" defaultValue={params.responsibleMemberId ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Todos os responsáveis</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
              <input type="date" name="de" aria-label="Data inicial" defaultValue={params.de ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" /><input type="date" name="ate" aria-label="Data final" defaultValue={params.ate ?? ""} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" />
              <select name="sort" aria-label="Ordenar por" defaultValue={params.sort ?? "created_at"} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="created_at">Mais recentes</option><option value="updated_at">Atualização</option><option value="total_amount_cents">Valor</option><option value="service_description">Nome</option><option value="status">Status</option></select>
              <select name="direction" aria-label="Direção" defaultValue={params.direction ?? "desc"} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select>
              <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="arquivados" value="1" defaultChecked={params.arquivados === "1"} />Incluir arquivados</label><button type="submit" className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Filtrar</button>
            </form>

            {overview.overdueAmountCents > 0 ? (
              <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Existem parcelas vencidas. Use Recebimentos para registrar pagamentos e regularizar a carteira.
              </div>
            ) : null}

            {overview.contracts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhum contrato cadastrado ainda.</p>
                <p className="mt-1 text-sm text-muted-foreground">Crie um contrato para gerar parcelas e acompanhar honorários.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Primeiro vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="max-w-sm font-medium">{contract.serviceDescription}</div>
                        <div className="text-xs text-muted-foreground">
                          {contract.legalCaseTitle ?? "Sem processo vinculado"} · {contract.paymentMethod ?? "Forma não informada"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link className="underline-offset-4 hover:underline" href={`/clientes/${contract.clientId}`}>
                          {contract.clientName ?? "Cliente"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>{formatCurrencyFromCents(contract.totalAmountCents)}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrencyFromCents(contract.paidAmountCents)} pago</div>
                      </TableCell>
                      <TableCell>
                        <div>{contract.installmentsCount} parcela(s)</div>
                        <div className="text-xs text-muted-foreground">{contract.openInstallments} em aberto</div>
                      </TableCell>
                      <TableCell>{contract.firstDueDate ? formatDate(contract.firstDueDate) : "Não informado"}</TableCell>
                      <TableCell>
                        <StatusBadge value={contract.status} />
                      </TableCell>
                      <TableCell>{contract.sourceProposalTitle ? `Proposta: ${contract.sourceProposalTitle}` : "Manual"}{contract.activeVersionNumber ? <div className="text-xs text-muted-foreground">Versão {contract.activeVersionNumber}</div> : null}</TableCell>
                      <TableCell>{contract.responsibleMemberName ?? "Não atribuído"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} basePath={paginationPath} totalRecords={overview.totalCount} />
        )}
      </div>
    </AppShell>
  );
}
