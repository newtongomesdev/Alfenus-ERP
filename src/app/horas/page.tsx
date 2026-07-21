import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { formatCurrencyFromCents, formatDateTime } from "@/lib/formatters";
import { getTimeEntries } from "@/lib/time-entries/queries";

import { createTimeEntryAction } from "./actions";

function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default async function TimeEntriesPage() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Horas" description="Controle de horas trabalhadas e faturáveis." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>Entrar no escritório</Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const data = await getTimeEntries(context.lawFirm.id);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Horas"
          description="Registre esforço por cliente, processo e responsável."
          actions={
            <Link
              href="/horas/relatorio"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted"
            >
              Ver relatório
            </Link>
          }
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horas registradas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{hoursLabel(data.totals.minutes)}</p><p className="mt-1 text-xs text-muted-foreground">Últimos 100 lançamentos</p></CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horas faturáveis</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{hoursLabel(data.totals.billableMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">Desconsidera canceladas e não faturáveis</p></CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor estimado</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{formatCurrencyFromCents(data.totals.amountCents)}</p><p className="mt-1 text-xs text-muted-foreground">Baseado no valor hora informado</p></CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Lançamentos recentes</CardTitle>
              <CardDescription>Horas por responsável, cliente e processo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.entries.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma hora registrada.</p> : null}
                {data.entries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{entry.memberName} · {entry.clientName ?? "Sem cliente"} · {entry.caseTitle ?? "Sem processo"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.startedAt)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{hoursLabel(entry.durationMinutes)}</p>
                      <p className="text-muted-foreground">{entry.billable ? formatCurrencyFromCents(entry.amountCents) : "Não faturável"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-lg">
            <CardHeader>
              <CardTitle>Novo lançamento</CardTitle>
              <CardDescription>Registre horas manualmente.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTimeEntryAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex.: Preparação de audiência" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startedAt">Início</Label>
                    <Input id="startedAt" name="startedAt" type="datetime-local" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Minutos</Label>
                    <Input id="durationMinutes" name="durationMinutes" type="number" min={1} defaultValue={60} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Valor hora</Label>
                  <Input id="hourlyRate" name="hourlyRate" type="number" min={0} step="0.01" placeholder="350.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberId">Responsável</Label>
                  <select id="memberId" name="memberId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                    {data.members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente</Label>
                  <select id="clientId" name="clientId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                    <option value="">Sem cliente</option>
                    {data.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalCaseId">Processo</Label>
                  <select id="legalCaseId" name="legalCaseId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                    <option value="">Sem processo</option>
                    {data.legalCases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input name="billable" type="checkbox" defaultChecked />
                  Faturável
                </label>
                <Button type="submit" className="w-full">Registrar horas</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
