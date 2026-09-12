import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { startAssistedAccessAction } from "../actions";

export default async function AssistedAccessPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { adminClient, userId, email } = await getAdminContext();
  const { tenantId } = await params;

  const { data: firm } = await adminClient
    .from("law_firms")
    .select("id, name, slug, plan")
    .eq("id", tenantId)
    .maybeSingle();

  if (!firm) redirect("/admin/escritorios");

  const { data: logs } = await adminClient
    .from("assisted_access_logs")
    .select("*")
    .eq("target_law_firm_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/escritorios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>

      <PageHeader
        title={`Acesso Assistido — ${firm.name}`}
        description={`${firm.slug} · plano ${firm.plan}`}
        actions={
          <form action={startAssistedAccessAction}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
              Entrar como este escritorio
            </button>
          </form>
        }
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Sessoes anteriores</CardTitle>
          <CardDescription>Historico de acessos assistidos a este escritorio</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Superadmin</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.superadmin_email}</TableCell>
                  <TableCell>{new Date(log.session_started_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{log.session_ended_at ? new Date(log.session_ended_at).toLocaleString("pt-BR") : "Em andamento"}</TableCell>
                  <TableCell>{log.ip_address ?? "—"}</TableCell>
                  <TableCell>{log.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(logs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma sessao de acesso assistido registrada.
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
