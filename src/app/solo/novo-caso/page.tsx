import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { NewCaseWizard } from "@/components/solo/new-case-wizard";
import { getAppContext } from "@/lib/auth/context";

export default async function NovoCasoPage() {
  const ctx = await getAppContext();

  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

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
        <NewCaseWizard />
      </div>
    </AppShell>
  );
}
