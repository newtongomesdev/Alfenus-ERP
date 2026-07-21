import { getAppContext } from "@/lib/auth/context";
import { getPublications } from "@/lib/controladoria/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function RevisoesPage() {
  const context = await getAppContext();

  const result = await getPublications(context, { status: "aguardando_revisao" }, 1, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisoes Pendentes"
        description="Publicacoes aguardando revisao antes de serem tratadas."
      />

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tribunal</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead>Responsavel</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-medium">{pub.tribunal}</TableCell>
                  <TableCell>{pub.caseNumber ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{pub.summary ?? "—"}</TableCell>
                  <TableCell>{pub.responsibleMemberId ? pub.responsibleMemberId.slice(0, 8) : <Badge variant="outline" className="text-amber-600">Sem resp.</Badge>}</TableCell>
                  <TableCell>{new Date(pub.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
              {result.publications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma revisao pendente.
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
