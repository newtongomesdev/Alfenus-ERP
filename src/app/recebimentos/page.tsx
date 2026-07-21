import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ReversePaymentButton } from "@/components/reverse-payment-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { getReceivablesOverview } from "@/lib/receivables/queries";

import { RecebimentosClient } from "./recebimentos-client";

function RecebivablesUnavailable({ status }: { status: string }) {
  const message = status === "missing-env" ? "Configure o Supabase no .env.local para carregar recebimentos reais." : status === "signed-out" ? "Entre para acessar recebimentos e pagamentos." : "Crie o primeiro escritório antes de acessar o financeiro.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  return <AppShell memberName={null}><div className="space-y-6"><PageHeader title="Recebimentos" description="Acompanhe parcelas, pagamentos e inadimplência." /><Card className="rounded-lg border-dashed"><CardContent className="flex items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">{message}</p>{status !== "missing-env" ? <Link href={href} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">{status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link> : null}</CardContent></Card></div></AppShell>;
}

function RecebivablesLoadError() {
  return <AppShell memberName={null}><div className="space-y-6"><PageHeader title="Recebimentos" description="Acompanhe parcelas, pagamentos e inadimplência." /><Card className="rounded-lg border-destructive/30"><CardContent className="flex items-start gap-3 p-6"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="font-medium">Não foi possível carregar os recebimentos.</p><p className="mt-1 text-sm text-muted-foreground">Confira se as migrations financeiras foram aplicadas no Supabase e tente novamente.</p><Link href="/recebimentos" className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Tentar novamente</Link></div></CardContent></Card></div></AppShell>;
}

export default async function RecebivablesPage({ searchParams }: { searchParams: Promise<{ registrado?: string; cobranca?: string; erro?: string; msg?: string; estornado?: string; duplicado?: string; page?: string; de?: string; ate?: string; status?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <RecebivablesUnavailable status={context.status} />;

  let overview;
  try {
    overview = await getReceivablesOverview(context.lawFirm.id, page, PAGE_SIZE);
  } catch (error) {
    console.error("[recebimentos] falha ao carregar recebíveis", { error: String(error), lawFirmId: context.lawFirm.id });
    return <RecebivablesLoadError />;
  }
  const canRegister = can(context.member.role, "pagamentos.registrar");

  // Apply filters
  let filteredInstallments = overview.installments;
  if (params.de) {
    filteredInstallments = filteredInstallments.filter((item) => item.dueDate >= params.de!);
  }
  if (params.ate) {
    filteredInstallments = filteredInstallments.filter((item) => item.dueDate <= params.ate!);
  }
  if (params.status) {
    filteredInstallments = filteredInstallments.filter((item) => item.displayStatus === params.status);
  }

  const openInstallments = overview.installments.filter((item) => item.remainingAmountCents > 0);
  const filteredTotalPages = Math.max(1, Math.ceil(filteredInstallments.length / PAGE_SIZE));
  const paginatedInstallments = filteredInstallments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build current filter URL for maintaining state across pagination
  const filterParts: string[] = [];
  if (params.de) filterParts.push(`de=${encodeURIComponent(params.de)}`);
  if (params.ate) filterParts.push(`ate=${encodeURIComponent(params.ate)}`);
  if (params.status) filterParts.push(`status=${encodeURIComponent(params.status)}`);
  const basePath = `/recebimentos?${filterParts.join("&")}`;

  return <AppShell memberName={context.member.name}><div className="space-y-6">
    <PageHeader
      title="Recebimentos"
      description="Registre pagamentos e acompanhe o saldo de cada parcela."
      actions={<div className="flex gap-2"><Link href="/recebimentos/nova" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">Nova cobrança</Link><Link href="/contratos/novo" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted">Novo contrato</Link></div>}
    />
    {params.registrado ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> Pagamento registrado e parcela atualizada.</CardContent></Card> : null}
    {params.cobranca ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> Cobrança criada e pronta para acompanhamento.</CardContent></Card> : null}
    {params.estornado ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> Pagamento estornado com sucesso.</CardContent></Card> : null}
    {params.erro ? <Card className="rounded-lg border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{params.erro === "permissao" ? "Você não tem permissão para registrar pagamentos." : params.erro === "permissao_rpc" ? "Permissão negada pelo servidor. Verifique seu papel no escritório." : params.erro === "parcela_nao_encontrada" ? "Parcela não encontrada. Verifique se ela ainda está disponível." : params.erro === "saldo_insuficiente" ? "O valor informado excede o saldo da parcela." : params.erro === "nao_autenticado" ? "Sessão expirada. Faça login novamente." : params.erro === "validacao" ? "Dados inválidos. Verifique os campos preenchidos." : params.erro === "ambiente" ? "Configuração do Supabase indisponível. Contate o administrador." : params.msg ? `Erro ao registrar pagamento: ${decodeURIComponent(params.msg)}` : "Não foi possível registrar o pagamento. Confira o valor, a permissão e a configuração do Supabase."}</CardContent></Card> : null}
    {params.duplicado ? <Card className="rounded-lg border-[var(--chart-3)]/30 bg-[var(--chart-3)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><AlertTriangle className="size-4" /> Pagamento duplicado detectado. Já existe um pagamento com o mesmo valor e data para esta parcela.</CardContent></Card> : null}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Previsto" value={overview.expectedAmountCents} format="currency" detail="Parcelas cadastradas" />
      <MetricCard label="Recebido" value={overview.receivedAmountCents} format="currency" detail="Valores já pagos" />
      <MetricCard label="Em aberto" value={overview.openAmountCents} format="currency" detail="Saldo a receber" />
      <MetricCard label="Vencido" value={overview.overdueAmountCents} format="currency" detail="Saldo em atraso" />
    </section>
    {overview.overdueAmountCents > 0 ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Há parcelas vencidas que precisam de acompanhamento.</div> : null}
    <Card className="rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Refine a busca por data de vencimento ou status.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="filterDe">Vencimento a partir de</Label>
            <Input id="filterDe" name="de" type="date" defaultValue={params.de ?? ""} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterAte">Vencimento até</Label>
            <Input id="filterAte" name="ate" type="date" defaultValue={params.ate ?? ""} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterStatus">Status</Label>
            <select id="filterStatus" name="status" defaultValue={params.status ?? ""} className="flex h-9 min-w-32 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="atrasada">Atrasada</option>
              <option value="parcialmente_paga">Parcialmente paga</option>
            </select>
          </div>
          <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
            Filtrar
          </button>
          {(params.de || params.ate || params.status) ? (
            <Link href="/recebimentos" className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted">
              Limpar
            </Link>
          ) : null}
        </form>
      </CardContent>
    </Card>

    <RecebimentosClient 
      paginatedInstallments={paginatedInstallments}
      openInstallments={openInstallments}
      filteredCount={filteredInstallments.length}
      totalCount={overview.installments.length}
      canRegister={canRegister}
    />

    <Pagination currentPage={page} totalPages={filteredTotalPages} basePath={basePath} totalRecords={filteredInstallments.length} />
  </div></AppShell>;
}
