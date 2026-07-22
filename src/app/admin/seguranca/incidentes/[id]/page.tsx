import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const severityConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  aberto: { label: "Aberto", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  investigando: { label: "Investigando", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  resolvido: { label: "Resolvido", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  fechado: { label: "Fechado", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export default async function AdminSecurityIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  try {
    const { data: incident } = await (adminClient as any)
      .from("security_incidents")
      .select("*, law_firms(name)")
      .eq("id", id)
      .single();

    if (!incident) redirect("/admin/seguranca/incidentes");

    const { data: events } = await (adminClient as any)
      .from("security_incident_events")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: true });

    const sev = severityConfig[incident.severity] ?? { label: incident.severity, className: "bg-gray-100 text-gray-700" };
    const sta = statusConfig[incident.status] ?? { label: incident.status, className: "bg-gray-100 text-gray-700" };
    const lawFirmName = incident.law_firms?.name ?? "—";
    const isResolved = incident.status === "resolvido" || incident.status === "fechado";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/seguranca/incidentes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader
          title={incident.title}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={sev.className}>{sev.label}</Badge>
              <Badge variant="outline" className={sta.className}>{sta.label}</Badge>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Tenant</p>
              <p className="mt-1 font-medium">{lawFirmName}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Reportado por</p>
              <p className="mt-1 font-medium">{incident.reported_by ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Atribuído a</p>
              <p className="mt-1 font-medium">{incident.assigned_to ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Datas</p>
              <p className="mt-1 text-sm">
                Criado: {new Date(incident.created_at).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-sm">
                Atualizado: {new Date(incident.updated_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {incident.description ?? "Sem descrição."}
            </p>
          </CardContent>
        </Card>

        {isResolved && incident.resolution_notes && (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Notas de Resolução</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {incident.resolution_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {events && events.length > 0 && (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Linha do Tempo ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Status Anterior</TableHead>
                    <TableHead>Novo Status</TableHead>
                    <TableHead>Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: any) => {
                    const oldSta = event.old_status ? (statusConfig[event.old_status]?.label ?? event.old_status) : "—";
                    const newSta = event.new_status ? (statusConfig[event.new_status]?.label ?? event.new_status) : "—";

                    return (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{event.actor_id ?? "—"}</TableCell>
                        <TableCell>{oldSta}</TableCell>
                        <TableCell>{newSta}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {event.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/seguranca/incidentes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Erro ao carregar detalhes do incidente. Verifique se a tabela <code>security_incidents</code> existe no banco de dados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
