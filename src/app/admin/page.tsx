import { Building2, FileText, Users, FolderOpen } from "lucide-react";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminPlatformMetrics, getAdminTenants } from "@/lib/admin/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrencyFromCents } from "@/lib/formatters";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const { adminClient } = await getAdminContext();

  const [metrics, recentTenants] = await Promise.all([
    getAdminPlatformMetrics(adminClient),
    getAdminTenants(adminClient, 1, 10),
  ]);

  return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral da plataforma Alfenus." />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Escritórios" value={metrics.totalTenants} format="integer" detail={`${metrics.activeTenants} ativos`} />
          <MetricCard label="Usuários" value={metrics.totalUsers} format="integer" detail="Membros total" />
          <MetricCard label="Novos este mês" value={metrics.tenantsThisMonth} format="integer" detail="Escritórios criados" />
          <MetricCard label="Documentos" value={metrics.totalDocuments} format="integer" detail="Arquivos armazenados" />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Novos escritórios por mês</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {metrics.tenantsByMonth.map((item) => {
                  const maxCount = Math.max(...metrics.tenantsByMonth.map((m) => m.count), 1);
                  const height = (item.count / maxCount) * 100;
                  return (
                    <div key={item.month} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{item.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Últimos escritórios</CardTitle>
              <CardDescription>10 mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Membros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTenants.tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Link href={`/admin/escritorios/${tenant.id}`} className="font-medium underline-offset-4 hover:underline">
                          {tenant.name}
                        </Link>
                      </TableCell>
                      <TableCell>{tenant.plan}</TableCell>
                      <TableCell><StatusBadge value={tenant.status} /></TableCell>
                      <TableCell>{tenant.memberCount}</TableCell>
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
