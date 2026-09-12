import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ThreadsPage({
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threads"
        description="Conversas agrupadas por assunto. Acompanhe discussoes da equipe."
        actions={
          <Link
            href="/comunicacao-avancada/nova"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Nova Thread
          </Link>
        }
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Thread criada com sucesso.
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
          label="Threads Ativas"
          value={0}
          format="integer"
          detail="Discussoes em andamento"
        />
        <MetricCard
          label="Total Mensagens"
          value={0}
          format="integer"
          detail="Mensagens em threads"
        />
        <MetricCard
          label="Arquivadas"
          value={0}
          format="integer"
          detail="Threads finalizadas"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todas", value: "" },
          { label: "Ativa", value: "ativa" },
          { label: "Arquivada", value: "arquivada" },
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
            <p className="font-medium">Nenhuma thread registrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As threads de conversa aparecerao nesta lista.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
