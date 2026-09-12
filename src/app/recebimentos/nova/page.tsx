import { ArrowLeft, CircleDollarSign } from "lucide-react";
import Link from "next/link";

import { createQuickChargeAction } from "@/app/recebimentos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractFormOptions } from "@/lib/contracts/queries";

import { QuickChargeForm } from "./quick-charge-form";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de criar cobranças.",
  permissao: "Seu papel não tem permissão para criar cobranças.",
  validacao: "Informe cliente, serviço, valor, vencimento e forma de pagamento.",
  cliente: "O cliente selecionado não pertence ao escritório atual.",
  criacao: "Não foi possível criar a cobrança. Tente novamente.",
};

export default async function NewQuickChargePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const context = await getAppContext();
  const params = await searchParams;

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <AppShell memberName={null}><PageHeader title="Nova cobrança" description="Registre um valor a receber de forma simples." /></AppShell>;
  }

  const options = await getContractFormOptions(context.lawFirm.id);
  const canCreate = can(context.member.role, "contratos.gerenciar");
  const errorMessage = params.erro ? errorMessages[params.erro] : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/recebimentos">
          <ArrowLeft className="size-4" />
          Voltar para recebimentos
        </Link>
        <PageHeader title="Nova cobrança" description="Para consultas, diligências, pareceres e outros honorários pontuais." />
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><CircleDollarSign className="size-5" /></div>
              <div><CardTitle>Cobrança rápida</CardTitle><CardDescription>Crie uma cobrança à vista ou parcelada para acompanhar e emitir recibos.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            {!canCreate ? <p className="text-sm text-muted-foreground">Seu papel não pode criar cobranças.</p> : options.clients.length === 0 ? <div className="rounded-lg border border-dashed p-6"><p className="font-medium">Cadastre um cliente antes de cobrar.</p><Link className="mt-3 inline-flex text-sm underline underline-offset-4" href="/clientes/novo">Cadastrar cliente</Link></div> : (
              <QuickChargeForm
                clients={options.clients}
                today={today}
                errorMessage={errorMessage}
                createQuickChargeAction={createQuickChargeAction}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
