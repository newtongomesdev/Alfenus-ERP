import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createContractAction } from "@/app/contratos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractFormOptions } from "@/lib/contracts/queries";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de criar contratos.",
  permissao: "Seu papel não tem permissão para gerenciar contratos.",
  validacao: "Revise os campos obrigatórios, valores e vencimento.",
  criacao: "Não foi possível criar o contrato. Tente novamente.",
  parcelas: "O contrato foi iniciado, mas não foi possível gerar as parcelas.",
};

function NewContractUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para criar contratos."
      : status === "signed-out"
        ? "Entre para criar contratos."
        : "Crie o primeiro escritório antes de criar contratos.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Novo contrato" description="Cadastre honorários e gere parcelas automaticamente." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            {status !== "missing-env" ? (
              <Link
                href={href}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                {action}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <NewContractUnavailable status={context.status} />;
  }

  if (!can(context.member.role, "contratos.gerenciar")) {
    return <NewContractUnavailable status="forbidden" />;
  }

  const options = await getContractFormOptions(context.lawFirm.id);
  const errorMessage = params.erro ? errorMessages[params.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/contratos">
          <ArrowLeft className="size-4" />
          Voltar para contratos
        </Link>

        <PageHeader
          title="Novo contrato"
          description="Registre honorários, entrada, parcelamento e vínculo com cliente ou processo."
        />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do contrato</CardTitle>
            <CardDescription>As parcelas são criadas junto com o contrato para alimentar recebimentos e inadimplência.</CardDescription>
          </CardHeader>
          <CardContent>
            {options.clients.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6">
                <p className="font-medium">Cadastre um cliente antes do contrato.</p>
                <p className="mt-1 text-sm text-muted-foreground">Todo contrato precisa estar vinculado a um cliente do escritório.</p>
                <Link
                  href="/clientes/novo"
                  className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
                >
                  Novo cliente
                </Link>
              </div>
            ) : (
              <form action={createContractAction} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clientId">Cliente</Label>
                  <select
                    id="clientId"
                    name="clientId"
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="">Selecione um cliente</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="legalCaseId">Processo ou caso vinculado</Label>
                  <select
                    id="legalCaseId"
                    name="legalCaseId"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="">Sem processo vinculado</option>
                    {options.legalCases.map((legalCase) => (
                      <option key={legalCase.id} value={legalCase.id}>
                        {legalCase.title}
                        {legalCase.caseNumber ? ` - ${legalCase.caseNumber}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="serviceDescription">Serviço contratado</Label>
                  <Input id="serviceDescription" name="serviceDescription" placeholder="Honorários para ação previdenciária" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Valor total</Label>
                  <Input id="totalAmount" name="totalAmount" inputMode="decimal" placeholder="5.000,00" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upfrontAmount">Entrada</Label>
                  <Input id="upfrontAmount" name="upfrontAmount" inputMode="decimal" placeholder="1.000,00" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installmentsCount">Quantidade de parcelas</Label>
                  <Input id="installmentsCount" name="installmentsCount" type="number" min={1} max={60} defaultValue={1} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstDueDate">Primeiro vencimento</Label>
                  <Input id="firstDueDate" name="firstDueDate" type="date" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência</Label>
                  <select
                    id="frequency"
                    name="frequency"
                    defaultValue="mensal"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="unica">Única</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    defaultValue="pix"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue="ativo"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="aguardando_assinatura">Aguardando assinatura</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successFee">Êxito ou observação de honorários</Label>
                  <Input id="successFee" name="successFee" placeholder="20% sobre proveito econômico" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                </div>

                {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit">Criar contrato</Button>
                  <Link
                    href="/contratos"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
