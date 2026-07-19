import { Archive, Bell, Settings } from "lucide-react";
import Link from "next/link";

import { archiveAllNotificationsAction, markNotificationReadAction } from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { getModuleOverview } from "@/lib/modules/queries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationRow = {
  id: string;
  primary: string;
  secondary: string | null;
  status: string | null;
  date: string | null;
  amountCents: number | null;
};

type NotificationGroup = {
  key: string;
  label: string;
  items: NotificationRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupNotificationsByDate(rows: NotificationRow[]): NotificationGroup[] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

  const buckets: Record<string, NotificationGroup> = {};

  for (const row of rows) {
    const dateStr = row.date?.slice(0, 10) ?? "sem-data";
    let label: string;
    let sortKey: string;

    if (dateStr === today) {
      label = "Hoje";
      sortKey = "0";
    } else if (dateStr === yesterday) {
      label = "Ontem";
      sortKey = "1";
    } else {
      const d = new Date(dateStr + "T00:00:00");
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
      if (diffDays <= 7) {
        label = "Esta semana";
        sortKey = "2";
      } else if (diffDays <= 30) {
        label = "Este mês";
        sortKey = "3";
      } else {
        label = "Mais antigo";
        sortKey = "4";
      }
    }

    const key = `${sortKey}-${dateStr}`;
    if (!buckets[key]) {
      buckets[key] = { key, label, items: [] };
    }
    buckets[key].items.push(row);
  }

  return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lida?: string;
    erro?: string;
    arquivada?: string;
    arquivadas?: string;
    preferencia?: string;
    page?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  ) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Notificações" description="Alertas internos do Alfenus." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {context.status === "missing-env"
              ? "Configure o Supabase no .env.local para carregar notificações."
              : (
                <Link
                  className="underline"
                  href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}
                >
                  {context.status === "missing-tenant" ? "Criar escritório" : "Entrar"}
                </Link>
              )}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const overview = await getModuleOverview(
    context.lawFirm.id,
    "notificacoes",
    context.member.id,
    page,
    PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(overview.totalCount / PAGE_SIZE));
  const grouped = groupNotificationsByDate(overview.rows);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Notificações"
          description="Alertas internos sobre prazos, cobranças, tarefas e alterações relevantes."
          actions={
            <>
              <Link
                href="/notificacoes/preferencias"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                <Settings className="size-3.5" />
                Preferências
              </Link>
              <form action={archiveAllNotificationsAction}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  <Archive className="size-3.5" />
                  Arquivar todas
                </button>
              </form>
            </>
          }
        />

        {params.lida ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">Notificação marcada como lida.</CardContent>
          </Card>
        ) : null}
        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Não foi possível atualizar a notificação.
            </CardContent>
          </Card>
        ) : null}
        {params.arquivada ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">Notificação arquivada.</CardContent>
          </Card>
        ) : null}
        {params.arquivadas ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              Todas as notificações foram arquivadas.
            </CardContent>
          </Card>
        ) : null}
        {params.preferencia ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              Preferência de notificação atualizada.
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {overview.metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Central de alertas</CardTitle>
            <CardDescription>Notificações do membro conectado.</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
                <Bell className="size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação pendente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.key}>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </h3>
                    <div className="space-y-2">
                      {group.items.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-start justify-between gap-4 rounded-lg border p-4 transition hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{row.primary}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{row.secondary}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{row.date ?? ""}</p>
                          </div>
                          {row.status === "pendente" ? (
                            <form action={markNotificationReadAction}>
                              <input type="hidden" name="notificationId" value={row.id} />
                              <button
                                type="submit"
                                className="shrink-0 text-xs font-medium underline-offset-4 hover:underline"
                              >
                                Marcar como lida
                              </button>
                            </form>
                          ) : (
                            <span className="shrink-0 text-xs text-muted-foreground">Lida</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={() => {}}
          basePath="/notificacoes"
          totalRecords={overview.totalCount}
        />
      </div>
    </AppShell>
  );
}
