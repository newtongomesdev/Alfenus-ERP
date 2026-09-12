import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsagePage() {
  const { adminClient } = await getAdminContext();

  const { data: metrics } = await adminClient
    .from("platform_usage_metrics")
    .select("*, law_firms(name, slug)")
    .order("period_month", { ascending: false });

  // Get latest month per tenant
  const latestByTenant = new Map<string, Record<string, unknown>>();
  for (const m of metrics ?? []) {
    const firmId = m.law_firm_id as string;
    if (!latestByTenant.has(firmId)) {
      latestByTenant.set(firmId, m);
    }
  }

  const tenants = [...latestByTenant.values()];

  const totalClients = tenants.reduce((sum, t) => sum + (Number(t.clients_count) || 0), 0);
  const totalCases = tenants.reduce((sum, t) => sum + (Number(t.cases_count) || 0), 0);
  const totalStorage = tenants.reduce((sum, t) => sum + (Number(t.storage_bytes) || 0), 0);
  const totalAiTokens = tenants.reduce((sum, t) => sum + (Number(t.ai_tokens_used) || 0), 0);

  const storageMB = (totalStorage / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader title="Uso da Plataforma" description="Metricas de uso por escritorio e periodo." />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Clientes" value={totalClients} format="integer" detail="Em todos os escritorios" />
        <MetricCard label="Total Processos" value={totalCases} format="integer" detail="Em todos os escritorios" />
        <MetricCard label="Armazenamento" value={Number(storageMB)} format="integer" detail="MB utilizados" />
        <MetricCard label="Tokens IA" value={totalAiTokens} format="integer" detail="Total utilizado" />
      </section>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Uso por escritorio (mes mais recente)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escritorio</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Processos</TableHead>
                <TableHead className="text-right">Contratos</TableHead>
                <TableHead className="text-right">Docs</TableHead>
                <TableHead className="text-right">Membros Ativos</TableHead>
                <TableHead className="text-right">Tokens IA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => {
                const firm = t.law_firms as Record<string, string> | null;
                return (
                  <TableRow key={`${t.law_firm_id}-${t.period_month}`}>
                    <TableCell className="font-medium">{firm?.name ?? "—"}</TableCell>
                    <TableCell>{String(t.period_month)}</TableCell>
                    <TableCell className="text-right">{Number(t.clients_count)}</TableCell>
                    <TableCell className="text-right">{Number(t.cases_count)}</TableCell>
                    <TableCell className="text-right">{Number(t.contracts_count)}</TableCell>
                    <TableCell className="text-right">{Number(t.documents_count)}</TableCell>
                    <TableCell className="text-right">{Number(t.active_members)}</TableCell>
                    <TableCell className="text-right">{Number(t.ai_tokens_used).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma metrica coletada ainda. Os dados serao preenchidos pelo cron de metricas.
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
