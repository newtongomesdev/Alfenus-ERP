import { getAdminContext } from "@/lib/admin/auth";
import { getAdminSystemHealth } from "@/lib/admin/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminHealthPage() {
  const { adminClient } = await getAdminContext();
  const health = await getAdminSystemHealth(adminClient);

  const tableEntries = Object.entries(health.tableCounts).sort((a, b) => b[1] - a[1]);
  const roleEntries = Object.entries(health.membersByRole).sort((a, b) => b[1] - a[1]);

  return (
      <div className="space-y-6">
        <PageHeader title="Saúde do Sistema" description="Contagens de registros e uso do banco de dados." />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Membros total" value={health.totalMembers} format="integer" detail="Em todos os tenants" />
          <MetricCard label="Membros ativos" value={health.activeMembers} format="integer" detail="Status ativo" />
          <MetricCard label="Tabelas" value={tableEntries.length} format="integer" detail="Com dados" />
          <MetricCard label="Total de registros" value={tableEntries.reduce((sum, [, count]) => sum + count, 0)} format="integer" detail="Em todas as tabelas" />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Registros por tabela</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableEntries.map(([table, count]) => (
                    <TableRow key={table}>
                      <TableCell className="font-mono text-sm">{table}</TableCell>
                      <TableCell className="text-right">{count.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Membros por papel</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleEntries.map(([role, count]) => (
                    <TableRow key={role}>
                      <TableCell className="capitalize">{role}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
