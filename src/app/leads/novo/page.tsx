import Link from "next/link";

import { createLeadAction } from "@/app/leads/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de criar leads.",
  permissao: "Seu papel não tem permissão para criar leads.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  criacao: "Não foi possível criar o lead. Tente novamente.",
};

function NewLeadUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para salvar leads."
      : status === "signed-out"
        ? "Entre para cadastrar leads."
        : "Crie o primeiro escritório antes de cadastrar leads.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Novo lead" description="Cadastre uma oportunidade comercial sem misturar cliente ou contrato." />
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

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  let context: Awaited<ReturnType<typeof getAppContext>>;
  try {
    context = await getAppContext();
  } catch {
    return (
      <AppShell memberName={null}>
        <div className="space-y-6">
          <PageHeader title="Novo lead" description="Cadastre uma oportunidade comercial." />
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <NewLeadUnavailable status={context.status} />;
  }

  const errorMessage = params.erro ? errorMessages[params.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader title="Novo lead" description="Cadastre a oportunidade comercial. Cliente, processo e contrato continuam como entidades separadas." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do lead</CardTitle>
            <CardDescription>Use campos previsíveis para qualificar a oportunidade desde o primeiro contato.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createLeadAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do lead</Label>
                <Input id="name" name="name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="(11) 99999-9999" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 3333-3333" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <select
                  id="source"
                  name="source"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione uma origem
                  </option>
                  <option value="indicação">Indicação</option>
                  <option value="site">Site</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="interest">Ação ou área de interesse</Label>
                <Input id="interest" name="interest" placeholder="Ex.: trabalhista, previdenciário, família" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funnelStage">Etapa do funil</Label>
                <select
                  id="funnelStage"
                  name="funnelStage"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue="novo"
                >
                  <option value="novo">Novo</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="qualificado">Qualificado</option>
                  <option value="proposta_enviada">Proposta enviada</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="probability">Probabilidade</Label>
                <Input id="probability" name="probability" type="number" min={0} max={100} defaultValue={0} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Valor estimado</Label>
                <Input id="estimatedValue" name="estimatedValue" inputMode="numeric" placeholder="R$ 0,00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextContactAt">Próximo contato</Label>
                <Input id="nextContactAt" name="nextContactAt" type="datetime-local" />
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
                <Button type="submit">Salvar lead</Button>
                <Link
                  href="/leads"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
