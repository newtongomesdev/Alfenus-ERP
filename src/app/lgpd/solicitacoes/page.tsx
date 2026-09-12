import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
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

const requestTypeLabels: Record<string, string> = {
  acesso: "Acesso aos dados",
  retificacao: "Retificacao",
  exclusao: "Exclusao",
  portabilidade: "Portabilidade",
  informacao: "Informacao sobre compartilhamento",
  revogacao: "Revogacao de consentimento",
};

export default async function SolicitacoesLgpdPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    type?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitacoes de Titulares"
        description="Acompanhe as solicitacoes de titulares de dados conforme a LGPD."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Solicitacao registrada com sucesso.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Pendentes"
          value={0}
          format="integer"
          detail="Aguardando resposta"
        />
        <MetricCard
          label="Em Andamento"
          value={0}
          format="integer"
          detail="Sendo processadas"
        />
        <MetricCard
          label="Concluidas"
          value={0}
          format="integer"
          detail="Solicitacoes finalizadas"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Pendente", value: "pendente" },
          { label: "Em Andamento", value: "em_andamento" },
          { label: "Concluido", value: "concluido" },
          { label: "Indeferido", value: "indeferido" },
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
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma solicitacao registrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As solicitacoes dos titulares de dados aparecerao nesta lista.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
