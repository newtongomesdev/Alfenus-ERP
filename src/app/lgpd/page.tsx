import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const subModules = [
  {
    label: "Consentimentos",
    href: "/lgpd/consentimentos",
    description: "Gerencie consentimentos dos titulares de dados.",
  },
  {
    label: "Solicitacoes",
    href: "/lgpd/solicitacoes",
    description: "Acompanhe solicitacoes dos titulares de dados.",
  },
  {
    label: "Politicas de Retencao",
    href: "/lgpd/politicas",
    description: "Defina politicas de retencao e exclusao de dados.",
  },
];

export default async function LgpdDashboard() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="LGPD — Protecao de Dados"
        description="Painel de gestao de conformidade com a Lei Geral de Protecao de Dados (LGPD)."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Consentimentos Ativos"
          value={0}
          format="integer"
          detail="Consentimentos vigentes"
        />
        <MetricCard
          label="Solicitacoes Pendentes"
          value={0}
          format="integer"
          detail="Aguardando resposta"
        />
        <MetricCard
          label="Politicas Ativas"
          value={0}
          format="integer"
          detail="Politicas de retencao vigentes"
        />
        <MetricCard
          label="Requisicoes Concluidas"
          value={0}
          format="integer"
          detail="Solicitacoes finalizadas"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="rounded-lg transition hover:ring-2 hover:ring-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{mod.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {mod.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
