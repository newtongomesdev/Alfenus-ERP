import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminTenantDetail } from "@/lib/admin/queries";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SuspendTenantButton, ReactivateTenantButton } from "@/components/admin/tenant-actions";
import { TrialSection } from "./trial-section";

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  const detail = await getAdminTenantDetail(adminClient, id);
  if (!detail) redirect("/admin/escritorios");

  // Fetch trial data from law_firms
  const { data: trialFirm } = await adminClient
    .from("law_firms")
    .select("trial_starts_at, trial_ends_at, trial_used")
    .eq("id", id)
    .maybeSingle();

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/escritorios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader
          title={detail.name}
          description={`${detail.slug} · ${detail.plan}`}
          actions={
            <div className="flex gap-2">
              <Link
                href={`/admin/acesso-assistido/${detail.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition hover:bg-accent"
              >
                <Eye className="size-4" /> Acesso Assistido
              </Link>
              {detail.status === "ativo"
                ? <SuspendTenantButton tenantId={detail.id} />
                : <ReactivateTenantButton tenantId={detail.id} />}
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clientes" value={detail.clientCount} format="integer" detail="Cadastrados" />
          <MetricCard label="Contratos" value={detail.contractCount} format="integer" detail="De honorários" />
          <MetricCard label="Pago" value={detail.totalPaidCents} format="currency" detail="Total recebido" />
          <MetricCard label="Pendente" value={detail.totalPendingCents} format="currency" detail="Em aberto" />
        </section>

        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <TrialSection
              tenantId={detail.id}
              trial={{
                trialStartsAt: trialFirm?.trial_starts_at ?? null,
                trialEndsAt: trialFirm?.trial_ends_at ?? null,
                trialUsed: trialFirm?.trial_used ?? false,
              }}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Dados cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{detail.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{detail.phone ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Documento</span><span>{detail.document ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge value={detail.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{new Date(detail.createdAt).toLocaleDateString("pt-BR")}</span></div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Membros ({detail.members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell><StatusBadge value={m.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {detail.recentLogs.length > 0 && (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>Últimas 50 ações deste escritório</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{log.actorName ?? "—"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</TableCell>
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
