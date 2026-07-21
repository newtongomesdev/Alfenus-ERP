import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckCircle2 } from "lucide-react";

import { cancelContractAction } from "@/app/contratos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractDetails } from "@/lib/contracts/queries";
import { getFinancialSummaryByContract } from "@/lib/finance/queries";
import { formatCurrencyFromCents, formatDate, formatDateTime } from "@/lib/formatters";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let context: Awaited<ReturnType<typeof getAppContext>>;
  try {
    context = await getAppContext();
  } catch {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Contrato" description="Detalhes do contrato." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  let contract: Awaited<ReturnType<typeof getContractDetails>>;
  let financialSummary: Awaited<ReturnType<typeof getFinancialSummaryByContract>>;

  try {
    contract = await getContractDetails(context.lawFirm.id, id);
    financialSummary = await getFinancialSummaryByContract(context.lawFirm.id, id);
  } catch {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Contrato" description="Detalhes do contrato." />
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Ocorreu um erro ao carregar os detalhes do contrato. Tente novamente mais tarde.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

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

  const canManage = can(context.member.role, "contratos.gerenciar");

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/contratos">
          ← Voltar para contratos
        </Link>

        {query.editado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="flex items-center gap-2 p-4 text-sm">
              <CheckCircle2 className="size-4" /> Contrato atualizado com sucesso.
            </CardContent>
          </Card>
        ) : null}

        <PageHeader
          title={contract.serviceDescription}
          description={`Contrato com ${contract.clientName ?? "cliente"} · Criado em ${formatDate(contract.createdAt)}`}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(contract.totalAmountCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(contract.upfrontAmountCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo em aberto</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(contract.balanceCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrencyFromCents(contract.overdueAmountCents)}</p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Informações do contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge value={contract.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <Link className="underline-offset-4 hover:underline" href={`/clientes/${contract.clientId}`}>
                  {contract.clientName ?? "Cliente"}
                </Link>
              </div>
              {contract.legalCaseTitle ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processo</span>
                  <Link className="underline-offset-4 hover:underline" href={`/processos/${contract.legalCaseId}`}>
                    {contract.legalCaseTitle}
                  </Link>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma de pagamento</span>
                <span>{contract.paymentMethod ?? "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequência</span>
                <span>{contract.frequency ?? "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcelas</span>
                <span>{contract.installmentsCount} ({contract.openInstallments} em aberto)</span>
              </div>
              {contract.successFee ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Êxito</span>
                  <span>{contract.successFee}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em</span>
                <span>{formatDateTime(contract.updatedAt)}</span>
              </div>
              {contract.notes ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1">Observações</p>
                  <p className="whitespace-pre-wrap">{contract.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>Gerencie o status do contrato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManage && contract.status !== "cancelado" && contract.status !== "quitado" ? (
                <>
                  <Link
                    href={`/contratos/${contract.id}/editar`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Editar contrato
                  </Link>
                  <ConfirmSubmitButton
                    formId="cancel-contract-form"
                    title="Cancelar contrato"
                    description="Tem certeza que deseja cancelar este contrato? Esta ação não pode ser desfeita."
                    confirmLabel="Cancelar contrato"
                    variant="destructive"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-destructive px-3 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90"
                  >
                    Cancelar contrato
                  </ConfirmSubmitButton>
                  <form id="cancel-contract-form" action={cancelContractAction} className="hidden">
                    <input type="hidden" name="contractId" value={contract.id} />
                  </form>
                </>
              ) : null}
              {!canManage ? (
                <p className="text-sm text-muted-foreground">Sem permissão para gerenciar contratos.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {contract.installments.length > 0 ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Parcelas</CardTitle>
              <CardDescription>
                {contract.installments.length} parcela(s) registrada(s).
                {financialSummary ? ` · Pago: ${formatCurrencyFromCents(financialSummary.paidAmountCents)} · Em aberto: ${formatCurrencyFromCents(financialSummary.pendingAmountCents)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.installments.map((installment) => {
                    const remaining = Math.max(installment.finalAmountCents - installment.paidAmountCents, 0);
                    const isOverdue = remaining > 0 && new Date(`${installment.dueDate}T00:00:00`) < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
                    const displayStatus = isOverdue ? "atrasada" : installment.status;
                    return (
                      <TableRow key={installment.id}>
                        <TableCell>{installment.number}</TableCell>
                        <TableCell>{formatCurrencyFromCents(installment.finalAmountCents)}</TableCell>
                        <TableCell>{formatCurrencyFromCents(installment.paidAmountCents)}</TableCell>
                        <TableCell className={remaining > 0 ? "font-medium" : "text-muted-foreground"}>
                          {formatCurrencyFromCents(remaining)}
                        </TableCell>
                        <TableCell>{formatDate(installment.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge value={displayStatus} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
