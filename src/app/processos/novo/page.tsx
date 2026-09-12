import Link from "next/link";

import { createProcessAction } from "@/app/processos/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataJudLookup } from "@/components/datajud-lookup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getClients } from "@/lib/clients/queries";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de criar processos.",
  permissao: "Seu papel não tem permissão para criar processos.",
  validacao: "Revise os campos obrigatórios. Processos judiciais exigem número.",
  criacao: "Não foi possível criar o processo. Tente novamente.",
};

function NewProcessUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para salvar processos."
      : status === "signed-out"
        ? "Entre para cadastrar processos."
        : "Crie o primeiro escritório antes de cadastrar processos.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Novo processo" description="Cadastre processo judicial ou caso extrajudicial vinculado a um cliente." />
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

export default async function NewProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; clientId?: string }>;
}) {
  const params = await searchParams;

  let context: Awaited<ReturnType<typeof getAppContext>>;
  let clients: Array<{ id: string; name: string }> = [];

  try {
    context = await getAppContext();
  } catch {
    return (
      <AppShell memberName={null}>
        <div className="space-y-6">
          <PageHeader title="Novo processo" description="Cadastre processo judicial ou caso extrajudicial." />
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
    return <NewProcessUnavailable status={context.status} />;
  }

  try {
    const result = await getClients(context.lawFirm.id);
    clients = result.items;
  } catch {
    clients = [];
  }
  const errorMessage = params.erro ? errorMessages[params.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader title="Novo processo" description="Vincule o processo a um cliente. Contrato, prazos e documentos entram em fluxos próprios." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do processo</CardTitle>
            <CardDescription>Use judicial para processos com número e extrajudicial para casos sem numeração judicial.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProcessAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clientId">Cliente</Label>
                <select
                  id="clientId"
                  name="clientId"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={params.clientId ?? ""}
                  required
                >
                  <option value="" disabled>
                    Selecione um cliente
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Cadastre um cliente antes de criar processos.</p>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Nome interno</Label>
                <Input id="title" name="title" placeholder="Ex.: Revisão contratual - Silva" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseKind">Tipo de caso</Label>
                <select
                  id="caseKind"
                  name="caseKind"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue="judicial"
                >
                  <option value="judicial">Judicial</option>
                  <option value="extrajudicial">Extrajudicial</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionType">Tipo de ação ou assunto</Label>
                <Input id="actionType" name="actionType" placeholder="Ex.: Reclamação trabalhista" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseNumber">Número do processo</Label>
                <Input id="caseNumber" name="caseNumber" placeholder="0000000-00.0000.0.00.0000" />
                <p className="text-xs text-muted-foreground">Obrigatório para processo judicial.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="court">Tribunal</Label>
                <Input id="court" name="court" placeholder="Ex.: TJSP, TRT-2" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtDivision">Vara</Label>
                <Input id="courtDivision" name="courtDivision" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">Comarca</Label>
                <Input id="district" name="district" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" name="state" maxLength={2} placeholder="SP" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startedAt">Data de início</Label>
                <Input id="startedAt" name="startedAt" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue="em_analise"
                >
                  <option value="em_analise">Em análise</option>
                  <option value="documentacao_pendente">Documentação pendente</option>
                  <option value="ajuizamento">Ajuizamento</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="aguardando_decisao">Aguardando decisão</option>
                  <option value="audiencia_marcada">Audiência marcada</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  name="priority"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue="normal"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opposingParty">Parte contrária</Label>
                <Input id="opposingParty" name="opposingParty" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opposingLawyer">Advogado da parte contrária</Label>
                <Input id="opposingLawyer" name="opposingLawyer" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" name="tags" placeholder="urgente, trabalhista, audiência" />
                <p className="text-xs text-muted-foreground">Separe tags por vírgula.</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="strategicNotes">Observações estratégicas</Label>
                <textarea
                  id="strategicNotes"
                  name="strategicNotes"
                  rows={4}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={clients.length === 0}>
                  Salvar processo
                </Button>
                <Link
                  href="/processos"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        <DataJudLookup />
      </div>
    </AppShell>
  );
}
