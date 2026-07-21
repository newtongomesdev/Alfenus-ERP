import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getObligations } from "@/lib/clm/queries";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
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

const periodicityLabels: Record<string, string> = {
  unica: "Unica",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export default async function ObrigacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const { obligations, total } = await getObligations(context, undefined, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCount = (s: string) =>
    obligations.filter((o) => o.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obrigacoes Contratuais"
        description="Acompanhe obrigacoes contratuais, prazos e responsaveis."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Obrigacao criada com sucesso.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total"
          value={total}
          format="integer"
          detail="Obrigacoes cadastradas"
        />
        <MetricCard
          label="Pendentes"
          value={statusCount("pendente")}
          format="integer"
          detail="Aguardando execucao"
        />
        <MetricCard
          label="Em Andamento"
          value={statusCount("em_andamento")}
          format="integer"
          detail="Em execucao"
        />
        <MetricCard
          label="Concluidas"
          value={statusCount("concluida")}
          format="integer"
          detail="Obrigacoes finalizadas"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Pendente", value: "pendente" },
          { label: "Em Andamento", value: "em_andamento" },
          { label: "Concluida", value: "concluida" },
          { label: "Atrasada", value: "atrasada" },
          { label: "Isenta", value: "isenta" },
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
          {obligations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma obrigacao registrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                As obrigacoes contratuais aparecerao aqui quando forem cadastradas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Data Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.map((obligation) => (
                  <TableRow key={obligation.id}>
                    <TableCell>
                      <div className="font-medium">{obligation.description}</div>
                    </TableCell>
                    <TableCell>
                      {periodicityLabels[obligation.periodicity ?? ""] ?? "—"}
                    </TableCell>
                    <TableCell>{obligation.responsibleParty ?? "—"}</TableCell>
                    <TableCell>
                      {obligation.dueDate
                        ? new Date(obligation.dueDate).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={obligation.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(obligation.createdAt).toLocaleDateString("pt-BR")}
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
        basePath="/clm/obrigacoes"
        totalRecords={total}
      />
    </div>
  );
}
