import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdvancedRequests, decideApprovalAction } from "../actions";

export default async function AprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ decidido?: string; erro?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const canDecide = can(context.member?.role ?? "visualizador", "prazos.criar");

  const { requests: pendentes, total } = await getAdvancedRequests(
    { status: "pendente", approvalStatus: "pendente" },
    1,
    100,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprovações Pendentes"
        description={`${total} solicitações aguardando aprovação.`}
      />

      {params.decidido && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            Decisão registrada com sucesso.
          </CardContent>
        </Card>
      )}

      {params.erro && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Não foi possível registrar a decisão.
          </CardContent>
        </Card>
      )}

      {pendentes.length === 0 ? (
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="font-medium">Nenhuma aprovação pendente.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Todas as solicitações foram avaliadas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  {canDecide && (
                    <TableHead className="text-right">Ação</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.title}</div>
                      {req.description && (
                        <div className="max-w-[250px] truncate text-xs text-muted-foreground">
                          {req.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {req.documentType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.requestedByName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.clientName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.dueDate
                        ? formatDate(`${req.dueDate}T00:00:00`)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={req.priority} />
                    </TableCell>
                    {canDecide && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={decideApprovalAction}>
                            <input
                              type="hidden"
                              name="requestId"
                              value={req.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="aprovado"
                            />
                            <button
                              type="submit"
                              className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              Aprovar
                            </button>
                          </form>
                          <form action={decideApprovalAction}>
                            <input
                              type="hidden"
                              name="requestId"
                              value={req.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="rejeitado"
                            />
                            <button
                              type="submit"
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              Rejeitar
                            </button>
                          </form>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
