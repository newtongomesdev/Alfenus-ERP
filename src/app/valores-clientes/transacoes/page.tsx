import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { brlFormatter } from "@/lib/formatters";

import { createTransactionAction } from "../actions";

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    criado?: string;
    aprovado?: string;
    erro?: string;
    tipo?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  const canEdit = can(context.member?.role ?? "visualizador", "financeiro.editar");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacoes"
        description="Registre entradas, saidas e transferencias entre contas de clientes."
        actions={
          canEdit ? (
            <Link
              href="#nova-transacao"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Nova transacao
            </Link>
          ) : undefined
        }
      />

      {params.criado ? (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4" /> Transacao registrada com sucesso.
          </CardContent>
        </Card>
      ) : null}
      {params.aprovado ? (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4" /> Transacao processada.
          </CardContent>
        </Card>
      ) : null}
      {params.erro ? (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : params.erro === "saldo"
                ? "Saldo insuficiente para esta operacao."
                : "Nao foi possivel concluir a operacao. Revise os campos e tente novamente."}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Transacoes"
          value={0}
          format="integer"
          detail="Transacoes registradas"
        />
        <MetricCard
          label="Entradas"
          value={brlFormatter.format(0)}
          detail="Valor total de entradas"
        />
        <MetricCard
          label="Saidas"
          value={brlFormatter.format(0)}
          detail="Valor total de saidas"
        />
        <MetricCard
          label="Pendentes Aprovacao"
          value={0}
          format="integer"
          detail="Aguardando aprovacao"
        />
      </section>

      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine a busca por tipo ou periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterTipo">Tipo</Label>
              <select
                id="filterTipo"
                name="tipo"
                defaultValue={params.tipo ?? ""}
                className="flex h-9 min-w-32 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterDe">Data a partir de</Label>
              <Input id="filterDe" name="de" type="date" defaultValue={params.de ?? ""} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterAte">Data ate</Label>
              <Input id="filterAte" name="ate" type="date" defaultValue={params.ate ?? ""} className="h-9" />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Filtrar
            </button>
            {(params.tipo || params.de || params.ate) ? (
              <Link
                href="/valores-clientes/transacoes"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted"
              >
                Limpar
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Transacoes</CardTitle>
          <CardDescription>Historico de transacoes entre contas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma transacao registrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre a primeira transacao para comecar a acompanhar movimentacoes.
            </p>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <Card className="rounded-lg" id="nova-transacao">
          <CardHeader>
            <CardTitle>Nova transacao</CardTitle>
            <CardDescription>Registre uma movimentacao financeira.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTransactionAction} className="space-y-4">
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
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    name="type"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saida</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" name="amount" placeholder="R$ 0,00" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descricao</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Ex.: Pagamento de honorarios"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Transacoes acima de R$ 5.000,00 ficam pendentes de aprovacao.
              </p>
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Registrar transacao
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
