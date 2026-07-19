import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveProcessAction } from "@/app/processos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { ProcessDocumentActions } from "@/components/process-document-actions";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { getLegalCaseWorkspace } from "@/lib/legal-case/queries";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ApplyWorkflowDialog } from "@/components/apply-workflow-dialog";
import { CommentSection } from "@/components/comment-section";
import { ProcessChecklist } from "@/components/process-checklist";
import { CaseCosts } from "@/components/case-costs";
import { PowersOfAttorney } from "@/components/powers-of-attorney";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyFromCents, formatDateTime, formatDate } from "@/lib/formatters";
import { getActivityEvents } from "@/lib/timeline/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { addCaseCollaboratorAction, addCaseMovementAction, addCasePartyAction } from "./actions";

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{message}</div>;
}

export default async function LegalCaseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string; erro?: string }> }) {
  const { id } = await params; const query = await searchParams; const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <AppShell memberName={null}><PageHeader title="Processo" description="Detalhes processuais." /><Card className="rounded-lg border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">Entre para acessar este processo.</CardContent></Card></AppShell>;
  const workspace = await getLegalCaseWorkspace(context.lawFirm.id, id); if (!workspace) notFound();
  const { events: activityEvents } = await getActivityEvents(context.lawFirm.id, { entityType: "legal_case", entityId: id, page: 1, limit: 100 });

  // Fetch workflow templates for this firm
  const supabase = await getSupabaseServerClient();
  let workflowTemplates: Array<{ id: string; name: string; description: string | null; itemCount: number }> = [];
  if (supabase) {
    const { data: templates } = await supabase
      .from("workflow_templates")
      .select("id, name, description, workflow_template_items(id)")
      .eq("law_firm_id", context.lawFirm.id)
      .order("name");
    workflowTemplates = (templates ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      itemCount: Array.isArray(t.workflow_template_items) ? t.workflow_template_items.length : 0,
    }));
  }

  const item = workspace.case;
  const fin = workspace.financialSummary;
  return <AppShell memberName={context.member.name}><div className="space-y-6"><Link href="/processos" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Voltar para processos</Link><PageHeader title={String(item.title)} description={`${String(item.action_type ?? "Caso jurídico")} · ${String(item.case_number ?? "Extrajudicial")}`} actions={<><PrintButton /><StatusBadge value={String(item.status)} />{workflowTemplates.length > 0 && <ApplyWorkflowDialog caseId={id} templates={workflowTemplates} members={workspace.members.map((m) => ({ id: m.id, name: m.name }))} currentMemberId={context.member!.id} />}<Link href={`/processos/${id}/editar`} className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted">Editar</Link><ConfirmSubmitButton formId="archive-process-form" title="Arquivar processo" description="Tem certeza que deseja arquivar este processo? Esta ação não pode ser desfeita." confirmLabel="Arquivar" className="inline-flex h-8 items-center justify-center rounded-lg border border-destructive/30 px-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10">Arquivar</ConfirmSubmitButton><form id="archive-process-form" action={archiveProcessAction} className="hidden"><input type="hidden" name="processId" value={id} /></form></>} />{query.salvo ? <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5"><CardContent className="p-4 text-sm">Alteração salva com sucesso.</CardContent></Card> : null}

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="procuracoes">Procurações</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-2">
          <CardHeader><CardTitle>Movimentações</CardTitle><CardDescription>Histórico cronológico do processo.</CardDescription></CardHeader>
          <CardContent className="space-y-4">{workspace.movements.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm">Nenhuma movimentação registrada.</div> : workspace.movements.map((movement) => <div key={String(movement.id)} className="border-l-2 border-primary/30 pl-4"><p className="font-medium">{String(movement.title)}</p><p className="text-sm text-muted-foreground">{String(movement.description ?? "")}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(String(movement.occurred_at))}</p></div>)}<form action={addCaseMovementAction} className="grid gap-3 border-t pt-4"><input type="hidden" name="caseId" value={id} /><Label htmlFor="movementTitle">Nova movimentação</Label><Input id="movementTitle" name="title" placeholder="Ex.: Protocolo de petição" required /><Input name="occurredAt" type="datetime-local" required /><textarea name="description" rows={2} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" placeholder="Descrição da movimentação" /><button type="submit" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Adicionar movimentação</button></form></CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Partes</CardTitle><CardDescription>Partes relacionadas ao caso.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{workspace.parties.map((party) => <div key={String(party.id)} className="border-b pb-2 last:border-0"><p className="font-medium">{String(party.name)}</p><p className="text-xs text-muted-foreground">{String(party.party_role)}{party.document ? ` · ${String(party.document)}` : ""}</p></div>)}<form action={addCasePartyAction} className="space-y-3 border-t pt-3"><input type="hidden" name="caseId" value={id} /><Input name="name" placeholder="Nome da parte" required /><Input name="partyRole" placeholder="Autor, réu, interessado" required /><Input name="document" placeholder="CPF/CNPJ" /><Input name="contact" placeholder="Contato" /><button type="submit" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Adicionar parte</button></form></CardContent>
        </Card>
      </section>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Colaboradores</CardTitle><CardDescription>Membros que acompanham este processo.</CardDescription></CardHeader>
        <CardContent><div className="mb-4 flex flex-wrap gap-2">{workspace.collaborators.map((collaborator) => <span key={String(collaborator.id)} className="rounded-lg border px-2.5 py-1 text-sm">{String((collaborator.member as { name?: string } | null)?.name ?? "Membro")} · {String(collaborator.collaborator_role ?? "Colaborador")}</span>)}</div><form action={addCaseCollaboratorAction} className="flex flex-col gap-3 sm:flex-row"><input type="hidden" name="caseId" value={id} /><select name="memberId" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" required><option value="">Adicionar membro</option>{workspace.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><Input name="collaboratorRole" placeholder="Papel no processo" /><button type="submit" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Adicionar colaborador</button></form></CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Resumo Financeiro</CardTitle><CardDescription>Visão consolidada dos valores dos contratos vinculados a este processo.</CardDescription></CardHeader>
        <CardContent>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Total do contrato</p><p className="mt-1 text-xl font-semibold">{formatCurrencyFromCents(fin.totalContractAmountCents)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Total pago</p><p className="mt-1 text-xl font-semibold">{formatCurrencyFromCents(fin.totalPaidCents)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Saldo devedor</p><p className="mt-1 text-xl font-semibold">{formatCurrencyFromCents(fin.totalPendingCents)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Parcelas em atraso</p><p className="mt-1 text-xl font-semibold">{fin.totalOverdueInstallments}</p>{fin.totalOverdueCents > 0 ? <p className="mt-0.5 text-xs text-destructive">{formatCurrencyFromCents(fin.totalOverdueCents)} em atraso</p> : null}</div>
          </section>
          {workspace.contracts.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum contrato vinculado a este processo.</p> : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Tarefas vinculadas</CardTitle><CardDescription>Tarefas associadas a este processo.</CardDescription></CardHeader>
          <CardContent>{workspace.tasks.length === 0 ? <EmptyState message="Nenhuma tarefa vinculada a este processo." /> : <div className="space-y-3">{workspace.tasks.map((task) => <div key={task.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"><div className="min-w-0"><p className="font-medium">{task.title}</p>{task.description ? <p className="truncate text-xs text-muted-foreground">{task.description}</p> : null}<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{task.responsibleName ? <span>Responsável: {task.responsibleName}</span> : null}{task.dueAt ? <span>Vence: {formatDateTime(task.dueAt)}</span> : null}</div></div><div className="flex items-center gap-2"><StatusBadge value={task.isOverdue ? "vencido" : task.priority} /></div></div>)}</div>}</CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader><CardTitle>Prazos vinculados</CardTitle><CardDescription>Prazos jurídicos associados a este processo.</CardDescription></CardHeader>
          <CardContent>{workspace.deadlines.length === 0 ? <EmptyState message="Nenhum prazo vinculado a este processo." /> : <div className="space-y-3">{workspace.deadlines.map((deadline) => <div key={deadline.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"><div className="min-w-0"><p className="font-medium">{deadline.title}</p><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span>{deadline.type}</span><span>Vence: {formatDate(deadline.dueDate)}</span>{deadline.dueTime ? <span>às {deadline.dueTime}</span> : null}</div>{deadline.description ? <p className="mt-1 truncate text-xs text-muted-foreground">{deadline.description}</p> : null}</div><div className="flex items-center gap-2"><StatusBadge value={deadline.isOverdue ? "vencido" : deadline.priority} /></div></div>)}</div>}</CardContent>
        </Card>
      </section>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Contratos vinculados</CardTitle><CardDescription>Contratos de honorários associados a este processo.</CardDescription></CardHeader>
        <CardContent>{workspace.contracts.length === 0 ? <EmptyState message="Nenhum contrato vinculado a este processo." /> : <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Valor total</TableHead><TableHead>Pago</TableHead><TableHead>Pendente</TableHead><TableHead>Parcelas</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{workspace.contracts.map((contract) => <TableRow key={contract.id}><TableCell><p className="font-medium">{contract.serviceDescription}</p><p className="text-xs text-muted-foreground">{contract.paymentMethod ?? "Não informado"}</p></TableCell><TableCell>{formatCurrencyFromCents(contract.totalAmountCents)}</TableCell><TableCell>{formatCurrencyFromCents(contract.paidAmountCents)}</TableCell><TableCell>{formatCurrencyFromCents(contract.pendingAmountCents)}</TableCell><TableCell>{contract.installmentsCount}x</TableCell><TableCell><StatusBadge value={contract.status} /></TableCell></TableRow>)}</TableBody></Table>}</CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Financeiro</CardTitle><CardDescription>Pagamentos registrados para o cliente deste processo.</CardDescription></CardHeader>
        <CardContent>{workspace.payments.length === 0 ? <EmptyState message="Nenhum pagamento registrado para este cliente." /> : <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Forma</TableHead><TableHead>Observações</TableHead></TableRow></TableHeader><TableBody>{workspace.payments.map((payment) => <TableRow key={payment.id}><TableCell>{formatDate(payment.paidAt)}</TableCell><TableCell>{formatCurrencyFromCents(payment.amountCents)}</TableCell><TableCell><StatusBadge value={payment.paymentMethod} /></TableCell><TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{payment.notes ?? "-"}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Documentos vinculados</CardTitle><CardDescription>Documentos anexados a este processo.</CardDescription></CardHeader>
        <CardContent>{workspace.documents.length === 0 ? <EmptyState message="Nenhum documento vinculado a este processo." /> : <div className="space-y-2">{workspace.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0"><div className="min-w-0"><p className="font-medium">{doc.name}</p><p className="text-xs text-muted-foreground">{doc.mimeType ?? "Tipo desconhecido"} · {doc.sizeBytes > 0 ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : ""} · {formatDateTime(doc.createdAt)}</p></div><ProcessDocumentActions documentId={doc.id} documentName={doc.name} /></div>)}</div>}</CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="checklist">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Checklist do Processo</CardTitle><CardDescription>Itens a serem verificados e concluídos.</CardDescription></CardHeader>
            <CardContent>
              <ProcessChecklist processId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Custos do Processo</CardTitle><CardDescription>Despesas e custas judiciais associadas a este processo.</CardDescription></CardHeader>
            <CardContent>
              <CaseCosts processId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procuracoes">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Procurações</CardTitle><CardDescription>Procurações e poderes de representação vinculados a este processo.</CardDescription></CardHeader>
            <CardContent>
              <PowersOfAttorney caseId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Timeline</CardTitle><CardDescription>Histórico de atividades deste processo.</CardDescription></CardHeader>
            <CardContent>
              <ActivityTimeline events={activityEvents} emptyMessage="Nenhuma atividade registrada para este processo." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comentarios">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Comentários</CardTitle><CardDescription>Discussões e anotações sobre este processo.</CardDescription></CardHeader>
            <CardContent>
              <CommentSection entityType="legal_case" entityId={id} currentMemberId={context.member.id} currentMemberName={context.member.name} />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div></AppShell>;
}
