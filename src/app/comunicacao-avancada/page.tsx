import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const subModules = [
  {
    label: "Mensagens",
    href: "/comunicacao-avancada/mensagens",
    description: "Gerencie todas as mensagens enviadas e recebidas.",
  },
  {
    label: "Threads",
    href: "/comunicacao-avancada/threads",
    description: "Conversas agrupadas por assunto e discussao.",
  },
  {
    label: "Nova Mensagem",
    href: "/comunicacao-avancada/nova",
    description: "Envie uma nova mensagem para a equipe ou clientes.",
  },
];

export default async function ComunicacaoDashboard() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicacao Avancada"
        description="Painel de gerenciamento de mensagens, threads e comunicacoes internas da equipe."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Mensagens"
          value={0}
          format="integer"
          detail="Mensagens registradas"
        />
        <MetricCard
          label="Threads Ativas"
          value={0}
          format="integer"
          detail="Discussoes em andamento"
        />
        <MetricCard
          label="Nao Lidas"
          value={0}
          format="integer"
          detail="Mensagens aguardando leitura"
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
