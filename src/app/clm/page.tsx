import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getClmDashboardStats } from "@/lib/clm/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const subModules = [
  { label: "Solicitacoes", href: "/clm/solicitacoes", key: "totalRequests" as const },
  { label: "Obrigacoes Contratuais", href: "/clm/obrigacoes", key: "totalObligations" as const },
  { label: "Aditivos", href: "/clm/aditivos", key: "totalAmendments" as const },
];

export default async function ClmDashboard() {
  const context = await getAppContext();
  let stats;
  try {
    stats = await getClmDashboardStats(context);
  } catch {
    console.error("[clm] Falha ao carregar dashboard CLM — migrations podem não estar aplicadas");
    stats = { totalRequests: 0, emAndamento: 0, aguardandoAprovacao: 0, ativos: 0, totalObligations: 0, totalAmendments: 0 };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CLM — Gestao de Contratos"
        description="Painel de gestao do ciclo de vida dos contratos, solicitacoes, obrigacoes e aditivos."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Contratos"
          value={stats.totalRequests}
          format="integer"
          detail="Solicitacoes registradas"
        />
        <MetricCard
          label="Em Andamento"
          value={stats.emAndamento}
          format="integer"
          detail="Em triagem, minuta ou revisao"
        />
        <MetricCard
          label="Aguardando Aprovacao"
          value={stats.aguardandoAprovacao}
          format="integer"
          detail="Aguardando decisao"
        />
        <MetricCard
          label="Ativos"
          value={stats.ativos}
          format="integer"
          detail="Contratos vigentes"
        />
        <MetricCard
          label="Obrigacoes"
          value={stats.totalObligations}
          format="integer"
          detail="Obrigacoes cadastradas"
        />
        <MetricCard
          label="Aditivos"
          value={stats.totalAmendments}
          format="integer"
          detail="Aditivos registrados"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="rounded-lg transition hover:ring-2 hover:ring-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{mod.label}</span>
                  <span className="text-2xl font-semibold text-primary">
                    {stats[mod.key]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Acessar {mod.label.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
