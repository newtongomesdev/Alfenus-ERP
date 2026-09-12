import { Building2, FileText, Users, FolderOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminPlatformMetrics, getAdminTenants } from "@/lib/admin/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { AdminCharts } from "@/components/admin/admin-charts";
import Link from "next/link";

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> —
      </span>
    );
  }
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3" /> +{current}
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3" /> +{pct}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500 dark:text-red-400">
        <TrendingDown className="size-3" /> {pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="size-3" /> —
    </span>
  );
}

function MetricIcon({ icon: Icon }: { icon: typeof Building2 }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="size-4 text-primary" />
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { adminClient } = await getAdminContext();

  const [metrics, recentTenants] = await Promise.all([
    getAdminPlatformMetrics(adminClient),
    getAdminTenants(adminClient, 1, 10),
  ]);

  // Calcular tendências
  const tenantsByMonth = metrics.tenantsByMonth;
  const thisMonthIndex = tenantsByMonth.length - 1;
  const prevMonthIndex = tenantsByMonth.length - 2;
  const tenantsThisMonthCount = tenantsByMonth[thisMonthIndex]?.count ?? 0;
  const tenantsPrevMonthCount = tenantsByMonth[prevMonthIndex]?.count ?? 0;

  return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral da plataforma Alfenus." />

        {/* ── Cards de Métricas ─────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Escritórios</CardTitle>
              <MetricIcon icon={Building2} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight">{metrics.totalTenants}</p>
                <TrendIndicator current={tenantsThisMonthCount} previous={tenantsPrevMonthCount} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{metrics.activeTenants} ativos</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuários</CardTitle>
              <MetricIcon icon={Users} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{metrics.totalUsers}</p>
              <p className="mt-1 text-xs text-muted-foreground">Membros total</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novos este mês</CardTitle>
              <MetricIcon icon={FolderOpen} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight">{metrics.tenantsThisMonth}</p>
                <TrendIndicator current={tenantsThisMonthCount} previous={tenantsPrevMonthCount} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Escritórios criados</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
              <MetricIcon icon={FileText} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{metrics.totalDocuments}</p>
              <p className="mt-1 text-xs text-muted-foreground">Arquivos armazenados</p>
            </CardContent>
          </Card>
        </section>

        {/* ── Gráficos Recharts ─────────────────────────────────────── */}
        <AdminCharts />

        {/* ── Últimos escritórios ───────────────────────────────────── */}
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
  );
}
