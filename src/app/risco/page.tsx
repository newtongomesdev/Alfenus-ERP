import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getRiskDashboardStats } from "@/lib/risco/queries";
import { brlFormatter } from "@/lib/formatters";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const subModules = [
  { label: "Pedidos", href: "/risco/pedidos", key: "totalClaims" as const },
  { label: "Avaliacoes de Risco", href: "/risco/avaliacoes", key: "totalRiskAssessments" as const },
  { label: "Provisionamento", href: "/risco/provisoes", key: "totalProvisions" as const },
  { label: "Garantias e Depositos", href: "/risco/garantias", key: "totalGuarantees" as const },
  { label: "Bloqueios", href: "/risco/bloqueios", key: "totalSeizures" as const },
];

export default async function RiscoDashboard() {
  const context = await getAppContext();
  const stats = await getRiskDashboardStats(context);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risco e Valores Processuais"
        description="Painel de gestao de riscos, pedidos, provisionamento, garantias e bloqueios processuais."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Pedidos"
          value={stats.totalClaims}
          format="integer"
          detail="Pedidos cadastrados"
        />
        <MetricCard
          label="Valor Total Pedidos"
          value={brlFormatter.format(stats.totalValue)}
          detail="Soma dos valores atualizados"
        />
        <MetricCard
          label="Avaliacoes de Risco"
          value={stats.totalRiskAssessments}
          format="integer"
          detail="Avaliacoes registradas"
        />
        <MetricCard
          label="Provisionamento Total"
          value={brlFormatter.format(stats.totalProvisionValue)}
          detail={`${stats.totalProvisions} provisoes`}
        />
        <MetricCard
          label="Garantias Vigentes"
          value={brlFormatter.format(stats.totalGuaranteeValue)}
          detail={`${stats.totalGuarantees} garantias ativas`}
        />
        <MetricCard
          label="Bloqueios Ativos"
          value={brlFormatter.format(stats.totalSeizureValue)}
          detail={`${stats.totalSeizures} bloqueios`}
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
