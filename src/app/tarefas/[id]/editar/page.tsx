import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteTaskAction, getTaskById, updateTaskAction } from "@/app/tarefas/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar tarefas.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar tarefas.",
};

export default async function EditTaskPage({
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

  if (!can(context.member.role, "tarefas.gerenciar")) {
    redirect("/tarefas?erro=permissao");
  }

  const task = await getTaskById(context.lawFirm.id, id);

  if (!task) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Tarefa não encontrada" description="O registro não existe ou não está disponível." />
          <Link href="/tarefas" className="underline">
            Voltar para tarefas
          </Link>
        </div>
      </AppShell>
    );
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  const toDatetimeLocal = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toISOString().slice(0, 16);
  };

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/tarefas">
          ← Voltar para tarefas
        </Link>

        <PageHeader title={`Editar tarefa: ${task.title}`} description="Atualize os dados da tarefa." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados da tarefa</CardTitle>
            <CardDescription>Revise e atualize título, prioridade e prazo de entrega.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTaskAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="taskId" value={task.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={task.title} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={task.description ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  name="priority"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={task.priority}
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Data de entrega</Label>
                <Input id="dueAt" name="dueAt" type="datetime-local" defaultValue={toDatetimeLocal(task.due_at)} />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href="/tarefas"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {task.status !== "cancelado" ? (
          <Card className="rounded-lg border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Cancelar a tarefa a remove do fluxo de trabalho.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <Button type="submit" variant="destructive">
                  Cancelar tarefa
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
