import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ConsentimentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consentimentos"
        description="Registre e acompanhe os consentimentos dos titulares de dados."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Consentimento registrado com sucesso.
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
          label="Consentimentos Ativos"
          value={0}
          format="integer"
          detail="Consentimentos vigentes"
        />
        <MetricCard
          label="Revogados"
          value={0}
          format="integer"
          detail="Consentimentos revogados"
        />
        <MetricCard
          label="Total"
          value={0}
          format="integer"
          detail="Todos os consentimentos"
        />
      </section>

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhum consentimento registrado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os consentimentos dos titulares de dados aparecerao nesta lista.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
