import { CalendarDays, Database, LogIn, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OverviewChart } from "@/components/dashboard/overview-chart";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDashboardOverview } from "@/lib/dashboard/queries";
import { formatDate, formatDateTime } from "@/lib/formatters";

function SetupNotice({ status }: { status: string }) {
  const content = {
    "missing-env": {
      icon: Database,
      title: "Conecte o Supabase para ativar dados reais",
      description:
        "Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local e aplique a migration em supabase/migrations. O dashboard já está preparado para respeitar tenant e RLS.",
      action: "Ver .env.example",
      href: "/dashboard",
    },
    "signed-out": {
      icon: LogIn,
      title: "Entre para acessar o escritório",
      description: "A fundação usa Supabase Auth. Depois do login, os dados são filtrados pelo escritório vinculado ao usuário.",
      action: "Entrar",
      href: "/entrar",
    },
    "missing-tenant": {
      icon: ShieldAlert,
      title: "Usuário sem escritório ativo",
      description: "Configure o primeiro escritório para vincular seu usuário a um tenant e ativar o isolamento por RLS.",
      action: "Criar escritório",
      href: "/onboarding",
    },
  }[status] ?? {
    icon: ShieldAlert,
    title: "Estado não reconhecido",
    description: "Revise a configuração da aplicação.",
    action: "Dashboard",
    href: "/dashboard",
  };

  const Icon = content.icon;

  return (
    <Card className="rounded-lg border-dashed">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">{content.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{content.description}</p>
          </div>
        </div>
        <Link
          href={content.href}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
        >
          {content.action}
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  let overview;
  try {
    overview = await getDashboardOverview();
  } catch {
    overview = {
      status: "missing-env" as const,
      lawFirmName: null,
      memberName: null,
      metrics: [],
      deadlines: [],
      appointments: [],
      activities: [],
      chart: [],
    };
  }

  if (overview.status === "signed-out") {
    redirect("/entrar");
  }

  if (overview.status === "missing-tenant") {
    redirect("/onboarding");
  }

  return (
    <AppShell
      memberName={overview.memberName}
      isAuthenticated={overview.status === "ready"}
    >
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={
            overview.lawFirmName
              ? `${overview.lawFirmName}: visão operacional, jurídica e financeira do escritório.`
              : "Visão operacional, jurídica e financeira do escritório."
          }
          actions={
            <Link
              href="/leads/novo"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              <Plus className="size-4" />
              Novo lead
            </Link>
          }
        />

        {overview.status !== "ready" ? <SetupNotice status={overview.status} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section>
          <KPICards />
        </section>

        <section>
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Previsto, recebido e atrasado</CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewChart data={overview.chart} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agenda do dia</CardTitle>
              <CalendarDays className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum compromisso agendado para hoje.</p>
              ) : (
                overview.appointments.map((appointment) => (
                  <div key={appointment.id}>
                    <p className="text-sm font-medium">{appointment.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(appointment.startsAt)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Próximos prazos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.deadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum prazo próximo encontrado.</p>
              ) : (
                overview.deadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{deadline.title}</p>
                      <p className="text-xs text-muted-foreground">Vence em {formatDate(deadline.dueDate)}</p>
                    </div>
                    <StatusBadge value={deadline.priority} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Atividades recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">As operações sensíveis aparecerão aqui pelo log de auditoria.</p>
              ) : (
                overview.activities.map((activity) => (
                  <div key={activity.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(activity.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
                    <Separator className="mt-3" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
