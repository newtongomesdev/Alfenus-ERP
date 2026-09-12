import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getAllAmendments } from "@/lib/clm/queries";
import { brlFormatter } from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const amendmentTypeLabels: Record<string, string> = {
  aditivo: "Aditivo",
  anexo_endereco: "Anexo de Endereco",
  retificacao: "Retificacao",
};

export default async function AditivosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    amendmentType?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  let amendments: any[];
  let total: number;
  try {
    ({ amendments, total } = await getAllAmendments(
      context,
      params.status || params.amendmentType
        ? {
            status: params.status || undefined,
            amendmentType: params.amendmentType || undefined,
          }
        : undefined,
      page,
      PAGE_SIZE
    ));
  } catch {
    console.error("[clm/aditivos] Falha ao carregar dados — migrations podem não estar aplicadas");
    amendments = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aditivos Contratuais"
        description="Gerencie aditivos, anexos de endereco e retificacoes contratuais."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Aditivo criado com sucesso.
          </CardContent>
        </Card>
      )}
      {params.erro && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : "Nao foi possivel concluir a operacao."}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Rascunho", value: "rascunho" },
          { label: "Pendente Aprovacao", value: "pendente_aprovacao" },
          { label: "Aprovado", value: "aprovado" },
          { label: "Rejeitado", value: "rejeitado" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `?status=${f.value}` : "?"}
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
              (params.status ?? "") === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          {amendments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum aditivo registrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Os aditivos contratuais aparecerao aqui quando forem cadastrados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Novo Valor</TableHead>
                  <TableHead>Nova Vigencia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amendments.map((amendment) => (
                  <TableRow key={amendment.id}>
                    <TableCell>
                      {amendmentTypeLabels[amendment.amendmentType] ??
                        amendment.amendmentType}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{amendment.description}</div>
                    </TableCell>
                    <TableCell>
                      {amendment.newValue
                        ? brlFormatter.format(amendment.newValue)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {amendment.newVigenceStart && amendment.newVigenceEnd
                        ? `${new Date(amendment.newVigenceStart).toLocaleDateString("pt-BR")} a ${new Date(amendment.newVigenceEnd).toLocaleDateString("pt-BR")}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={amendment.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(amendment.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/clm/aditivos"
        totalRecords={total}
      />
    </div>
  );
}
