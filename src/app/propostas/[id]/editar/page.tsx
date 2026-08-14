import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { ProposalBuilder } from "@/components/proposals/proposal-builder";
import { requireProposalWriteAccess } from "@/lib/proposals/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseProposalRepository } from "@/lib/proposals/persistence/supabase-repository";
import type { ProposalVersionDraftDTO } from "@/lib/proposals/application/dto";
export const dynamic = "force-dynamic";

export default async function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const ctx = await requireProposalWriteAccess(); const client = await getSupabaseServerClient(); if (!client) notFound(); const role = ctx.member.role === "proprietario" ? "owner" : "lawyer"; const detail = await new SupabaseProposalRepository(client, role).detail(id); if (!detail) notFound(); if (detail.proposal.status === "archived") return notFound(); const version = detail.activeVersion; const draft: ProposalVersionDraftDTO = { title: version?.title ?? detail.proposal.title, currency: version?.currency ?? detail.proposal.currency, validityDays: null, summary: version?.commercialSummary ?? { currency: detail.proposal.currency, subtotalCents: 0, discountCents: 0, totalCents: 0, entryAmountCents: 0, installmentCount: 0, installmentAmountCents: 0, recurringAmountCents: 0, recurringMonths: 0, successFeeBps: 0 }, paymentTerms: version?.paymentTerms ?? {}, sections: detail.sections, items: detail.items }; return <AppShell memberName={ctx.member.name} isAuthenticated interfaceMode={ctx.lawFirm.interfaceMode}><div className="space-y-6"><PageHeader title={`Editar ${detail.proposal.title}`} description="Cada salvamento cria uma nova versão imutável." /><ProposalBuilder proposalId={id} expectedUpdatedAt={detail.proposal.updatedAt} draft={draft} canWrite activeVersionId={detail.proposal.activeVersionId} /></div></AppShell>; }
