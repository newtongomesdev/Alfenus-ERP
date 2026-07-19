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

import { registerPaymentAction } from "./actions";

function ReceivablesUnavailable({ status }: { status: string }) {
  const message = status === "missing-env" ? "Configure o Supabase no .env.local para carregar recebimentos reais." : status === "signed-out" ? "Entre para acessar recebimentos e pagamentos." : "Crie o primeiro escritório antes de acessar o financeiro.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  return <AppShell memberName={null}><div className="space-y-6"><PageHeader title="Recebimentos" description="Acompanhe parcelas, pagamentos e inadimplência." /><Card className="rounded-lg border-dashed"><CardContent className="flex items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">{message}</p>{status !== "missing-env" ? <Link href={href} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">{status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link> : null}</CardContent></Card></div></AppShell>;
}

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<{ registrado?: string; erro?: string; estornado?: string; duplicado?: string; page?: string; de?: string; ate?: string; status?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <ReceivablesUnavailable status={context.status} />;

  const overview = await getReceivablesOverview(context.lawFirm.id, page, PAGE_SIZE);
  const canRegister = can(context.member.role, "pagamentos.registrar");
  const today = new Date().toISOString().slice(0, 10);

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
  const filterQuery = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";
  const basePath = `/recebimentos?${filterParts.join("&")}`;

  return <AppShell memberName={context.member.name}><div className="space-y-6">
    <PageHeader title="Recebimentos" description="Registre pagamentos e acompanhe o saldo de cada parcela." />
    {params.registrado ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> Pagamento registrado e parcela atualizada.</CardContent></Card> : null}
    {params.estornado ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> Pagamento estornado com sucesso.</CardContent></Card> : null}
    {params.erro ? <Card className="rounded-lg border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">Não foi possível registrar o pagamento. Confira o valor, a permissão e a configuração do Supabase.</CardContent></Card> : null}
    {params.duplicado ? <Card className="rounded-lg border-[var(--chart-3)]/30 bg-[var(--chart-3)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><AlertTriangle className="size-4" /> Pagamento duplicado detectado. Já existe um pagamento com o mesmo valor e data para esta parcela.</CardContent></Card> : null}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Previsto" value={overview.expectedAmountCents} format="currency" detail="Parcelas cadastradas" />
      <MetricCard label="Recebido" value={overview.receivedAmountCents} format="currency" detail="Valores já pagos" />
      <MetricCard label="Em aberto" value={overview.openAmountCents} format="currency" detail="Saldo a receber" />
      <MetricCard label="Vencido" value={overview.overdueAmountCents} format="currency" detail="Saldo em atraso" />
    </section>
    {overview.overdueAmountCents > 0 ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Há parcelas vencidas que precisam de acompanhamento.</div> : null}
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Refine a busca por data de vencimento ou status.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="filterDe">Vencimento a partir de</Label>
            <Input id="filterDe" name="de" type="date" defaultValue={params.de ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterAte">Vencimento até</Label>
            <Input id="filterAte" name="ate" type="date" defaultValue={params.ate ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterStatus">Status</Label>
            <select id="filterStatus" name="status" defaultValue={params.status ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="atrasada">Atrasada</option>
              <option value="parcialmente_paga">Parcialmente paga</option>
            </select>
          </div>
          <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
            Filtrar
          </button>
          {(params.de || params.ate || params.status) ? (
            <Link href="/recebimentos" className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted">
              Limpar filtros
            </Link>
          ) : null}
        </form>
      </CardContent>
    </Card>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-lg"><CardHeader><CardTitle>Parcelas</CardTitle><CardDescription>Vencimentos e saldo por cliente, contrato e parcela. {filteredInstallments.length !== overview.installments.length ? `· ${filteredInstallments.length} resultado(s) filtrado(s) de ${overview.installments.length}` : ""}</CardDescription></CardHeader><CardContent>{paginatedInstallments.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">Nenhuma parcela encontrada.</p><p className="mt-1 text-sm text-muted-foreground">{filteredInstallments.length === 0 && overview.installments.length > 0 ? "Ajuste os filtros para ver resultados." : "Crie um contrato para gerar parcelas automaticamente."}</p></div> : <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Parcela</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{paginatedInstallments.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.clientName ?? "Cliente"}</div><div className="max-w-xs truncate text-xs text-muted-foreground">{item.contractDescription ?? "Contrato"}</div></TableCell><TableCell>#{item.number}<div className="text-xs text-muted-foreground">{formatCurrencyFromCents(item.remainingAmountCents)} em aberto</div></TableCell><TableCell>{formatDate(`${item.dueDate}T00:00:00`)}</TableCell><TableCell>{formatCurrencyFromCents(item.finalAmountCents)}<div className="text-xs text-muted-foreground">{formatCurrencyFromCents(item.paidAmountCents)} pago</div></TableCell><TableCell><StatusBadge value={item.displayStatus} /></TableCell><TableCell className="flex items-center gap-2"><Link href={`/recebimentos/recibo/${item.id}`} className="text-xs font-medium underline-offset-4 hover:underline">Recibo</Link>{(item.status === "pago" || item.status === "paga" || item.paidAmountCents > 0) && canRegister ? <ReversePaymentButton installmentId={item.id} /> : null}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      {canRegister ? <Card className="rounded-lg"><CardHeader><CardTitle>Registrar pagamento</CardTitle><CardDescription>Escolha a parcela e informe o recebimento.</CardDescription></CardHeader><CardContent><form action={registerPaymentAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="installmentId">Parcela</Label><select id="installmentId" name="installmentId" required className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Selecione uma parcela</option>{openInstallments.map((item) => <option key={item.id} value={item.id}>{item.clientName ?? "Cliente"} · #{item.number} · {formatCurrencyFromCents(item.remainingAmountCents)}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="amount">Valor recebido</Label><Input id="amount" name="amount" placeholder="R$ 0,00" required /></div><div className="space-y-2"><Label htmlFor="paidAt">Data do recebimento</Label><Input id="paidAt" name="paidAt" type="date" defaultValue={today} required /></div></div><div className="space-y-2"><Label htmlFor="paymentMethod">Forma de pagamento</Label><select id="paymentMethod" name="paymentMethod" required className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Selecione</option><option value="pix">Pix</option><option value="transferencia">Transferência</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="outro">Outro</option></select></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="discount">Desconto</Label><Input id="discount" name="discount" placeholder="R$ 0,00" /></div><div className="space-y-2"><Label htmlFor="fine">Multa</Label><Input id="fine" name="fine" placeholder="R$ 0,00" /></div><div className="space-y-2"><Label htmlFor="interest">Juros</Label><Input id="interest" name="interest" placeholder="R$ 0,00" /></div></div><div className="space-y-2"><Label htmlFor="notes">Observações</Label><Input id="notes" name="notes" placeholder="Ex.: comprovante recebido por WhatsApp" /></div><button type="submit" disabled={openInstallments.length === 0} className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50">Registrar pagamento</button></form></CardContent></Card> : null}
    </div>
    <Pagination currentPage={page} totalPages={filteredTotalPages} basePath={basePath} totalRecords={filteredInstallments.length} />
  </div></AppShell>;
}
