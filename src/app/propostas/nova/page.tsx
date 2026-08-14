import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireProposalWriteAccess } from "@/lib/proposals/access";
import { getActivePricingVersion, getPricingScenarioById, getPricingScenarioVersions } from "@/lib/pricing/queries";
import { CreateProposalForm } from "@/components/proposals/create-proposal-form";
import { CreatePricingProposalForm } from "@/components/proposals/create-pricing-proposal-form";

export const dynamic = "force-dynamic";

export default async function NovaPropostaPage({ searchParams }: { searchParams: Promise<{ scenarioId?: string; versionId?: string }> }) {
  const ctx = await requireProposalWriteAccess();
  const query = await searchParams;
  const scenario = query.scenarioId ? await getPricingScenarioById(query.scenarioId) : null;
  const active = scenario ? await getActivePricingVersion(scenario.id) : null;
  const listed = scenario && query.versionId ? (await getPricingScenarioVersions(scenario.id)).find((version) => version.id === query.versionId) : null;
  const version = active?.id === query.versionId ? active : listed;
  const pricingSource = scenario && version && version.id === query.versionId ? { scenarioId: scenario.id, versionId: version.id, scenarioName: scenario.name, serviceName: scenario.name, versionNumber: version.version_number, currency: version.currency, totalCents: version.total_amount_cents, entryCents: version.entry_amount_cents, installmentCount: version.installment_count, installmentAmountCents: version.installment_count ? Math.round((version.financed_amount_cents ?? 0) / version.installment_count) : 0, recurringAmountCents: version.monthly_fee_cents ?? 0, successFeeBps: version.success_fee_percentage_bps ?? 0 } : null;
  return <AppShell memberName={ctx.member.name} isAuthenticated interfaceMode={ctx.lawFirm.interfaceMode}><div className="space-y-6"><PageHeader title="Nova proposta comercial" description="Escolha uma origem e preencha os dados iniciais." />{pricingSource ? <CreatePricingProposalForm source={pricingSource} /> : <CreateProposalForm />}</div></AppShell>;
}
