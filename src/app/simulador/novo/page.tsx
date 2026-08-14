import { redirect } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { PricingWizard } from "./PricingWizard";
import { getServices } from "@/lib/service-catalog/queries";

export const dynamic = "force-dynamic";

export default async function NovoSimuladorPage() {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    redirect("/entrar");
  }

  const canCreate = ["proprietario", "administrador", "advogado"].includes(ctx.member.role);

  if (!canCreate) {
    redirect("/simulador?erro=permissao");
  }

  const { services } = await getServices(ctx.lawFirm.id, { status: "ativo" });

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link
          href="/simulador"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para cenários
        </Link>
      </div>
      <PageHeader
        title="Novo Cenário de Precificação"
        description="Preencha os dados do serviço, configure os parâmetros de cálculo e confirme para gerar o cenário."
      />
      <PricingWizard
        services={services}
      />
    </div>
  );
}
