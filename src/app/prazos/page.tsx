import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/formatters";
import { getDeadlineOptions, getDeadlinesOverview } from "@/lib/deadlines/queries";

import { completeDeadlineAction, createDeadlineAction } from "./actions";

function Unavailable({ status }: { status: string }) {
  const message = status === "missing-env" ? "Configure o Supabase no .env.local para carregar prazos reais." : status === "signed-out" ? "Entre para acessar os prazos jurídicos." : "Crie o primeiro escritório antes de controlar prazos.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  return <AppShell memberName={null}><div className="space-y-6"><PageHeader title="Prazos" description="Controle datas limite, prioridades e conclusão das atividades jurídicas." /><Card className="rounded-lg border-dashed"><CardContent className="flex items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">{message}</p>{status !== "missing-env" ? <Link href={href} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">{status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link> : null}</CardContent></Card></div></AppShell>;
}

const errorMessages: Record<string, string> = { ambiente: "Configure o Supabase para salvar prazos.", permissao: "Seu papel não tem permissão para esta operação.", validacao: "Revise os campos obrigatórios do prazo.", criacao: "Não foi possível criar o prazo.", atualizacao: "Não foi possível concluir o prazo." };

export default async function DeadlinesPage({ searchParams }: { searchParams: Promise<{ criado?: string; concluido?: string; erro?: string; page?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <Unavailable status={context.status} />;

  const [overview, options] = await Promise.all([getDeadlinesOverview(context.lawFirm.id, page, PAGE_SIZE), getDeadlineOptions(context.lawFirm.id)]);
  const canCreate = can(context.member.role, "prazos.criar");
  const canComplete = can(context.member.role, "prazos.concluir");
  const today = new Date().toISOString().slice(0, 10);
  const totalPages = Math.max(1, Math.ceil(overview.totalCount / PAGE_SIZE));

  return <AppShell memberName={context.member.name}><div className="space-y-6">
    <PageHeader title="Prazos" description="Controle datas limite, prioridades e conclusão das atividades jurídicas." actions={canCreate ? <a href="#novo-prazo" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"><Plus className="size-4" /> Novo prazo</a> : null} />
    {params.criado || params.concluido ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> {params.criado ? "Prazo criado com sucesso." : "Prazo concluído e retirado da pendência."}</CardContent></Card> : null}
    {params.erro ? <Card className="rounded-lg border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{errorMessages[params.erro] ?? "Não foi possível concluir a operação."}</CardContent></Card> : null}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pendentes" value={overview.pendingCount} format="integer" detail="Prazos em aberto" /><MetricCard label="Vencidos" value={overview.overdueCount} format="integer" detail="Exigem atenção" /><MetricCard label="Urgentes" value={overview.urgentCount} format="integer" detail="Prioridade urgente" /><MetricCard label="Concluídos" value={overview.completedCount} format="integer" detail="Histórico do tenant" /></section>
    {overview.overdueCount > 0 ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Existem prazos vencidos sem conclusão.</div> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-lg"><CardHeader><CardTitle>Agenda de prazos</CardTitle><CardDescription>Itens ordenados pela data limite mais próxima.</CardDescription></CardHeader><CardContent>{overview.deadlines.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">Nenhum prazo cadastrado.</p><p className="mt-1 text-sm text-muted-foreground">Cadastre um prazo para começar a acompanhar as entregas jurídicas.</p></div> : <Table><TableHeader><TableRow><TableHead>Prazo</TableHead><TableHead>Vencimento</TableHead><TableHead>Vínculo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead>{canComplete ? <TableHead className="text-right">Ação</TableHead> : null}</TableRow></TableHeader><TableBody>{overview.deadlines.map((deadline) => <TableRow key={deadline.id}><TableCell><div className="font-medium">{deadline.title}</div><div className="text-xs text-muted-foreground">{deadline.type}{deadline.dueTime ? ` · ${deadline.dueTime.slice(0, 5)}` : ""}</div></TableCell><TableCell><div>{formatDate(`${deadline.dueDate}T00:00:00`)}</div><DeadlineCountdown dueDate={deadline.dueDate} dueTime={deadline.dueTime} /></TableCell><TableCell><div>{deadline.clientName ?? "Sem cliente"}</div><div className="max-w-[220px] truncate text-xs text-muted-foreground">{deadline.legalCaseTitle ?? "Sem processo"}</div></TableCell><TableCell><StatusBadge value={deadline.priority} /></TableCell><TableCell><StatusBadge value={deadline.displayStatus} /></TableCell>{canComplete ? <TableCell className="text-right">{!['concluido', 'cancelado'].includes(deadline.status) ? <form action={completeDeadlineAction}><input type="hidden" name="deadlineId" value={deadline.id} /><button type="submit" className="text-xs font-medium underline-offset-4 hover:underline">Concluir</button></form> : <span className="text-xs text-muted-foreground">Finalizado</span>}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      {canCreate ? <Card id="novo-prazo" className="rounded-lg"><CardHeader><CardTitle>Novo prazo</CardTitle><CardDescription>Cadastre uma data limite e vincule-a ao contexto jurídico.</CardDescription></CardHeader><CardContent><form action={createDeadlineAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" placeholder="Ex.: Protocolar manifestação" required /></div><div className="space-y-2"><Label htmlFor="type">Tipo</Label><select id="type" name="type" defaultValue="prazo_processual" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="prazo_processual">Prazo processual</option><option value="documento">Documento</option><option value="cobranca">Cobrança</option><option value="administrativo">Administrativo</option><option value="outro">Outro</option></select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="dueDate">Data limite</Label><Input id="dueDate" name="dueDate" type="date" defaultValue={today} required /></div><div className="space-y-2"><Label htmlFor="dueTime">Horário</Label><Input id="dueTime" name="dueTime" type="time" /></div></div><div className="space-y-2"><Label htmlFor="priority">Prioridade</Label><select id="priority" name="priority" defaultValue="normal" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div><div className="space-y-2"><Label htmlFor="clientId">Cliente</Label><select id="clientId" name="clientId" defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Sem cliente vinculado</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="legalCaseId">Processo ou caso</Label><select id="legalCaseId" name="legalCaseId" defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Sem processo vinculado</option>{options.legalCases.map((legalCase) => <option key={legalCase.id} value={legalCase.id}>{legalCase.title}</option>)}</select></div><div className="space-y-2"><Label htmlFor="description">Descrição</Label><textarea id="description" name="description" rows={3} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" placeholder="Detalhes, documentos ou instruções para a equipe." /></div><button type="submit" className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">Salvar prazo</button></form></CardContent></Card> : null}
    </div>
    <Pagination currentPage={page} totalPages={totalPages} basePath="/prazos" totalRecords={overview.totalCount} />
  </div></AppShell>;
}
