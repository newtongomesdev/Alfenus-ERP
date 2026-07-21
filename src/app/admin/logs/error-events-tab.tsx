import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminContext } from "@/lib/admin/auth";
import { getAdminErrorEvents, type AdminErrorEvent } from "@/lib/admin/error-events";

export async function ErrorEventsTab({ currentPage, pageSize }: { currentPage: number; pageSize: number }) {
  const { adminClient } = await getAdminContext();
  const result = await getAdminErrorEvents(adminClient, currentPage, pageSize);
  const totalPages = Math.max(1, Math.ceil(result.totalCount / pageSize));

  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-4 pt-6">
        {result.events.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum erro registrado.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Rota</TableHead><TableHead>Tipo</TableHead><TableHead>Mensagem</TableHead><TableHead>Digest</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.events.map((event: AdminErrorEvent) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">{new Date(event.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={event.source === "server" ? "destructive" : "secondary"}>{event.source}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{event.path}</TableCell>
                  <TableCell className="text-xs">{event.routeType ?? "—"}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-xs" title={event.message}>{event.message}</TableCell>
                  <TableCell className="font-mono text-xs">{event.digest ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 ? <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/logs?tab=erros" /> : null}
      </CardContent>
    </Card>
  );
}
