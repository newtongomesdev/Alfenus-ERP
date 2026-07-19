import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { ClientsTableWrapper } from "@/components/clients-table-wrapper";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAppContext } from "@/lib/auth/context";
import { getClients } from "@/lib/clients/queries";

function ClientsUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar clientes reais."
      : status === "signed-out"
        ? "Entre para acessar os clientes do escritório."
        : "Crie o primeiro escritório antes de cadastrar clientes.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Clientes" description="Cadastro completo e separado de contratos, processos e financeiro." />
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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; q?: string; page?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <ClientsUnavailable status={context.status} />;
  }

  const { items: clients, totalCount } = await getClients(context.lawFirm.id, params.q, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = params.q ? `/clientes?q=${encodeURIComponent(params.q)}` : "/clientes";

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Clientes"
          description="Cadastro completo e separado de contratos, processos e financeiro."
          actions={
            <Link
              href="/clientes/novo"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              <Plus className="size-4" />
              Novo cliente
            </Link>
          }
        />

        {params.criado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">Cliente criado com sucesso.</CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Base de clientes</CardTitle>
            <CardDescription>Clientes ativos do tenant, página {page} de {totalPages}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={params.q ?? ""} className="pl-9 pr-20" placeholder="Buscar por nome, documento ou contato" />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted">Buscar</button>
            </form>

            {clients.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhum cliente cadastrado ainda.</p>
                <p className="mt-1 text-sm text-muted-foreground">Cadastre clientes sem misturar contrato, processo ou cobrança.</p>
              </div>
            ) : (
              <ClientsTableWrapper
                clients={clients.map((c) => ({
                  id: c.id,
                  name: c.name,
                  personType: c.personType,
                  document: c.document,
                  interestArea: c.interestArea,
                  source: c.source,
                  tags: c.tags,
                  status: c.status,
                  whatsapp: c.whatsapp,
                  phone: c.phone,
                  email: c.email,
                  createdAt: c.createdAt,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={() => {}} basePath={basePath} totalRecords={totalCount} />
      </div>
    </AppShell>
  );
}
