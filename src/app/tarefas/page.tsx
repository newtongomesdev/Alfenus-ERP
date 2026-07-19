import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
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
import { formatDateTime } from "@/lib/formatters";
import { getTaskOptions, getTasksOverview } from "@/lib/tasks/queries";

import { completeTaskAction, createTaskAction } from "./actions";

function Unavailable({ status }: { status: string }) {
  const message = status === "missing-env" ? "Configure o Supabase no .env.local para carregar tarefas reais." : status === "signed-out" ? "Entre para acessar as tarefas da equipe." : "Crie o primeiro escritório antes de organizar tarefas.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  return <AppShell memberName={null}><div className="space-y-6"><PageHeader title="Tarefas" description="Organize atividades internas, responsáveis e entregas." /><Card className="rounded-lg border-dashed"><CardContent className="flex items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">{message}</p>{status !== "missing-env" ? <Link href={href} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">{status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link> : null}</CardContent></Card></div></AppShell>;
}

const errors: Record<string, string> = { ambiente: "Configure o Supabase para salvar tarefas.", permissao: "Seu papel não tem permissão para gerenciar tarefas.", validacao: "Revise os campos obrigatórios da tarefa.", criacao: "Não foi possível criar a tarefa.", atualizacao: "Não foi possível concluir a tarefa." };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ criado?: string; concluido?: string; erro?: string; page?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <Unavailable status={context.status} />;

  const [overview, options] = await Promise.all([getTasksOverview(context.lawFirm.id, page, PAGE_SIZE), getTaskOptions(context.lawFirm.id)]);
  const canManage = can(context.member.role, "tarefas.gerenciar");
  const totalPages = Math.max(1, Math.ceil(overview.totalCount / PAGE_SIZE));

  return <AppShell memberName={context.member.name}><div className="space-y-6">
    <PageHeader title="Tarefas" description="Organize atividades internas, responsáveis e entregas." actions={canManage ? <a href="#nova-tarefa" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"><Plus className="size-4" /> Nova tarefa</a> : null} />
    {params.criado || params.concluido ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="flex items-center gap-2 p-4 text-sm"><CheckCircle2 className="size-4" /> {params.criado ? "Tarefa criada com sucesso." : "Tarefa concluída com sucesso."}</CardContent></Card> : null}
    {params.erro ? <Card className="rounded-lg border-destructive/30 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{errors[params.erro] ?? "Não foi possível concluir a operação."}</CardContent></Card> : null}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pendentes" value={overview.pendingCount} format="integer" detail="Atividades em aberto" /><MetricCard label="Vencidas" value={overview.overdueCount} format="integer" detail="Exigem atenção" /><MetricCard label="Urgentes" value={overview.urgentCount} format="integer" detail="Prioridade urgente" /><MetricCard label="Concluídas" value={overview.completedCount} format="integer" detail="Histórico do tenant" /></section>
    {overview.overdueCount > 0 ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Existem tarefas vencidas sem conclusão.</div> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-lg"><CardHeader><CardTitle>Atividades da equipe</CardTitle><CardDescription>Tarefas ordenadas pelo prazo de entrega.</CardDescription></CardHeader><CardContent>{overview.tasks.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">Nenhuma tarefa cadastrada.</p><p className="mt-1 text-sm text-muted-foreground">Crie uma tarefa para organizar o próximo passo do escritório.</p></div> : <Table><TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Vencimento</TableHead><TableHead>Responsável</TableHead><TableHead>Vínculo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead>{canManage ? <TableHead className="text-right">Ação</TableHead> : null}</TableRow></TableHeader><TableBody>{overview.tasks.map((task) => <TableRow key={task.id}><TableCell><div className="font-medium">{task.title}</div><div className="max-w-[240px] truncate text-xs text-muted-foreground">{task.description ?? "Sem descrição"}</div></TableCell><TableCell>{task.dueAt ? formatDateTime(task.dueAt) : "Sem prazo"}</TableCell><TableCell>{task.responsibleName ?? "Não atribuído"}</TableCell><TableCell><div>{task.clientName ?? "Sem cliente"}</div><div className="max-w-[180px] truncate text-xs text-muted-foreground">{task.legalCaseTitle ?? "Sem processo"}</div></TableCell><TableCell><StatusBadge value={task.priority} /></TableCell><TableCell><StatusBadge value={task.displayStatus} /></TableCell>{canManage ? <TableCell className="text-right">{!['concluido', 'cancelado'].includes(task.status) ? <form action={completeTaskAction}><input type="hidden" name="taskId" value={task.id} /><button type="submit" className="text-xs font-medium underline-offset-4 hover:underline">Concluir</button></form> : <span className="text-xs text-muted-foreground">Finalizada</span>}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      {canManage ? <Card id="nova-tarefa" className="rounded-lg"><CardHeader><CardTitle>Nova tarefa</CardTitle><CardDescription>Defina a entrega e o responsável pelo próximo passo.</CardDescription></CardHeader><CardContent><form action={createTaskAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" placeholder="Ex.: Solicitar documentos ao cliente" required /></div><div className="space-y-2"><Label htmlFor="description">Descrição</Label><textarea id="description" name="description" rows={3} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" placeholder="Explique o que precisa ser feito." /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="priority">Prioridade</Label><select id="priority" name="priority" defaultValue="normal" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div><div className="space-y-2"><Label htmlFor="dueAt">Entrega</Label><Input id="dueAt" name="dueAt" type="datetime-local" /></div></div><div className="space-y-2"><Label htmlFor="responsibleMemberId">Responsável</Label><select id="responsibleMemberId" name="responsibleMemberId" defaultValue={context.member.id} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">{options.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></div><div className="space-y-2"><Label htmlFor="clientId">Cliente</Label><select id="clientId" name="clientId" defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Sem cliente vinculado</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="legalCaseId">Processo ou caso</Label><select id="legalCaseId" name="legalCaseId" defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"><option value="">Sem processo vinculado</option>{options.legalCases.map((legalCase) => <option key={legalCase.id} value={legalCase.id}>{legalCase.title}</option>)}</select></div><button type="submit" className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">Salvar tarefa</button></form></CardContent></Card> : null}
    </div>
    <Pagination currentPage={page} totalPages={totalPages} basePath="/tarefas" totalRecords={overview.totalCount} />
  </div></AppShell>;
}
