import { getAdminContext } from "@/lib/admin/auth";
import { getAdminAuditLogs, getAdminTenants } from "@/lib/admin/queries";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogsPlataformaTab } from "./logs-plataforma-tab";
import { ErrorEventsTab } from "./error-events-tab";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tenant?: string; action?: string; de?: string; ate?: string; tab?: string; adminPage?: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(params.page ?? 1));
  const adminPage = Math.max(1, Number(params.adminPage ?? 1));
  const tab = params.tab ?? "tenant";

  const [result, tenantsResult] = await Promise.all([
    getAdminAuditLogs(adminClient, page, PAGE_SIZE, {
      lawFirmId: params.tenant,
      action: params.action,
      dateFrom: params.de,
      dateTo: params.ate,
    }),
    getAdminTenants(adminClient, 1, 9999),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

  const filterParts: string[] = [];
  if (params.tenant) filterParts.push(`tenant=${encodeURIComponent(params.tenant)}`);
  if (params.action) filterParts.push(`action=${encodeURIComponent(params.action)}`);
  if (params.de) filterParts.push(`de=${encodeURIComponent(params.de)}`);
  if (params.ate) filterParts.push(`ate=${encodeURIComponent(params.ate)}`);
  const basePath = filterParts.length > 0 ? `/admin/logs?${filterParts.join("&")}` : "/admin/logs";

  const actions = [...new Set(result.logs.map((l) => l.action))].sort();

  return (
      <div className="space-y-6">
        <PageHeader title="Logs de Auditoria" description="Atividade da plataforma e dos tenants." />

        <Tabs defaultValue={tab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenant">Ações dos Tenants</TabsTrigger>
            <TabsTrigger value="plataforma">Ações da Plataforma</TabsTrigger>
            <TabsTrigger value="erros">Erros</TabsTrigger>
          </TabsList>

          <TabsContent value="tenant">
            <Card className="rounded-lg">
              <CardContent className="space-y-4 pt-6">
                <form method="get" className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="tab" value="tenant" />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Escritório</label>
                    <select name="tenant" defaultValue={params.tenant ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Todos</option>
                      {tenantsResult.tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ação</label>
                    <select name="action" defaultValue={params.action ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Todas</option>
                      {actions.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">De</label>
                    <input type="date" name="de" defaultValue={params.de ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Até</label>
                    <input type="date" name="ate" defaultValue={params.ate ?? ""} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                  <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
                    Filtrar
                  </button>
                </form>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Escritório</TableHead>
                      <TableHead>Ator</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{log.lawFirmName ?? "—"}</TableCell>
                        <TableCell>{log.actorName ?? "—"}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</code></TableCell>
                        <TableCell>{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plataforma">
            <LogsPlataformaTab currentPage={adminPage} pageSize={PAGE_SIZE} />
          </TabsContent>

          <TabsContent value="erros">
            <ErrorEventsTab currentPage={adminPage} pageSize={PAGE_SIZE} />
          </TabsContent>
        </Tabs>
      </div>
  );
}
