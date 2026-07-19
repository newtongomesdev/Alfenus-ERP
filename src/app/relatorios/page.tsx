import { Calendar, Download } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { getAppContext } from "@/lib/auth/context";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { getModuleOverview } from "@/lib/modules/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ de?: string; ate?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const dateFrom = params.de || "";
  const dateTo = params.ate || "";

  function periodLink(path: string) {
    const url = new URL(path, "http://localhost");
    if (dateFrom) url.searchParams.set("de", dateFrom);
    if (dateTo) url.searchParams.set("ate", dateTo);
    return `${url.pathname}${url.search}`;
  }

  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <AppShell memberName={null}><PageHeader title="Relatórios" description="Indicadores financeiros, jurídicos e de produtividade." /><Card className="rounded-lg border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">{context.status === "missing-env" ? "Configure o Supabase no .env.local para carregar relatórios reais." : <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>{context.status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link>}</CardContent></Card></AppShell>;
  }

  const overview = await getModuleOverview(context.lawFirm.id, "relatorios", context.member.id);

  // Fetch overdue installments with client info for "Relatório de Inadimplência"
  const supabase = await getSupabaseServerClient();
  let overdueInstallments: Array<{ id: string; clientName: string; contractDescription: string; number: number; finalAmountCents: number; paidAmountCents: number; dueDate: string; status: string }> = [];
  const clientFinancialSummaries: Array<{ clientName: string; totalContracts: number; totalPaidCents: number; totalPendingCents: number; overdueAmountCents: number }> = [];

  // Produtividade
  let tasksCompletedThisMonth = 0;
  let tasksCompletedTotal = 0;
  let deadlinesMet = 0;
  let deadlinesMissed = 0;
  let appointmentsHeld = 0;

  // Produtividade por membro
  let memberProductivity: Array<{ memberId: string; memberName: string; tasksCompleted: number; deadlinesMet: number; appointments: number }> = [];

  // Despesas por categoria
  let expensesByCategory: Array<{ category: string; count: number; totalCents: number }> = [];
  let totalExpensesCents = 0;
  let paidExpensesCents = 0;
  let pendingExpensesCents = 0;

  // Jurídico
  let casesByStatus: Array<{ status: string; count: number }> = [];
  let casesByType: Array<{ actionType: string; count: number }> = [];
  let casesByPriority: Array<{ priority: string; count: number }> = [];
  let averageCaseDurationDays = 0;

  if (supabase) {
    const today = new Date().toISOString().slice(0, 10);

    // Period filter boundaries
    const filterFrom = dateFrom ? `${dateFrom}T00:00:00` : null;
    const filterTo = dateTo ? `${dateTo}T23:59:59` : null;

    // Overdue installments
    const { data: overdueData } = await supabase
      .from("installments")
      .select("id, client_id, contract_id, number, final_amount_cents, paid_amount_cents, due_date, status")
      .eq("law_firm_id", context.lawFirm.id)
      .neq("status", "cancelada")
      .order("due_date", { ascending: true })
      .range(0, 9999);

    const overdueRows = (overdueData ?? []) as Array<{ id: string; client_id: string; contract_id: string; number: number; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;

    // Filter overdue: remaining > 0 and due_date < today
    const overdueFiltered = overdueRows.filter((row) => {
      const remaining = Math.max(row.final_amount_cents - row.paid_amount_cents, 0);
      return remaining > 0 && row.due_date < today;
    });

    // Get client and contract names
    const clientIds = Array.from(new Set(overdueFiltered.map((r) => r.client_id)));
    const contractIds = Array.from(new Set(overdueFiltered.map((r) => r.contract_id)));
    const [clientsResult, contractsResult] = await Promise.all([
      clientIds.length > 0 ? supabase.from("clients").select("id, name").eq("law_firm_id", context.lawFirm.id).in("id", clientIds) : Promise.resolve({ data: [], error: null }),
      contractIds.length > 0 ? supabase.from("contracts").select("id, service_description").eq("law_firm_id", context.lawFirm.id).in("id", contractIds) : Promise.resolve({ data: [], error: null }),
    ]);

    const clientNameMap = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]));
    const contractDescMap = new Map(((contractsResult.data ?? []) as Array<{ id: string; service_description: string }>).map((c) => [c.id, c.service_description]));

    overdueInstallments = overdueFiltered.map((row) => ({
      id: row.id,
      clientName: clientNameMap.get(row.client_id) ?? "Cliente",
      contractDescription: contractDescMap.get(row.contract_id) ?? "Contrato",
      number: row.number,
      finalAmountCents: row.final_amount_cents,
      paidAmountCents: row.paid_amount_cents,
      dueDate: row.due_date,
      status: row.status,
    }));

    // Client-wise financial summary — batch queries to avoid N+1
    const [allClientsResult, allContractsResult, allInstForSummaryResult] = await Promise.all([
      supabase.from("clients").select("id, name").eq("law_firm_id", context.lawFirm.id).is("archived_at", null).order("name", { ascending: true }).range(0, 9999),
      supabase.from("contracts").select("id, client_id").eq("law_firm_id", context.lawFirm.id).range(0, 9999),
      supabase.from("installments").select("contract_id, final_amount_cents, paid_amount_cents, due_date, status").eq("law_firm_id", context.lawFirm.id).neq("status", "cancelada").range(0, 9999),
    ]);

    const allClientRows = (allClientsResult.data ?? []) as Array<{ id: string; name: string }>;
    const allContractRows = (allContractsResult.data ?? []) as Array<{ id: string; client_id: string }>;
    const allInstRows = (allInstForSummaryResult.data ?? []) as Array<{ contract_id: string; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;

    // Index contracts by client_id
    const contractsByClient = new Map<string, string[]>();
    for (const c of allContractRows) {
      const list = contractsByClient.get(c.client_id) ?? [];
      list.push(c.id);
      contractsByClient.set(c.client_id, list);
    }

    // Index installments by contract_id
    const instByContract = new Map<string, Array<{ final_amount_cents: number; paid_amount_cents: number; due_date: string }>>();
    for (const inst of allInstRows) {
      const list = instByContract.get(inst.contract_id) ?? [];
      list.push(inst);
      instByContract.set(inst.contract_id, list);
    }

    for (const client of allClientRows) {
      const clientContractIds = contractsByClient.get(client.id) ?? [];
      if (clientContractIds.length === 0) continue;

      let totalPaid = 0;
      let totalPending = 0;
      let overdueAmount = 0;

      for (const cid of clientContractIds) {
        for (const inst of instByContract.get(cid) ?? []) {
          totalPaid += inst.paid_amount_cents;
          const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
          totalPending += remaining;
          if (remaining > 0 && inst.due_date < today) {
            overdueAmount += remaining;
          }
        }
      }

      if (totalPaid > 0 || totalPending > 0) {
        clientFinancialSummaries.push({
          clientName: client.name,
          totalContracts: clientContractIds.length,
          totalPaidCents: totalPaid,
          totalPendingCents: totalPending,
          overdueAmountCents: overdueAmount,
        });
      }
    }

    // ── Relatório de Produtividade ──────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Tasks completed (with period filter)
    let tasksQuery = supabase
      .from("tasks")
      .select("id, status, due_at, updated_at, responsible_member_id")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("status", "concluido");
    if (filterFrom) tasksQuery = tasksQuery.gte("updated_at", filterFrom);
    if (filterTo) tasksQuery = tasksQuery.lte("updated_at", filterTo);

    const { data: completedTasks } = await tasksQuery;
    const tasksRows = (completedTasks ?? []) as Array<{ id: string; status: string; due_at: string | null; updated_at: string; responsible_member_id: string | null }>;
    tasksCompletedTotal = tasksRows.length;
    tasksCompletedThisMonth = tasksRows.filter((t) => t.updated_at >= monthStart).length;

    // Deadlines: met vs missed (with period filter)
    let deadlinesQuery = supabase
      .from("deadlines")
      .select("id, status, due_date, completed_at, responsible_member_id")
      .eq("law_firm_id", context.lawFirm.id);
    if (filterFrom) deadlinesQuery = deadlinesQuery.gte("due_date", dateFrom);
    if (filterTo) deadlinesQuery = deadlinesQuery.lte("due_date", dateTo);

    const { data: allDeadlines } = await deadlinesQuery;
    const deadlineRows = (allDeadlines ?? []) as Array<{ id: string; status: string; due_date: string; completed_at: string | null; responsible_member_id: string | null }>;
    deadlinesMet = deadlineRows.filter((d) => d.status === "concluido" && d.completed_at && d.completed_at <= `${d.due_date}T23:59:59`).length;
    deadlinesMissed = deadlineRows.filter((d) => d.status !== "concluido" && d.due_date < today).length;

    // Appointments held (with period filter)
    let appointmentsQuery = supabase
      .from("appointments")
      .select("id, status, starts_at, responsible_member_id")
      .eq("law_firm_id", context.lawFirm.id);
    if (filterFrom) appointmentsQuery = appointmentsQuery.gte("starts_at", filterFrom);
    if (filterTo) appointmentsQuery = appointmentsQuery.lte("starts_at", filterTo);

    const { data: monthAppointments } = await appointmentsQuery;
    const appointmentRows = (monthAppointments ?? []) as Array<{ id: string; status: string; starts_at: string; responsible_member_id: string | null }>;
    appointmentsHeld = appointmentRows.filter((a) => a.status === "realizado" || a.status === "agendado").length;

    // ── Produtividade por Membro ─────────────────────────────────────
    const { data: activeMembers } = await supabase
      .from("law_firm_members")
      .select("id, name")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("status", "ativo")
      .order("name", { ascending: true });

    const members = (activeMembers ?? []) as Array<{ id: string; name: string }>;
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    // Aggregate per member from already-fetched data
    const prodMap = new Map<string, { tasksCompleted: number; deadlinesMet: number; appointments: number }>();
    for (const m of members) {
      prodMap.set(m.id, { tasksCompleted: 0, deadlinesMet: 0, appointments: 0 });
    }

    for (const t of tasksRows) {
      if (!t.responsible_member_id) continue;
      const entry = prodMap.get(t.responsible_member_id);
      if (entry) entry.tasksCompleted += 1;
    }

    for (const d of deadlineRows) {
      if (!d.responsible_member_id) continue;
      const entry = prodMap.get(d.responsible_member_id);
      if (entry && d.status === "concluido" && d.completed_at && d.completed_at <= `${d.due_date}T23:59:59`) {
        entry.deadlinesMet += 1;
      }
    }

    for (const a of appointmentRows) {
      if (!a.responsible_member_id) continue;
      const entry = prodMap.get(a.responsible_member_id);
      if (entry) entry.appointments += 1;
    }

    memberProductivity = members.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      tasksCompleted: prodMap.get(m.id)?.tasksCompleted ?? 0,
      deadlinesMet: prodMap.get(m.id)?.deadlinesMet ?? 0,
      appointments: prodMap.get(m.id)?.appointments ?? 0,
    }));

    // ── Despesas por Categoria ──────────────────────────────────────
    let expensesQuery = supabase
      .from("expenses")
      .select("id, category, amount_cents, status, due_date, paid_at")
      .eq("law_firm_id", context.lawFirm.id);
    if (filterFrom) expensesQuery = expensesQuery.gte("created_at", filterFrom);
    if (filterTo) expensesQuery = expensesQuery.lte("created_at", filterTo);

    const { data: expensesData } = await expensesQuery;
    const expenseRows = (expensesData ?? []) as Array<{ id: string; category: string | null; amount_cents: number; status: string; due_date: string | null; paid_at: string | null }>;

    const catMap = new Map<string, { count: number; totalCents: number }>();
    for (const e of expenseRows) {
      const cat = e.category || "Sem categoria";
      const existing = catMap.get(cat) ?? { count: 0, totalCents: 0 };
      existing.count += 1;
      existing.totalCents += e.amount_cents;
      catMap.set(cat, existing);
      totalExpensesCents += e.amount_cents;
      if (e.status === "paga") paidExpensesCents += e.amount_cents;
      else pendingExpensesCents += e.amount_cents;
    }
    expensesByCategory = Array.from(catMap.entries())
      .map(([category, data]) => ({ category, count: data.count, totalCents: data.totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents);

    // ── Relatório Jurídico ──────────────────────────────────────────
    const { data: allCases } = await supabase
      .from("legal_cases")
      .select("id, status, action_type, priority, started_at, created_at, updated_at")
      .eq("law_firm_id", context.lawFirm.id);
    const caseRows = (allCases ?? []) as Array<{ id: string; status: string; action_type: string | null; priority: string; started_at: string | null; created_at: string; updated_at: string }>;

    // Cases by status
    const statusMap = new Map<string, number>();
    for (const c of caseRows) {
      statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
    }
    casesByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

    // Cases by type
    const typeMap = new Map<string, number>();
    for (const c of caseRows) {
      const key = c.action_type ?? "Não informado";
      typeMap.set(key, (typeMap.get(key) ?? 0) + 1);
    }
    casesByType = Array.from(typeMap.entries()).map(([actionType, count]) => ({ actionType, count })).sort((a, b) => b.count - a.count);

    // Cases by priority
    const priorityMap = new Map<string, number>();
    for (const c of caseRows) {
      priorityMap.set(c.priority, (priorityMap.get(c.priority) ?? 0) + 1);
    }
    casesByPriority = Array.from(priorityMap.entries()).map(([priority, count]) => ({ priority, count }));

    // Average case duration (days from started_at to today, for closed cases)
    const closedCases = caseRows.filter((c) => c.status === "encerrado" && c.started_at);
    if (closedCases.length > 0) {
      const totalDays = closedCases.reduce((sum, c) => {
        const start = new Date(c.started_at!);
        const end = new Date(c.updated_at ?? now.toISOString());
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      averageCaseDurationDays = Math.round(totalDays / closedCases.length);
    }
  }

  const hasPeriodFilter = Boolean(dateFrom || dateTo);

  return <AppShell memberName={context.member.name}><div className="space-y-6"><PageHeader title="Relatórios" description="Indicadores consolidados para decisões financeiras e jurídicas." actions={<><PrintButton /><Link href="/api/relatorios/exportar" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Exportar CSV</Link></>} />

    {/* Filtro de período */}
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">De</label>
            <input type="date" name="de" defaultValue={dateFrom} className="h-8 rounded-md border border-border bg-background px-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <input type="date" name="ate" defaultValue={dateTo} className="h-8 rounded-md border border-border bg-background px-2 text-sm" />
          </div>
          <button type="submit" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">Filtrar</button>
          {hasPeriodFilter && <Link href="/relatorios" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Limpar</Link>}
        </form>
      </CardContent>
    </Card>

    {hasPeriodFilter && <p className="text-sm text-muted-foreground">Exibindo dados de {dateFrom || "início"} até {dateTo || "atual"}.</p>}

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{overview.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section><div className="grid gap-6 md:grid-cols-2"><Card className="rounded-lg"><CardHeader><CardTitle>Visão executiva</CardTitle><CardDescription>Leitura rápida da operação do tenant atual.</CardDescription></CardHeader><CardContent><div className="space-y-3 text-sm"><p>Use os indicadores para acompanhar a base ativa, oportunidades, processos e carteira financeira.</p><p className="text-muted-foreground">Os dados são consultados diretamente no Supabase e respeitam as permissões da sessão.</p></div></CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle>Exportação</CardTitle><CardDescription>Arquivo compatível com Excel e planilhas.</CardDescription></CardHeader><CardContent><Link href="/api/relatorios/exportar" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"><Download className="size-4" /> Baixar relatório atual</Link></CardContent></Card></div>

    {/* Relatório de Inadimplência */}
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Relatório de Inadimplência</CardTitle>
          <CardDescription>Parcelas vencidas com saldo em aberto, organizadas por cliente.</CardDescription>
        </div>
        <Link href={periodLink("/api/relatorios/inadimplencia")} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Baixar CSV</Link>
      </CardHeader>
      <CardContent>
        {overdueInstallments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma parcela em atraso.</p>
            <p className="mt-1 text-sm text-muted-foreground">Todos os pagamentos estão em dia.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueInstallments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{item.contractDescription}</TableCell>
                  <TableCell>#{item.number}</TableCell>
                  <TableCell>{formatDate(`${item.dueDate}T00:00:00`)}</TableCell>
                  <TableCell>{formatCurrencyFromCents(item.finalAmountCents)}</TableCell>
                  <TableCell>{formatCurrencyFromCents(item.paidAmountCents)}</TableCell>
                  <TableCell className="font-medium text-destructive">{formatCurrencyFromCents(Math.max(item.finalAmountCents - item.paidAmountCents, 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {/* Relatório por Cliente */}
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Relatório por Cliente</CardTitle>
          <CardDescription>Resumo financeiro consolidado por cliente, com contratos, valores pagos e pendentes.</CardDescription>
        </div>
        <Link href={periodLink("/api/relatorios/clientes")} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Baixar CSV</Link>
      </CardHeader>
      <CardContent>
        {clientFinancialSummaries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhum dado financeiro disponível.</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie contratos e registre pagamentos para gerar dados.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contratos</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Pendente</TableHead>
                <TableHead>Vencido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientFinancialSummaries.map((item) => (
                <TableRow key={item.clientName}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell>{item.totalContracts}</TableCell>
                  <TableCell>{formatCurrencyFromCents(item.totalPaidCents)}</TableCell>
                  <TableCell>{formatCurrencyFromCents(item.totalPendingCents)}</TableCell>
                  <TableCell className={item.overdueAmountCents > 0 ? "font-medium text-destructive" : ""}>
                    {item.overdueAmountCents > 0 ? formatCurrencyFromCents(item.overdueAmountCents) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {/* Despesas por Categoria */}
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Despesas agrupadas por categoria com totais e status de pagamento.</CardDescription>
        </div>
        <Link href={periodLink("/api/relatorios/despesas")} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Baixar CSV</Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total de despesas</p>
              <p className="text-2xl font-bold">{formatCurrencyFromCents(totalExpensesCents)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Despesas pagas</p>
              <p className="text-2xl font-bold text-[var(--chart-2)]">{formatCurrencyFromCents(paidExpensesCents)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Despesas pendentes</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrencyFromCents(pendingExpensesCents)}</p>
            </div>
          </div>
          {expensesByCategory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma despesa cadastrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">Registre despesas para visualizar o relatório.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByCategory.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">{formatCurrencyFromCents(item.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Relatório de Produtividade */}
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Relatório de Produtividade</CardTitle>
            <CardDescription>Tarefas concluídas, prazos cumpridos e compromissos realizados.</CardDescription>
          </div>
          <Link href={periodLink("/api/relatorios/produtividade")} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Baixar CSV</Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Tarefas concluídas (mês)</p>
                <p className="text-2xl font-bold">{tasksCompletedThisMonth}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Tarefas concluídas (total)</p>
                <p className="text-2xl font-bold">{tasksCompletedTotal}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Prazos cumpridos</p>
                <p className="text-2xl font-bold text-[var(--chart-2)]">{deadlinesMet}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Prazos perdidos</p>
                <p className="text-2xl font-bold text-destructive">{deadlinesMissed}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Compromissos realizados (mês)</p>
              <p className="text-2xl font-bold">{appointmentsHeld}</p>
            </div>
            {(tasksCompletedThisMonth > 0 || deadlinesMet > 0) && (
              <div className="text-xs text-muted-foreground">
                {deadlinesMet + deadlinesMissed > 0
                  ? `Taxa de cumprimento de prazos: ${Math.round((deadlinesMet / (deadlinesMet + deadlinesMissed)) * 100)}%`
                  : "Nenhum prazo registrado ainda."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Relatório Jurídico</CardTitle>
          <CardDescription>Processos por status, tipo, prioridade e duração média.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {casesByStatus.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Por status</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casesByStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell><StatusBadge value={item.status} /></TableCell>
                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {casesByType.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Por tipo de ação</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casesByType.map((item) => (
                      <TableRow key={item.actionType}>
                        <TableCell className="font-medium">{item.actionType}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {casesByPriority.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Por prioridade</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casesByPriority.map((item) => (
                      <TableRow key={item.priority}>
                        <TableCell><StatusBadge value={item.priority} /></TableCell>
                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {averageCaseDurationDays > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Duração média dos processos encerrados</p>
                <p className="text-2xl font-bold">{averageCaseDurationDays} dias</p>
              </div>
            )}

            {casesByStatus.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Nenhum processo cadastrado.</p>
                <p className="mt-1 text-sm text-muted-foreground">Crie processos para visualizar o relatório jurídico.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Produtividade por Membro */}
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Produtividade por Membro</CardTitle>
          <CardDescription>Desempenho individual da equipe: tarefas, prazos e compromissos.</CardDescription>
        </div>
        <Link href={periodLink("/api/relatorios/produtividade")} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"><Download className="size-4" /> Baixar CSV</Link>
      </CardHeader>
      <CardContent>
        {memberProductivity.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhum membro ativo.</p>
            <p className="mt-1 text-sm text-muted-foreground">Adicione membros à equipe para visualizar a produtividade.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead className="text-right">Tarefas concluídas</TableHead>
                <TableHead className="text-right">Prazos cumpridos</TableHead>
                <TableHead className="text-right">Compromissos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberProductivity.map((item) => (
                <TableRow key={item.memberId}>
                  <TableCell className="font-medium">{item.memberName}</TableCell>
                  <TableCell className="text-right">{item.tasksCompleted}</TableCell>
                  <TableCell className="text-right">{item.deadlinesMet}</TableCell>
                  <TableCell className="text-right">{item.appointments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

  </div></AppShell>;
}
