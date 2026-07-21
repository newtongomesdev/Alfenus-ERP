import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getCalculations } from "@/lib/prazos/queries";
import { formatDeadlineResult } from "@/lib/prazos/engine";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveCalculationAction,
  rejectCalculationAction,
} from "../calculos/actions";

export default async function RevisaoPage() {
  const context = await getAppContext();
  const canReview = can(context.member?.role ?? "visualizador", "prazos.editar");

  const { calculations } = await getCalculations(
    context,
    { status: "aguardando_revisao" },
    1,
    50
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisão de Cálculos"
        description="Dupla conferência obrigatória — revise e aprove os cálculos de prazo antes da confirmação."
        actions={
          <a
            href="/prazos/calculos"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Cálculos Aguardando Revisão ({calculations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum cálculo aguardando revisão.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cálculos enviados para dupla conferência aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Parâmetros</TableHead>
                  <TableHead>Data Calculada</TableHead>
                  <TableHead>Observações</TableHead>
                  {canReview && (
                    <TableHead className="text-right">Ação</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell>
                      <div className="font-medium">{calc.tribunal}</div>
                      {calc.procedureType && (
                        <div className="text-xs text-muted-foreground">
                          {calc.procedureType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {calc.quantity} {calc.unit}
                        {calc.businessDays ? " (úteis)" : " (corridos)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Início: {calc.startDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDeadlineResult(calc)}
                      </div>
                      {calc.adjustmentReason && (
                        <div className="text-xs text-muted-foreground">
                          {calc.adjustmentReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {calc.notes ?? "—"}
                      </div>
                    </TableCell>
                    {canReview && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={approveCalculationAction}>
                            <input
                              type="hidden"
                              name="calculationId"
                              value={calc.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/80"
                            >
                              Aprovar
                            </button>
                          </form>
                          <form action={rejectCalculationAction}>
                            <input
                              type="hidden"
                              name="calculationId"
                              value={calc.id}
                            />
                            <input
                              type="hidden"
                              name="notes"
                              value="Reprovado na revisão"
                            />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/5"
                            >
                              Reprovar
                            </button>
                          </form>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
