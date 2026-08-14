import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { getPricingScenarioById, getPricingScenarioVersions } from "@/lib/pricing/queries";
import { ComparisonClient } from "./ComparisonClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function CompareVersionsPage({ params, searchParams }: PageProps) {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    redirect("/entrar");
  }

  if (ctx.member.role !== "proprietario") {
    redirect("/simulador?erro=permissao");
  }

  const { id } = await params;
  const sp = await searchParams;
  const scenario = await getPricingScenarioById(id);

  if (!scenario) notFound();

  const versions = await getPricingScenarioVersions(scenario.id);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validVersionIds = new Set(versions.map((version) => version.id));
  const initialVersionA = sp.a && uuidPattern.test(sp.a) && validVersionIds.has(sp.a) ? sp.a : null;
  const initialVersionB = sp.b && uuidPattern.test(sp.b) && validVersionIds.has(sp.b) && sp.b !== initialVersionA ? sp.b : null;

  return (
    <div className="space-y-6">
      <Link
        href={`/simulador/${scenario.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar para cenário
      </Link>

      <PageHeader
        title={`Comparar versões — ${scenario.name}`}
        description="Selecione duas versões para comparar parâmetros e resultados lado a lado."
      />

      <ComparisonClient
        scenarioId={scenario.id}
        versions={versions.map((v) => ({
          id: v.id,
          version_number: v.version_number,
          scenario_type: v.scenario_type,
          total_amount_cents: v.total_amount_cents,
          entry_amount_cents: v.entry_amount_cents,
          installment_count: v.installment_count,
          created_at: v.created_at,
        }))}
        initialVersionA={initialVersionA}
        initialVersionB={initialVersionB}
      />
    </div>
  );
}
