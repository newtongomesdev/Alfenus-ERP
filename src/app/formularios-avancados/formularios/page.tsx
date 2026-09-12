import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { getFormBuilders, getSubmissionCounts } from "@/lib/formularios/queries";
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

const formTypeLabels: Record<string, string> = {
  contato: "Contato",
  consulta: "Consulta",
  orcamento: "Orcamento",
  feedback: "Feedback",
  intake: "Intake",
  outro: "Outro",
};

export default async function FormulariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    formType?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  let formBuilders: any[];
  let total: number;
  try {
    ({ formBuilders, total } = await getFormBuilders(
      context,
      params.formType ? { formType: params.formType } : undefined,
      page,
      PAGE_SIZE
    ));
  } catch {
    console.error("[formularios-avancados/formularios] Falha ao carregar dados — migrations podem não estar aplicadas");
    formBuilders = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let submissionCounts: Record<string, number> = {};
  try {
    submissionCounts = await getSubmissionCounts(
      context,
      formBuilders.map((f) => f.id)
    );
  } catch {
    console.error("[formularios-avancados/formularios] Falha ao carregar contagens — migrations podem não estar aplicadas");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formularios"
        description="Gerencie formularios avancados, campos, submissoes e links publicos."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Formulario criado com sucesso.
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
          { label: "Contato", value: "contato" },
          { label: "Consulta", value: "consulta" },
          { label: "Orcamento", value: "orcamento" },
          { label: "Feedback", value: "feedback" },
          { label: "Intake", value: "intake" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `?formType=${f.value}` : "?"}
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
              (params.formType ?? "") === f.value
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
          {formBuilders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum formulario cadastrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um novo formulario para comecar a receber submissoes.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Area Juridica</TableHead>
                  <TableHead>Submissoes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formBuilders.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div className="font-medium">{form.name}</div>
                      {form.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                          {form.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {formTypeLabels[form.formType] ?? form.formType}
                    </TableCell>
                    <TableCell>{form.legalArea ?? "—"}</TableCell>
                    <TableCell>{submissionCounts[form.id] ?? 0}</TableCell>
                    <TableCell>
                      <StatusBadge value={form.isActive ? "ativo" : "inativo"} />
                    </TableCell>
                    <TableCell>
                      {new Date(form.createdAt).toLocaleDateString("pt-BR")}
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
        basePath="/formularios-avancados/formularios"
        totalRecords={total}
      />
    </div>
  );
}
