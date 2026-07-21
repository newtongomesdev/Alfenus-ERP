import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createAnnouncementAction } from "./actions";

export default async function AdminAnnouncementsPage() {
  const { adminClient } = await getAdminContext();
  const { data: announcements } = await adminClient
    .from("system_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  const severityColors: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    critical: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anuncios da Plataforma"
        description="Gerencie comunicacoes exibidas aos usuarios."
        actions={
          <form action={createAnnouncementAction} className="flex gap-2">
            <input type="text" name="title" placeholder="Titulo" required className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm" />
            <input type="text" name="body" placeholder="Mensagem" required className="h-8 w-64 rounded-md border border-input bg-background px-3 text-sm" />
            <select name="severity" className="h-8 rounded-md border border-input bg-background px-2 text-sm">
              <option value="info">Info</option>
              <option value="warning">Aviso</option>
              <option value="critical">Critico</option>
            </select>
            <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Criar</button>
          </form>
        }
      />

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(announcements ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-md truncate">{a.body}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={severityColors[a.severity] ?? ""}>
                      {a.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.is_active ? "Sim" : "Nao"}</TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
              {(announcements ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum anuncio criado.
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
