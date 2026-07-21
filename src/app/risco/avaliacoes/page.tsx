import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getRiskAssessments } from "@/lib/risco/queries";
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

const classificationLabels: Record<string, string> = {
  baixo: "Baixo",
  medio: "Medio",
  alto: "Alto",
  critico: "Critico",
};

const scenarioLabels: Record<string, string> = {
  otimista: "Otimista",
  base: "Base",
  pessimista: "Pessimista",
};

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    classification?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const { assessments, total } = await getRiskAssessments(
    context,
    params.status || params.classification
      ? {
          status: params.status || undefined,
          classification: params.classification || undefined,
        }
      : undefined,
    page,
    PAGE_SIZE
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliacoes de Risco"
        description="Avaliacoes de risco processual com classificacao, cenarios e valores estimados."
        actions={
          <Link
            href="/risco/avaliacoes/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Avaliacao
          </Link>
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Avaliacao de risco criada com sucesso.
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
          { label: "Em Analise", value: "em_analise" },
          { label: "Aprovado", value: "aprovado" },
          { label: "Revisao", value: "revisao" },
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
          {assessments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma avaliacao registrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie uma nova avaliacao de risco para comecar a analisar
                processos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classificacao</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Valor Estimado</TableHead>
                  <TableHead>Cenario</TableHead>
                  <TableHead>Versao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      {classificationLabels[assessment.classification] ??
                        assessment.classification}
                    </TableCell>
                    <TableCell>
                      {assessment.probability != null
                        ? `${assessment.probability}%`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {assessment.estimatedValue
                        ? brlFormatter.format(assessment.estimatedValue)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {scenarioLabels[assessment.scenario] ??
                        assessment.scenario}
                    </TableCell>
                    <TableCell>v{assessment.version}</TableCell>
                    <TableCell>
                      <StatusBadge value={assessment.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(
                        assessment.createdAt
                      ).toLocaleDateString("pt-BR")}
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
        basePath="/risco/avaliacoes"
        totalRecords={total}
      />
    </div>
  );
}
