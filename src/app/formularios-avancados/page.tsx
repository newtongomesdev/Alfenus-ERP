import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getFormulariosDashboardStats } from "@/lib/formularios/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const subModules = [
  { label: "Formularios", href: "/formularios-avancados/formularios", key: "totalFormularios" as const },
  { label: "Agendamento", href: "/formularios-avancados/agendamento", key: "agendamentosConfirmados" as const },
];

export default async function FormulariosDashboard() {
  const context = await getAppContext();
  let stats: { totalFormularios: number; totalSubmissoes: number; agendamentosConfirmados: number; totalProfissionais: number; totalServicos: number };
  try {
    stats = await getFormulariosDashboardStats(context);
  } catch {
    console.error("[formularios-avancados] Falha ao carregar dados — migrations podem não estar aplicadas");
    stats = { totalFormularios: 0, totalSubmissoes: 0, agendamentosConfirmados: 0, totalProfissionais: 0, totalServicos: 0 };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formularios e Agendamento"
        description="Painel de gestao de formularios avancados, submissoes e agendamentos de atendimentos."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Formularios"
          value={stats.totalFormularios}
          format="integer"
          detail="Formularios cadastrados"
        />
        <MetricCard
          label="Submissoes"
          value={stats.totalSubmissoes}
          format="integer"
          detail="Total de submissoes recebidas"
        />
        <MetricCard
          label="Agendamentos Confirmados"
          value={stats.agendamentosConfirmados}
          format="integer"
          detail="Atendimentos agendados"
        />
        <MetricCard
          label="Profissionais"
          value={stats.totalProfissionais}
          format="integer"
          detail="Profissionais ativos"
        />
        <MetricCard
          label="Servicos"
          value={stats.totalServicos}
          format="integer"
          detail="Servicos disponiveis"
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
