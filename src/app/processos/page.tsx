import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { archiveProcessAction } from "@/app/processos/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { getProcesses } from "@/lib/processes/queries";

function ProcessesUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar processos reais."
      : status === "signed-out"
        ? "Entre para acessar os processos do escritório."
        : "Crie o primeiro escritório antes de cadastrar processos.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Processos" description="Gestão de processos judiciais e casos extrajudiciais." />
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

export default async function ProcessesPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; arquivado?: string; erro?: string; q?: string; page?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <ProcessesUnavailable status={context.status} />;
  }

  const { items: processes, totalCount } = await getProcesses(context.lawFirm.id, params.q, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = params.q ? `/processos?q=${encodeURIComponent(params.q)}` : "/processos";
  const canArchive = can(context.member.role, "processos.editar");

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Processos"
          description="Gestão de processos judiciais e casos extrajudiciais vinculados a clientes."
          actions={
            <Link
              href="/processos/novo"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              <Plus className="size-4" />
              Novo processo
            </Link>
          }
        />

        {params.criado || params.arquivado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">{params.arquivado ? "Processo arquivado com sucesso." : "Processo criado com sucesso."}</CardContent>
          </Card>
        ) : null}

        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Não foi possível concluir a operação. Verifique permissões e configuração do Supabase.
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Base processual</CardTitle>
            <CardDescription>Últimos 50 processos e casos do tenant ativo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={params.q ?? ""} className="pl-9 pr-20" placeholder="Buscar por cliente, número ou tipo de ação" />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted">Buscar</button>
            </form>

            {processes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhum processo cadastrado ainda.</p>
                <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro processo vinculado a um cliente.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    {canArchive ? <TableHead className="text-right">Ação</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.actionType ?? "Tipo não informado"} · {item.caseKind === "extrajudicial" ? "Extrajudicial" : "Judicial"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.clientId ? (
                          <Link className="underline-offset-4 hover:underline" href={`/clientes/${item.clientId}`}>
                            {item.clientName ?? "Cliente"}
                          </Link>
                        ) : (
                          "Não vinculado"
                        )}
                      </TableCell>
                      <TableCell>{item.caseNumber ?? "Não informado"}</TableCell>
                      <TableCell>
                        {[item.court, item.district, item.state].filter(Boolean).join(" · ") || "Não informado"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={item.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={item.status} />
                      </TableCell>
                      {canArchive ? <TableCell className="text-right"><ConfirmSubmitButton formId={`archive-process-form-${item.id}`} title="Arquivar processo" description="Tem certeza que deseja arquivar este processo? Esta ação não pode ser desfeita." confirmLabel="Arquivar" className="text-xs font-medium underline-offset-4 hover:underline">Arquivar</ConfirmSubmitButton><form id={`archive-process-form-${item.id}`} action={archiveProcessAction} className="hidden"><input type="hidden" name="processId" value={item.id} /></form></TableCell> : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={() => {}} basePath={basePath} totalRecords={totalCount} />
      </div>
    </AppShell>
  );
}
