import { CheckCircle2 } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { brlFormatter } from "@/lib/formatters";

import { createAccountAction } from "../actions";

export default async function ContasPage({ searchParams }: { searchParams: Promise<{ criado?: string; erro?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;

  const canEdit = can(context.member?.role ?? "visualizador", "financeiro.editar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas de Clientes"
        description="Visualize e gerencie as contas e saldos dos clientes."
      />

      {params.criado ? (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4" /> Conta criada com sucesso.
          </CardContent>
        </Card>
      ) : null}
      {params.erro ? (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : "Nao foi possivel concluir a operacao. Revise os campos e tente novamente."}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Contas"
          value={0}
          format="integer"
          detail="Contas cadastradas"
        />
        <MetricCard
          label="Saldo Total"
          value={brlFormatter.format(0)}
          detail="Soma dos saldos"
        />
        <MetricCard
          label="Contas Ativas"
          value={0}
          format="integer"
          detail="Contas em uso"
        />
        <MetricCard
          label="Contas Inativas"
          value={0}
          format="integer"
          detail="Contas encerradas"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Contas</CardTitle>
            <CardDescription>Lista de contas vinculadas a clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma conta cadastrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie a primeira conta para comecar a gerenciar valores de clientes.
              </p>
            </div>
          </CardContent>
        </Card>

        {canEdit ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Nova conta</CardTitle>
              <CardDescription>Registre uma nova conta para um cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAccountAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente</Label>
                  <select
                    id="clientId"
                    name="clientId"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    required
                  >
                    <option value="">Selecione um cliente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Nome da conta</Label>
                  <Input
                    id="accountName"
                    name="accountName"
                    placeholder="Ex.: Conta principal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Saldo inicial</Label>
                  <Input
                    id="initialBalance"
                    name="initialBalance"
                    placeholder="R$ 0,00"
                    defaultValue="0"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Criar conta
                </button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
