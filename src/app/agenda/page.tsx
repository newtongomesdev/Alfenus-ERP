import Link from "next/link";

import { CalendarMonthly } from "@/components/calendar-monthly";
import { CalendarWeekly } from "@/components/calendar-weekly";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getAppointments } from "@/lib/appointments/queries";
import { getDeadlineOptions } from "@/lib/deadlines/queries";
import { getModuleOverview } from "@/lib/modules/queries";
import { formatDateTime } from "@/lib/formatters";

import { createAppointmentAction } from "./actions";

type ViewType = "lista" | "mensal" | "semanal";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; erro?: string; view?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  ) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Agenda" description="Compromissos do escritório." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {context.status === "missing-env"
              ? "Configure o Supabase no .env.local para usar a agenda."
              : (
                <Link
                  className="underline"
                  href={
                    context.status === "missing-tenant"
                      ? "/onboarding"
                      : "/entrar"
                  }
                >
                  {context.status === "missing-tenant"
                    ? "Criar escritório"
                    : "Entrar"}
                </Link>
              )}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const [overview, options, appointments] = await Promise.all([
    getModuleOverview(context.lawFirm.id, "agenda", context.member.id),
    getDeadlineOptions(context.lawFirm.id),
    getAppointments(context.lawFirm.id),
  ]);

  const view: ViewType = ["lista", "mensal", "semanal"].includes(
    params.view ?? "",
  )
    ? (params.view as ViewType)
    : "lista";

  // Date range for list view filtering
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14); // show next 2 weeks in list view

  const visibleRows = overview.rows.filter((row) => {
    if (!row.date) return false;
    const date = new Date(row.date);
    return date >= start && date < end;
  });

  const currentDateStr = now.toISOString();
  const weekStartStr = (() => {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          description="Compromissos, reuniões, retornos e audiências do escritório."
        />
        <div className="flex justify-end">
          <Link
            href="/api/agenda/ics"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Exportar .ics
          </Link>
        </div>

        {params.criado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              Compromisso criado com sucesso.
            </CardContent>
          </Card>
        ) : null}

        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Não foi possível criar o compromisso.
            </CardContent>
          </Card>
        ) : null}

        {/* Metrics */}
        <section className="grid gap-4 md:grid-cols-2">
          <MetricCard {...overview.metrics[0]} />
          <MetricCard {...overview.metrics[1]} />
        </section>

        {/* View toggles */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agenda?view=lista"
            className={`rounded-lg border px-3 py-1.5 text-sm ${view === "lista" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Lista
          </Link>
          <Link
            href="/agenda?view=mensal"
            className={`rounded-lg border px-3 py-1.5 text-sm ${view === "mensal" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Mensal
          </Link>
          <Link
            href="/agenda?view=semanal"
            className={`rounded-lg border px-3 py-1.5 text-sm ${view === "semanal" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Semanal
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main content area */}
          {view === "lista" ? (
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Compromissos (próximos 14 dias)</CardTitle>
                <CardDescription>
                  Lista de compromissos filtrada por período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visibleRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    Nenhum compromisso neste período.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleRows.map((row) => (
                      <div
                        key={row.id}
                        className="border-b pb-3 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{row.primary}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.secondary}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-sm">
                            {row.date
                              ? formatDateTime(row.date)
                              : "Sem data"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : view === "mensal" ? (
            <div className="xl:col-span-1">
              <CalendarMonthly
                appointments={appointments.map((a) => ({
                  id: a.id,
                  title: a.title,
                  startsAt: a.startsAt,
                  endsAt: a.endsAt,
                  type: a.type,
                  status: a.status,
                }))}
                currentDate={currentDateStr}
              />
            </div>
          ) : (
            <div className="xl:col-span-1">
              <CalendarWeekly
                appointments={appointments.map((a) => ({
                  id: a.id,
                  title: a.title,
                  startsAt: a.startsAt,
                  endsAt: a.endsAt,
                  type: a.type,
                  status: a.status,
                }))}
                weekStart={weekStartStr}
              />
            </div>
          )}

          {/* Create form sidebar */}
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Novo compromisso</CardTitle>
              <CardDescription>
                Inclua uma reunião, audiência ou retorno.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAppointmentAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex.: Reunião de alinhamento"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    name="type"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="reuniao">Reunião</option>
                    <option value="audiencia">Audiência</option>
                    <option value="retorno">Retorno ao cliente</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startsAt">Início</Label>
                    <Input
                      id="startsAt"
                      name="startsAt"
                      type="datetime-local"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endsAt">Fim</Label>
                    <Input id="endsAt" name="endsAt" type="datetime-local" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente</Label>
                  <select
                    id="clientId"
                    name="clientId"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Sem cliente</option>
                    {options.clients.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalCaseId">Processo ou caso</Label>
                  <select
                    id="legalCaseId"
                    name="legalCaseId"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Sem processo</option>
                    {options.legalCases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Salvar compromisso
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
