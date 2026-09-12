import { Search } from "lucide-react";
import Link from "next/link";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminTenants } from "@/lib/admin/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const [tenants, allMetrics] = await Promise.all([
    getAdminTenants(adminClient, page, PAGE_SIZE, params.q, params.status),
    getAdminTenants(adminClient, 1, 9999, undefined, undefined),
  ]);

  const totalPages = Math.max(1, Math.ceil(tenants.totalCount / PAGE_SIZE));
  const activeCount = allMetrics.tenants.filter((t) => t.status === "ativo").length;
  const suspendedCount = allMetrics.tenants.filter((t) => t.status === "suspenso").length;

  const filterParts: string[] = [];
  if (params.q) filterParts.push(`q=${encodeURIComponent(params.q)}`);
  if (params.status) filterParts.push(`status=${encodeURIComponent(params.status)}`);
  const basePath = filterParts.length > 0 ? `/admin/escritorios?${filterParts.join("&")}` : "/admin/escritorios";

  return (
      <div className="space-y-6">
        <PageHeader title="Escritórios" description="Gerencie todos os tenants da plataforma." />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total" value={allMetrics.tenants.length} format="integer" detail="Escritórios" />
          <MetricCard label="Ativos" value={activeCount} format="integer" detail="Com acesso" />
          <MetricCard label="Suspensos" value={suspendedCount} format="integer" detail="Sem acesso" />
        </section>

        <Card className="rounded-lg">
          <CardContent className="space-y-4 pt-6">
            <form method="get" className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" name="q" placeholder="Nome ou slug" defaultValue={params.q ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" defaultValue={params.status ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                </select>
              </div>
              <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
                Filtrar
              </button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link href={`/admin/escritorios/${tenant.id}`} className="font-medium underline-offset-4 hover:underline">
                        {tenant.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>{tenant.memberCount}</TableCell>
                    <TableCell>{tenant.clientCount}</TableCell>
                    <TableCell><StatusBadge value={tenant.status} /></TableCell>
                    <TableCell>{new Date(tenant.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
            )}
          </CardContent>
        </Card>
      </div>
  );
}
