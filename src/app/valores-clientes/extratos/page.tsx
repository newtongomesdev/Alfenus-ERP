import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

import { generateStatementAction } from "../actions";

export default async function ExtratosPage({
  searchParams,
}: {
  searchParams: Promise<{
    gerado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  const canEdit = can(context.member?.role ?? "visualizador", "financeiro.editar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extratos"
        description="Gere e consulte extratos por periodo e conta de cliente."
        actions={
          canEdit ? (
            <Link
              href="#gerar-extrato"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Gerar extrato
            </Link>
          ) : undefined
        }
      />

      {params.gerado ? (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4" /> Extrato gerado com sucesso.
          </CardContent>
        </Card>
      ) : null}
      {params.erro ? (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : params.erro === "periodo"
                ? "O periodo final deve ser posterior ao periodo inicial."
                : "Nao foi possivel gerar o extrato. Revise os campos e tente novamente."}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Extratos"
          value={0}
          format="integer"
          detail="Extratos gerados"
        />
        <MetricCard
          label="Gerados"
          value={0}
          format="integer"
          detail="Aguardando revisao"
        />
        <MetricCard
          label="Revisados"
          value={0}
          format="integer"
          detail="Extratos validados"
        />
        <MetricCard
          label="Periodo Coberto"
          value="-"
          detail="Meses com extrato"
        />
      </section>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Extratos Gerados</CardTitle>
          <CardDescription>Lista de extratos por periodo e conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhum extrato gerado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere o primeiro extrato para comecar a acompanhar o historico financeiro.
            </p>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <Card className="rounded-lg" id="gerar-extrato">
          <CardHeader>
            <CardTitle>Gerar extrato</CardTitle>
            <CardDescription>Crie um extrato para uma conta em um periodo especifico.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={generateStatementAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId">Conta</Label>
                <select
                  id="accountId"
                  name="accountId"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione uma conta</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Periodo inicial</Label>
                  <Input id="periodStart" name="periodStart" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Periodo final</Label>
                  <Input id="periodEnd" name="periodEnd" type="date" required />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Gerar extrato
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
