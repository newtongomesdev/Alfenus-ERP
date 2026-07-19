import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteAppointmentAction, getAppointmentById, updateAppointmentAction } from "@/app/agenda/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar compromissos.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar compromissos.",
};

export default async function EditAppointmentPage({
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

  if (!can(context.member.role, "agenda.editar")) {
    redirect("/agenda?erro=permissao");
  }

  const appointment = await getAppointmentById(context.lawFirm.id, id);

  if (!appointment) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Compromisso não encontrado" description="O registro não existe ou não está disponível." />
          <Link href="/agenda" className="underline">
            Voltar para agenda
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
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/agenda">
          ← Voltar para agenda
        </Link>

        <PageHeader title={`Editar compromisso: ${appointment.title}`} description="Atualize os dados do compromisso." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do compromisso</CardTitle>
            <CardDescription>Revise e atualize título, tipo e data/hora.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAppointmentAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="appointmentId" value={appointment.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={appointment.title} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  name="type"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={appointment.type}
                >
                  <option value="reuniao">Reunião</option>
                  <option value="audiencia">Audiência</option>
                  <option value="retorno">Retorno</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startsAt">Data e hora início</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={toDatetimeLocal(appointment.starts_at)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endsAt">Data e hora fim</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toDatetimeLocal(appointment.ends_at)} />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href="/agenda"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {appointment.status !== "cancelado" ? (
          <Card className="rounded-lg border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Cancelar o compromisso o remove da agenda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteAppointmentAction}>
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <Button type="submit" variant="destructive">
                  Cancelar compromisso
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
