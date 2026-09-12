import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateProcessAction } from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getLegalCaseForEdit } from "@/lib/legal-case/queries";
import { getClients } from "@/lib/clients/queries";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de editar processos.",
  permissao: "Seu papel não tem permissão para editar processos.",
  validacao: "Revise os campos obrigatórios. Processos judiciais exigem número.",
  atualizacao: "Não foi possível atualizar o processo. Tente novamente.",
  processo: "Processo não encontrado.",
};

export default async function EditProcessPage({
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

  const [legalCase, clientsResult] = await Promise.all([
    getLegalCaseForEdit(context.lawFirm.id, id),
    getClients(context.lawFirm.id),
  ]);
  const clients = clientsResult.items;

  if (!legalCase) notFound();

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link
          href={`/processos/${id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar para o processo
        </Link>

        <PageHeader
          title="Editar processo"
          description={`Editando: ${legalCase.title}`}
        />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do processo</CardTitle>
            <CardDescription>Atualize as informações do processo judicial ou caso extrajudicial.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProcessAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="processId" value={id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clientId">Cliente</Label>
                <select
                  id="clientId"
                  name="clientId"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={legalCase.clientId ?? ""}
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
                <Input id="title" name="title" placeholder="Ex.: Revisão contratual - Silva" defaultValue={legalCase.title} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseKind">Tipo de caso</Label>
                <select
                  id="caseKind"
                  name="caseKind"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={legalCase.caseKind}
                >
                  <option value="judicial">Judicial</option>
                  <option value="extrajudicial">Extrajudicial</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionType">Tipo de ação ou assunto</Label>
                <Input id="actionType" name="actionType" placeholder="Ex.: Reclamação trabalhista" defaultValue={legalCase.actionType} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseNumber">Número do processo</Label>
                <Input id="caseNumber" name="caseNumber" placeholder="0000000-00.0000.0.00.0000" defaultValue={legalCase.caseNumber ?? ""} />
                <p className="text-xs text-muted-foreground">Obrigatório para processo judicial.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="court">Tribunal</Label>
                <Input id="court" name="court" placeholder="Ex.: TJSP, TRT-2" defaultValue={legalCase.court ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtDivision">Vara</Label>
                <Input id="courtDivision" name="courtDivision" defaultValue={legalCase.courtDivision ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">Comarca</Label>
                <Input id="district" name="district" defaultValue={legalCase.district ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" name="state" maxLength={2} placeholder="SP" defaultValue={legalCase.state ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startedAt">Data de início</Label>
                <Input id="startedAt" name="startedAt" type="date" defaultValue={legalCase.startedAt ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={legalCase.status}
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
                  defaultValue={legalCase.priority}
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opposingParty">Parte contrária</Label>
                <Input id="opposingParty" name="opposingParty" defaultValue={legalCase.opposingParty ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opposingLawyer">Advogado da parte contrária</Label>
                <Input id="opposingLawyer" name="opposingLawyer" defaultValue={legalCase.opposingLawyer ?? ""} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" name="tags" placeholder="urgente, trabalhista, audiência" defaultValue={legalCase.tags} />
                <p className="text-xs text-muted-foreground">Separe tags por vírgula.</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="strategicNotes">Observações estratégicas</Label>
                <textarea
                  id="strategicNotes"
                  name="strategicNotes"
                  rows={4}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={legalCase.strategicNotes ?? ""}
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={clients.length === 0}>
                  Salvar alterações
                </Button>
                <Link
                  href={`/processos/${id}`}
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
