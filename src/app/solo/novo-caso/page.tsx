import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { NewCaseWizard } from "@/components/solo/new-case-wizard";
import { SoloDraftList } from "@/components/solo/draft-list";
import { getAppContext } from "@/lib/auth/context";
import { getClients } from "@/lib/clients/queries";
import { getSoloCaseDraft, getSoloCaseDrafts } from "@/lib/solo/drafts";
import Link from "next/link";

export default async function NovoCasoPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const ctx = await getAppContext();

  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  const clients = ctx.lawFirm
    ? (await getClients(ctx.lawFirm.id, undefined, 1, 20)).items.map(({ id, name, document, email, phone }) => ({ id, name, document, email, phone }))
    : [];
  const params = await searchParams;
  const draft = await getSoloCaseDraft(params.draft);
  const drafts = await getSoloCaseDrafts();

  return (
    <AppShell
      memberName={ctx.member?.name ?? null}
      isAuthenticated={ctx.status === "ready"}
      interfaceMode={ctx.lawFirm?.interfaceMode}
    >
      <div className="space-y-6">
        <PageHeader
          title="Novo caso"
          description="Cadastre cliente, caso, contrato e prazo em sequência."
        />
        {!draft && <SoloDraftList drafts={drafts} />}
        <NewCaseWizard draftId={draft?.id ?? null} clients={clients} initialDraft={draft?.payload ?? null} />
      </div>
    </AppShell>
  );
}
