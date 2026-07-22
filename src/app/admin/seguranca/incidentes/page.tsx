import { Search } from "lucide-react";
import Link from "next/link";

import { getAdminContext } from "@/lib/admin/auth";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const severityConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  aberto: { label: "Aberto", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  investigando: { label: "Investigando", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  resolvido: { label: "Resolvido", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  fechado: { label: "Fechado", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export default async function AdminSecurityIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; severity?: string; status?: string; q?: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  try {
    // Fetch all incidents for metrics
    const { data: allIncidents } = await (adminClient as any)
      .from("security_incidents")
      .select("id, severity, status, created_at, law_firm_id");

    const totalCount = allIncidents?.length ?? 0;
    const abertosCount = allIncidents?.filter((i: any) => i.status === "aberto").length ?? 0;
    const altaCriticaCount = allIncidents?.filter((i: any) => i.severity === "alta" || i.severity === "critica").length ?? 0;

    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const resolvidosEsteMesCount = allIncidents?.filter((i: any) => {
      if (i.status !== "resolvido" && i.status !== "fechado") return false;
      const d = new Date(i.created_at);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    }).length ?? 0;

    // Build query for paginated results
    let query = (adminClient as any)
      .from("security_incidents")
      .select("id, title, description, severity, status, reported_by, assigned_to, created_at, updated_at, law_firms(name)", { count: "exact" });

    if (params.severity) {
      query = query.eq("severity", params.severity);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.q) {
      query = query.ilike("title", `%${params.q}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: incidents, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    const totalRecords = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

    // Build base path for pagination
    const filterParts: string[] = [];
    if (params.severity) filterParts.push(`severity=${encodeURIComponent(params.severity)}`);
    if (params.status) filterParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.q) filterParts.push(`q=${encodeURIComponent(params.q)}`);
    const basePath = filterParts.length > 0
      ? `/admin/seguranca/incidentes?${filterParts.join("&")}`
      : "/admin/seguranca/incidentes";

    return (
      <div className="space-y-6">
        <PageHeader
          title="Incidentes de Segurança"
          description="Gerencie e acompanhe todos os incidentes de segurança reportados."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total" value={totalCount} format="integer" detail="Incidentes" />
          <MetricCard label="Abertos" value={abertosCount} format="integer" detail="Aguardando ação" />
          <MetricCard label="Alta / Crítica" value={altaCriticaCount} format="integer" detail="Prioridade elevada" />
          <MetricCard label="Resolvidos" value={resolvidosEsteMesCount} format="integer" detail="Este mês" />
        </section>

        <Card className="rounded-lg">
          <CardContent className="space-y-4 pt-6">
            <form method="get" className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" name="q" placeholder="Título do incidente" defaultValue={params.q ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severidade</label>
                <select name="severity" defaultValue={params.severity ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Todas</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" defaultValue={params.status ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Todos</option>
                  <option value="aberto">Aberto</option>
                  <option value="investigando">Investigando</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>
              <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
                Filtrar
              </button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Resolução</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents?.map((incident: any) => {
                  const sev = severityConfig[incident.severity] ?? { label: incident.severity, className: "bg-gray-100 text-gray-700" };
                  const sta = statusConfig[incident.status] ?? { label: incident.status, className: "bg-gray-100 text-gray-700" };
                  const lawFirmName = incident.law_firms?.name ?? "—";
                  const isResolved = incident.status === "resolvido" || incident.status === "fechado";

                  return (
                    <TableRow key={incident.id}>
                      <TableCell>
                        <Link href={`/admin/seguranca/incidentes/${incident.id}`} className="font-medium underline-offset-4 hover:underline">
                          {incident.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lawFirmName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sev.className}>{sev.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sta.className}>{sta.label}</Badge>
                      </TableCell>
                      <TableCell>{incident.reported_by ?? "—"}</TableCell>
                      <TableCell>{new Date(incident.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {isResolved ? (incident.resolution_notes ?? "—") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!incidents || incidents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Nenhum incidente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} totalRecords={totalRecords} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Incidentes de Segurança"
          description="Gerencie e acompanhe todos os incidentes de segurança reportados."
        />
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Erro ao carregar incidentes de segurança. Verifique se a tabela <code>security_incidents</code> existe no banco de dados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
