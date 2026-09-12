import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSolicitationStats } from "./actions";

const subModules = [
  { label: "Pedidos", href: "/solicitacoes/pedidos", key: "total" as const },
  { label: "Aprovações", href: "/solicitacoes/aprovacoes", key: "aprovacaoPendente" as const },
  { label: "Monitoramento SLA", href: "/solicitacoes/sla", key: "concluidas" as const },
];

export default async function SolicitacoesDashboard() {
  const context = await getAppContext();
  const stats = await getSolicitationStats();
  const canCreate = can(context.member?.role ?? "visualizador", "prazos.criar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações e SLA"
        description="Gestão avançada de solicitações, aprovações e cumprimento de SLA."
        actions={
          canCreate ? (
            <Link
              href="/solicitacoes/pedidos/novo"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Nova Solicitação
            </Link>
          ) : undefined
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de Solicitações"
          value={stats.total}
          format="integer"
          detail="Solicitações cadastradas"
        />
        <MetricCard
          label="Pendentes"
          value={stats.pendentes}
          format="integer"
          detail="Aguardando ação"
        />
        <MetricCard
          label="Em Andamento"
          value={stats.emAndamento}
          format="integer"
          detail="Solicitações ativas"
        />
        <MetricCard
          label="Concluídas"
          value={stats.concluidas}
          format="integer"
          detail="Solicitações finalizadas"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <MetricCard
          label="Aprovação Pendente"
          value={stats.aprovacaoPendente}
          format="integer"
          detail="Aguardando aprovação"
        />
        <MetricCard
          label="Vencidas"
          value={stats.vencidas}
          format="integer"
          detail="Prazo expirado"
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
