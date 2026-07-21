import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSLAStats } from "../actions";

export default async function SLAPage() {
  const context = await getAppContext();
  const stats = await getSLAStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoramento SLA"
        description="Acompanhe o cumprimento de prazos e a taxa de conformidade das solicitações."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Solicitações Concluídas"
          value={stats.concluidas}
          format="integer"
          detail="Total finalizadas"
        />
        <MetricCard
          label="Dentro do Prazo"
          value={stats.noPrazo}
          format="integer"
          detail="Cumpridas no prazo"
        />
        <MetricCard
          label="Atrasadas"
          value={stats.atrasadas}
          format="integer"
          detail="Fora do prazo"
        />
        <MetricCard
          label="Média de Dias"
          value={stats.avgDaysToComplete}
          detail="Para conclusão"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Compliance gauge */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Taxa de Conformidade (SLA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted/30"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${stats.complianceRate * 3.14} 314`}
                    strokeLinecap="round"
                    className={
                      stats.complianceRate >= 80
                        ? "text-green-500"
                        : stats.complianceRate >= 50
                          ? "text-amber-500"
                          : "text-red-500"
                    }
                  />
                </svg>
                <span className="absolute text-2xl font-bold">
                  {stats.complianceRate}%
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Dentro do prazo:</span>
                  <span className="font-medium">{stats.noPrazo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Atrasadas:</span>
                  <span className="font-medium">{stats.atrasadas}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Meta geral:</span>
                  <span className="font-medium">≥ 80%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary table */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Resumo do SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total de conclusões</TableCell>
                  <TableCell className="text-right font-medium">
                    {stats.concluidas}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cumpridas no prazo</TableCell>
                  <TableCell className="text-right font-medium">
                    {stats.noPrazo}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Fora do prazo</TableCell>
                  <TableCell className="text-right font-medium">
                    {stats.atrasadas}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Taxa de conformidade</TableCell>
                  <TableCell className="text-right font-medium">
                    {stats.complianceRate}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Média de dias para conclusão</TableCell>
                  <TableCell className="text-right font-medium">
                    {stats.avgDaysToComplete} dias
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
