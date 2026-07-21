import { getAdminContext } from "@/lib/admin/auth";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export async function LogsPlataformaTab({
  currentPage,
  pageSize,
}: {
  currentPage: number;
  pageSize: number;
}) {
  const { adminClient } = await getAdminContext();

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: logs, count } = await adminClient
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const basePath = "/admin/logs?tab=plataforma";

  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-4 pt-6">
        {(!logs || logs.length === 0) ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum log de ações da plataforma encontrado.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <code className="text-xs">{log.action}</code>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.entity_type}
                      {log.entity_name ? (
                        <span className="text-muted-foreground ml-1">· {log.entity_name}</span>
                      ) : null}
                      {log.entity_id ? (
                        <code className="text-xs text-muted-foreground ml-1">
                          {log.entity_id.slice(0, 8)}
                        </code>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-xs truncate inline-block">
                          {JSON.stringify(log.details)}
                        </code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
