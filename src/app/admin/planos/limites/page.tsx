import { getAdminContext } from "@/lib/admin/auth";
import { getPlanLimits } from "@/lib/admin/plan-limits";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LimitForm } from "./limites-form";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

const PLAN_ORDER = ["starter", "professional", "business"] as const;

export default async function AdminPlanLimitsPage() {
  await getAdminContext();
  const limits = await getPlanLimits();

  const grouped = new Map<string, typeof limits>();
  for (const planId of PLAN_ORDER) {
    grouped.set(planId, []);
  }
  for (const limit of limits) {
    const group = grouped.get(limit.planId) ?? [];
    group.push(limit);
    grouped.set(limit.planId, group);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Limites dos Planos"
        description="Gerencie os limites quantitativos de cada plano (membros, clientes, documentos, etc). Use -1 para ilimitado."
      />

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PLAN_ORDER.map((planId) => {
                const planLimits = grouped.get(planId) ?? [];
                if (planLimits.length === 0) {
                  return (
                    <TableRow key={`${planId}-empty`}>
                      <TableCell>
                        <Badge variant="secondary">{PLAN_LABELS[planId] ?? planId}</Badge>
                      </TableCell>
                      <TableCell colSpan={3} className="text-muted-foreground text-sm">
                        Nenhum limite configurado para este plano.
                      </TableCell>
                    </TableRow>
                  );
                }
                return planLimits.map((limit) => (
                  <TableRow key={`${limit.planId}-${limit.limitKey}`}>
                    <TableCell>
                      <Badge variant="secondary">{PLAN_LABELS[limit.planId] ?? limit.planId}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{limit.limitKey}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {limit.limitValue === -1 ? "Ilimitado" : limit.limitValue}
                    </TableCell>
                    <TableCell className="text-right">
                      <LimitForm
                        planId={limit.planId}
                        limitKey={limit.limitKey}
                        initialValue={limit.limitValue}
                      />
                    </TableCell>
                  </TableRow>
                ));
              })}
              {limits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum limite configurado. Insira registros na tabela plan_limits.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
