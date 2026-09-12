import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getPublications } from "@/lib/controladoria/queries";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  intimacao: "Intimacao",
  despacho: "Despacho",
  decisao: "Decisao",
  sentenca: "Sentenca",
  acordao: "Acordao",
  citacao: "Citacao",
  publicacao_administrativa: "Publ. Administrativa",
  outro: "Outro",
};

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  normal: "",
  alta: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgente: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export default async function PublicacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; type?: string; priority?: string; q?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const result = await getPublications(context, {
    status: params.status,
    publicationType: params.type,
    priority: params.priority,
    q: params.q,
  }, page, PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const filterParts: string[] = [];
  if (params.status) filterParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.type) filterParts.push(`type=${encodeURIComponent(params.type)}`);
  if (params.priority) filterParts.push(`priority=${encodeURIComponent(params.priority)}`);
  if (params.q) filterParts.push(`q=${encodeURIComponent(params.q)}`);
  const basePath = filterParts.length > 0 ? `/controladoria/publicacoes?${filterParts.join("&")}` : "/controladoria/publicacoes";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicacoes"
        description="Caixa de entrada de publicacoes processuais."
        actions={
          <Link
            href="/controladoria/publicacoes/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Publicacao
          </Link>
        }
      />

      <Card className="rounded-lg">
        <CardContent className="space-y-4 pt-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <input name="q" placeholder="Numero, resumo..." defaultValue={params.q ?? ""} className="h-9 w-48 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Todos</option>
                <option value="recebida">Recebida</option>
                <option value="aguardando_triagem">Aguard. Triagem</option>
                <option value="em_analise">Em Analise</option>
                <option value="aguardando_distribuicao">Aguard. Distribuicao</option>
                <option value="aguardando_revisao">Aguard. Revisao</option>
                <option value="tratada">Tratada</option>
                <option value="ignorada">Ignorada</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select name="type" defaultValue={params.type ?? ""} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Todos</option>
                <option value="intimacao">Intimacao</option>
                <option value="despacho">Despacho</option>
                <option value="decisao">Decisao</option>
                <option value="sentenca">Sentenca</option>
                <option value="acordao">Acordao</option>
                <option value="citacao">Citacao</option>
              </select>
            </div>
            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Filtrar</button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tribunal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recebida em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-medium">{pub.tribunal}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[pub.publicationType] ?? pub.publicationType}</Badge></TableCell>
                  <TableCell>{pub.caseNumber ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{pub.summary ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={priorityColors[pub.priority] ?? ""}>{pub.priority}</Badge></TableCell>
                  <TableCell><StatusBadge value={pub.status} /></TableCell>
                  <TableCell>{pub.createdAt ? new Date(pub.createdAt).toLocaleDateString("pt-BR") : "—"}</TableCell>
                </TableRow>
              ))}
              {result.publications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma publicacao encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
