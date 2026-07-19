import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteDeadlineAction, getDeadlineById, updateDeadlineAction } from "@/app/prazos/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar prazos.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar prazos.",
};

export default async function EditDeadlinePage({
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

  if (!can(context.member.role, "prazos.editar")) {
    redirect("/prazos?erro=permissao");
  }

  const deadline = await getDeadlineById(context.lawFirm.id, id);

  if (!deadline) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Prazo não encontrado" description="O registro não existe ou não está disponível." />
          <Link href="/prazos" className="underline">
            Voltar para prazos
          </Link>
        </div>
      </AppShell>
    );
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/prazos">
          ← Voltar para prazos
        </Link>

        <PageHeader title={`Editar prazo: ${deadline.title}`} description="Atualize os dados do prazo." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do prazo</CardTitle>
            <CardDescription>Revise e atualize título, data limite e prioridade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateDeadlineAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="deadlineId" value={deadline.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={deadline.title} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo do prazo</Label>
                <select
                  id="type"
                  name="type"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={deadline.type}
                >
                  <option value="" disabled>
                    Selecione o tipo
                  </option>
                  <option value="audiencia">Audiência</option>
                  <option value="julgamento">Julgamento</option>
                  <option value="contestacao">Contestação</option>
                  <option value="recurso">Recurso</option>
                  <option value="pericia">Perícia</option>
                  <option value="diligencia">Diligência</option>
                  <option value="entrega">Entrega de documentos</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  name="priority"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={deadline.priority}
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Data limite</Label>
                <Input id="dueDate" name="dueDate" type="date" required defaultValue={deadline.due_date} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueTime">Horário</Label>
                <Input id="dueTime" name="dueTime" type="time" defaultValue={deadline.due_time ?? ""} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={deadline.description ?? ""}
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href="/prazos"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {deadline.status !== "cancelado" && deadline.status !== "concluido" ? (
          <Card className="rounded-lg border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Cancelar o prazo o remove do fluxo de trabalho.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteDeadlineAction}>
                <input type="hidden" name="deadlineId" value={deadline.id} />
                <Button type="submit" variant="destructive">
                  Cancelar prazo
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
