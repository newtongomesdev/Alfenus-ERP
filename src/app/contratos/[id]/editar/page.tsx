import Link from "next/link";
import { redirect } from "next/navigation";

import { updateContractAction } from "@/app/contratos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractDetails } from "@/lib/contracts/queries";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar contratos.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar contratos.",
};

export default async function EditContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  if (!can(context.member.role, "contratos.gerenciar")) {
    redirect("/contratos?erro=permissao");
  }

  const contract = await getContractDetails(context.lawFirm.id, id);

  if (!contract) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Contrato não encontrado" description="O registro não existe ou não está disponível." />
          <Link href="/contratos" className="underline">
            Voltar para contratos
          </Link>
        </div>
      </AppShell>
    );
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href={`/contratos/${contract.id}`}>
          ← Voltar para o contrato
        </Link>

        <PageHeader title="Editar contrato" description="Atualize os dados editáveis do contrato." />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Dados do contrato</CardTitle>
              <CardDescription>Campos editáveis. Cliente, valor e parcelas não podem ser alterados após a criação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateContractAction} className="space-y-4">
                <input type="hidden" name="contractId" value={contract.id} />

                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">Serviço contratado</Label>
                  <Input id="serviceDescription" name="serviceDescription" required defaultValue={contract.serviceDescription} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    required
                    defaultValue={contract.paymentMethod ?? "pix"}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="pix">Pix</option>
                    <option value="pix_recorrente">Pix recorrente</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartão</option>
                    <option value="link_pagamento">Link de pagamento</option>
                    <option value="transferencia">Transferência</option>
                    <option value="deposito">Depósito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cheque">Cheque</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    required
                    defaultValue={contract.status}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="aguardando_assinatura">Aguardando assinatura</option>
                    <option value="ativo">Ativo</option>
                    <option value="quitado">Quitado</option>
                    <option value="inadimplente">Inadimplente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    defaultValue={contract.notes ?? ""}
                  />
                </div>

                {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

                <div className="flex gap-2">
                  <Button type="submit">Salvar alterações</Button>
                  <Link
                    href={`/contratos/${contract.id}`}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Informações somente leitura</CardTitle>
              <CardDescription>Estes campos foram definidos na criação do contrato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <Link className="underline-offset-4 hover:underline" href={`/clientes/${contract.clientId}`}>
                  {contract.clientName ?? "Cliente"}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total</span>
                <span>{formatCurrencyFromCents(contract.totalAmountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrada</span>
                <span>{formatCurrencyFromCents(contract.upfrontAmountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcelas</span>
                <span>{contract.installmentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequência</span>
                <span>{contract.frequency ?? "Não informado"}</span>
              </div>
              {contract.firstDueDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primeiro vencimento</span>
                  <span>{formatDate(contract.firstDueDate)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status atual</span>
                <StatusBadge value={contract.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{formatDate(contract.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
