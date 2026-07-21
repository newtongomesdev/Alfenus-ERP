import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminTenantDetail } from "@/lib/admin/queries";
import { getUsage } from "@/lib/admin/billing";
import { getLimitsForPlan } from "@/lib/admin/plan-limits";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LimitesForm } from "./limites-form";

const LIMIT_KEYS = [
  { key: "max_members", label: "Membros", usageKey: "members" },
  { key: "max_clients", label: "Clientes", usageKey: "clients" },
  { key: "max_documents_storage_mb", label: "Armazenamento (MB)", usageKey: null },
  { key: "max_contracts", label: "Contratos", usageKey: "contracts" },
  { key: "max_cases", label: "Processos", usageKey: "cases" },
] as const;

function formatLimit(value: number): string {
  return value === -1 ? "Ilimitado" : String(value);
}

export default async function AdminTenantLimitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  const detail = await getAdminTenantDetail(adminClient, id);
  if (!detail) redirect("/admin/escritorios");

  const [usage, planLimits] = await Promise.all([
    getUsage(id),
    getLimitsForPlan(detail.plan),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overrides } = await (adminClient as any)
    .from("tenant_limit_overrides")
    .select("limit_key, override_value, reason")
    .eq("law_firm_id", id);

  const overrideMap: Record<string, { value: number; reason: string | null }> = {};
  for (const row of overrides ?? []) {
    overrideMap[row.limit_key] = { value: row.override_value, reason: row.reason };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/escritorios/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>

      <PageHeader
        title={`Limites — ${detail.name}`}
        description={`Plano atual: ${detail.plan}`}
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Limites do plano e overrides</CardTitle>
          <CardDescription>
            Valores padrão do plano e overrides individuais por escritório.
            Use -1 para ilimitado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Limite</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Override</TableHead>
                <TableHead>Uso Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIMIT_KEYS.map(({ key, label, usageKey }) => {
                const planValue = planLimits[key] ?? -1;
                const override = overrideMap[key];
                const effectiveLimit = override ? override.value : planValue;
                const currentUsage = usageKey && usage ? (usage as Record<string, number>)[usageKey] ?? 0 : null;
                const isUnlimited = effectiveLimit === -1;
                const isReached =
                  !isUnlimited && currentUsage != null && currentUsage >= effectiveLimit;

                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {formatLimit(planValue)}
                      </code>
                    </TableCell>
                    <TableCell>
                      {override ? (
                        <div className="flex flex-col gap-0.5">
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {formatLimit(override.value)}
                          </code>
                          {override.reason && (
                            <span className="text-xs text-muted-foreground">
                              {override.reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {currentUsage != null ? (
                        <span className={isReached ? "font-semibold text-destructive" : ""}>
                          {currentUsage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {isUnlimited ? (
                        <Badge variant="secondary">Ilimitado</Badge>
                      ) : isReached ? (
                        <Badge variant="destructive">Limite atingido</Badge>
                      ) : (
                        <Badge variant="outline">Dentro do limite</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <LimitesForm
                        tenantId={id}
                        limitKey={key}
                        currentOverride={override?.value ?? null}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
