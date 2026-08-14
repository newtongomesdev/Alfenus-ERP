import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Edit3, GitCompare } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DuplicateProposalAction } from "@/components/proposals/duplicate-proposal-action";
import { ProposalDetailActions } from "@/components/proposals/proposal-detail-actions";
import { ProposalDecisionInternalCard } from "@/components/proposals/proposal-decision-internal-card";
import { ConvertProposalAction } from "@/components/proposals/convert-proposal-action";
import { ProposalPublicLinkPanel } from "@/components/proposals/proposal-public-link-panel";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseProposalRepository } from "@/lib/proposals/persistence/supabase-repository";
import { getProposalPublicLinkStatus } from "@/lib/proposals/public-links";
import { getProposalDecisionReceiptService, getProposalDecisionService } from "@/lib/proposals/application/decision-services";

const statusLabels: Record<string, string> = { draft: "Rascunho", ready: "Pronta", sent: "Enviada", viewed: "Visualizada", accepted: "Aceita", rejected: "Recusada", expired: "Expirada", cancelled: "Cancelada", superseded: "Substituída", archived: "Arquivada" };

export default async function PropostaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status !== "ready" || !ctx.member || !ctx.lawFirm) redirect("/onboarding");
  const client = await getSupabaseServerClient();
  if (!client) notFound();
  const role = ctx.member.role === "proprietario" ? "owner" : ["assistente", "colaborador"].includes(ctx.member.role) ? "restricted" : "lawyer";
  const repository = new SupabaseProposalRepository(client, role);
  const detail = await repository.detail(id);
  if (!detail) notFound();
  const canWrite = ["proprietario", "administrador", "advogado"].includes(ctx.member.role);
  const events = await repository.events(id);
  const publicLinkStatus = canWrite ? await getProposalPublicLinkStatus(client, id) : null;
  const decision = await getProposalDecisionService(client, id, ctx.member.role);
  const receipt = decision ? await getProposalDecisionReceiptService(client, decision.decisionId, ctx.member.role) : null;
  const version = detail.activeVersion;

  return <AppShell memberName={ctx.member.name} isAuthenticated interfaceMode={ctx.lawFirm.interfaceMode}>
    <div className="space-y-6">
      <Link href="/propostas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Propostas</Link>
      <PageHeader title={detail.proposal.title} description={`${statusLabels[detail.proposal.status]} · ${detail.proposal.originType === "pricing_scenario" ? "Simulador" : "Manual"}`} actions={<div className="flex flex-wrap gap-2">
        {canWrite && detail.proposal.status !== "archived" && <Link href={`/propostas/${id}/editar`}><Button><Edit3 /> Editar</Button></Link>}
        {canWrite && detail.proposal.status !== "archived" && <DuplicateProposalAction proposalId={id} />}
        {canWrite && detail.proposal.status === "accepted" && <ConvertProposalAction proposalId={id} />}
        <Link href={`/propostas/${id}/comparar`}><Button variant="outline"><GitCompare /> Comparar</Button></Link>
        {detail.proposal.status === "archived" && canWrite ? <ProposalDetailActions proposalId={id} updatedAt={detail.proposal.updatedAt} action="restore" /> : canWrite ? <ProposalDetailActions proposalId={id} updatedAt={detail.proposal.updatedAt} action="archive" /> : null}
      </div>} />
      {decision && <ProposalDecisionInternalCard decision={decision} receipt={receipt} />}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Resumo comercial</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{statusLabels[detail.proposal.status]}</p></div>
            <div><p className="text-xs text-muted-foreground">Versão ativa</p><p className="font-medium">{version ? `v${version.versionNumber}` : "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Validade</p><p className="font-medium">{detail.proposal.validUntil ? new Date(detail.proposal.validUntil).toLocaleDateString("pt-BR") : "Não definida"}</p></div>
            {version && <><div><p className="text-xs text-muted-foreground">Subtotal</p><p>R$ {(version.commercialSummary.subtotalCents / 100).toFixed(2).replace(".", ",")}</p></div><div><p className="text-xs text-muted-foreground">Desconto</p><p>R$ {(version.commercialSummary.discountCents / 100).toFixed(2).replace(".", ",")}</p></div><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-semibold">R$ {(version.commercialSummary.totalCents / 100).toFixed(2).replace(".", ",")}</p></div></>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Seções e itens</CardTitle></CardHeader><CardContent className="space-y-3">
            {detail.sections.length ? detail.sections.map((section) => <div key={section.id} className="rounded-lg border p-3"><p className="font-medium">{section.title ?? section.sectionType}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{section.bodyMarkdown || "Sem conteúdo"}</p></div>) : <p className="text-sm text-muted-foreground">Nenhuma seção disponível.</p>}
            {detail.items.map((item) => <div key={item.id} className="flex items-center justify-between border-t pt-3 text-sm"><span>{item.description}</span><strong>R$ {(item.totalAmountCents / 100).toFixed(2).replace(".", ",")}</strong></div>)}
          </CardContent></Card>
          {canWrite && <ProposalPublicLinkPanel proposalId={id} proposalVersionId={version?.id ?? null} proposalStatus={detail.proposal.status} status={publicLinkStatus} />}
        </div>
        <aside className="space-y-5">
          <Card><CardHeader><CardTitle>Destinatários</CardTitle></CardHeader><CardContent>{detail.recipients.length ? detail.recipients.map((recipient) => <div key={recipient.id} className="border-b py-2 last:border-0"><p className="font-medium">{recipient.name}</p><p className="text-xs text-muted-foreground">{recipient.isPrimary ? "Principal" : recipient.recipientType}</p></div>) : <p className="text-sm text-muted-foreground">Nenhum destinatário.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Histórico de eventos</CardTitle></CardHeader><CardContent>{events.length ? <ol className="space-y-3">{events.map((event) => <li key={event.id} className="border-l-2 pl-3"><p className="text-sm font-medium">{event.eventType}</p><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}{event.proposalVersionId ? " · versão vinculada" : ""}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>}<Link className="mt-3 inline-block text-sm underline" href={`/propostas/${id}/comparar`}>Comparar versões</Link></CardContent></Card>
        </aside>
      </div>
    </div>
  </AppShell>;
}
