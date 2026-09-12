import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PoliticasPage({
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
        title="Politicas de Retencao"
        description="Defina e gerencie politicas de retencao e exclusao de dados pessoais."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Politica criada com sucesso.
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
          label="Politicas Ativas"
          value={0}
          format="integer"
          detail="Politicas vigentes"
        />
        <MetricCard
          label="Inativas"
          value={0}
          format="integer"
          detail="Politicas desativadas"
        />
        <MetricCard
          label="Total"
          value={0}
          format="integer"
          detail="Todas as politicas"
        />
      </section>

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma politica de retencao configurada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As politicas de retencao de dados aparecerao nesta lista.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
