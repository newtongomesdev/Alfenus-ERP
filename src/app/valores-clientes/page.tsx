import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brlFormatter } from "@/lib/formatters";

const subModules = [
  { label: "Contas de Clientes", href: "/valores-clientes/contas", description: "Gerencie contas e saldos dos clientes." },
  { label: "Transacoes", href: "/valores-clientes/transacoes", description: "Registre e aprove entradas e saidas." },
  { label: "Extratos", href: "/valores-clientes/extratos", description: "Gere extratos por periodo e conta." },
];

export default async function ValoresClientesDashboard() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valores de Clientes"
        description="Painel de gestao financeira de clientes: contas, transacoes e extratos."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Contas"
          value={0}
          format="integer"
          detail="Contas cadastradas"
        />
        <MetricCard
          label="Saldo Total"
          value={brlFormatter.format(0)}
          detail="Saldo consolidado"
        />
        <MetricCard
          label="Transacoes"
          value={0}
          format="integer"
          detail="Transacoes registradas"
        />
        <MetricCard
          label="Aprovacoes Pendentes"
          value={0}
          format="integer"
          detail="Aguardando aprovacao"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="rounded-lg transition hover:ring-2 hover:ring-primary/40">
              <CardHeader>
                <CardTitle>{mod.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
