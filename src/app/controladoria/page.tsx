import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getPublicationStats } from "@/lib/controladoria/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  recebida: "Recebida",
  aguardando_triagem: "Aguard. Triagem",
  em_analise: "Em Analise",
  aguardando_distribuicao: "Aguard. Distrib.",
  aguardando_calculo: "Aguard. Calculo",
  aguardando_revisao: "Aguard. Revisao",
  tratada: "Tratada",
  ignorada: "Ignorada",
  duplicada: "Duplicada",
  arquivada: "Arquivada",
};

export default async function ControladoriaDashboard() {
  const context = await getAppContext();
  const stats = await getPublicationStats(context);

  const statusEntries = Object.entries(stats.totalByStatus).sort((a, b) => b[1] - a[1]);
  const tribunalEntries = Object.entries(stats.totalByTribunal).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controladoria"
        description="Painel de publicacoes, intimecoes e comunicacoes processuais."
        actions={
          <Link
            href="/controladoria/publicacoes/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Publicacao
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recebidas hoje" value={stats.receivedToday} format="integer" detail="Publicacoes" />
        <MetricCard label="Nao tratadas" value={stats.untreated} format="integer" detail="Aguardando acao" />
        <MetricCard label="Aguardando revisao" value={stats.awaitingReview} format="integer" detail="Pendentes" />
        <MetricCard label="Sem responsavel" value={stats.withoutResponsible} format="integer" detail="Precisa atribuicao" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vencidas sem tratamento" value={stats.expiredUntreated} format="integer" detail="Prazo expirado" />
        <MetricCard label="Com prazo confirmado" value={stats.deadlinesCreated} format="integer" detail="Prazos criados" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusEntries.map(([status, count]) => (
                  <TableRow key={status}>
                    <TableCell>{statusLabels[status] ?? status}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
                {statusEntries.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">Nenhuma publicacao.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Por Tribunal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tribunal</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tribunalEntries.map(([tribunal, count]) => (
                  <TableRow key={tribunal}>
                    <TableCell>{tribunal}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
                {tribunalEntries.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">Nenhum tribunal.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
