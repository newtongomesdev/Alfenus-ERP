import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { LeadsTableWrapper } from "@/components/leads-table-wrapper";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAppContext } from "@/lib/auth/context";
import { formatCurrencyFromCents, formatDate, formatDateTime } from "@/lib/formatters";
import { getLeads } from "@/lib/leads/queries";

function LeadsUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar leads reais."
      : status === "signed-out"
        ? "Entre para acessar os leads do escritório."
        : "Crie o primeiro escritório antes de cadastrar leads.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Leads" description="Captação, qualificação e conversão de oportunidades em clientes." />
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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; convertido?: string; erro?: string; q?: string; page?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <LeadsUnavailable status={context.status} />;
  }

  const { items: leads, totalCount } = await getLeads(context.lawFirm.id, params.q, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = params.q ? `/leads?q=${encodeURIComponent(params.q)}` : "/leads";

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Leads"
          description="Captação, qualificação e conversão de oportunidades em clientes."
          actions={
            <Link
              href="/leads/novo"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              <Plus className="size-4" />
              Novo lead
            </Link>
          }
        />

        {params.criado || params.convertido ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              {params.convertido ? "Lead convertido em cliente com sucesso." : "Lead criado com sucesso."}
            </CardContent>
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
            <CardTitle>Pipeline inicial</CardTitle>
            <CardDescription>Leads do escritório, página {page} de {totalPages}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={params.q ?? ""} className="pl-9 pr-20" placeholder="Buscar por nome, telefone ou interesse" />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted">Buscar</button>
            </form>

            {leads.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhum lead cadastrado ainda.</p>
                <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro lead para iniciar o pipeline comercial.</p>
              </div>
            ) : (
              <LeadsTableWrapper
                leads={leads.map((l) => ({
                  id: l.id,
                  name: l.name,
                  interest: l.interest,
                  source: l.source,
                  funnelStage: l.funnelStage,
                  estimatedValueCents: l.estimatedValueCents,
                  nextContactAt: l.nextContactAt,
                  status: l.status,
                  convertedClientId: l.convertedClientId,
                  whatsapp: l.whatsapp,
                  phone: l.phone,
                  email: l.email,
                  createdAt: l.createdAt,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} totalRecords={totalCount} />
      </div>
    </AppShell>
  );
}
