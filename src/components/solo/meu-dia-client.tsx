"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  ArrowRight,
  Circle,
  FileText,
  Scale,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SoloOverview } from "@/lib/solo/types";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { InactiveClients } from "@/components/solo/inactive-clients";

// ── Priority color helper ───────────────────────────────────

function priorityColor(priority: string) {
  switch (priority) {
    case "urgente":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "alta":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "normal":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "baixa":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    criou_cliente: "Cliente criado",
    criou_processo: "Caso criado",
    criou_contrato: "Contrato criado",
    atualizou_cliente: "Cliente atualizado",
    atualizou_processo: "Caso atualizado",
    registrou_pagamento: "Pagamento registrado",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

// ── Quick action links ──────────────────────────────────────

const quickActions = [
  { label: "Cadastrar cliente", href: "/clientes/novo", icon: Users },
  { label: "Criar caso", href: "/solo/novo-caso", icon: Scale },
  { label: "Agendar compromisso", href: "/agenda#novo-compromisso", icon: CalendarDays },
  { label: "Recebimentos", href: "/recebimentos", icon: DollarSign },
];

export function MeuDiaClient({
  overview,
}: {
  overview: SoloOverview;
  memberName: string;
}) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 text-sm font-medium text-muted-foreground">
          Ações mais usadas
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-16 items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-5 shrink-0 text-primary" />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Summary cards ────────────────────────────── */}
      <section aria-label="Resumo do dia" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={<Clock className="size-5 text-blue-500" />}
          label="Tarefas hoje"
          value={overview.todayTasks}
        />
        <SummaryCard
          icon={<CalendarDays className="size-5 text-purple-500" />}
          label="Prazos vencidos / próximos"
          value={overview.todayDeadlines}
        />
        <SummaryCard
          icon={<AlertTriangle className="size-5 text-red-500" />}
          label="Parcelas atrasadas"
          value={overview.overdueInstallments}
          accent={overview.overdueInstallments > 0}
        />
        <SummaryCard
          icon={<DollarSign className="size-5 text-green-500" />}
          label="Recebido no mês"
          value={formatCurrencyFromCents(overview.receivedThisMonth)}
        />
      </section>

      {/* ── Hoje ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.appointments.length === 0 && overview.tasks.length === 0 && overview.deadlines.length === 0 && overview.overdueInstallmentList.length === 0 && overview.pendingFollowUps === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Seu dia está livre.</p>
                <Link
                  href="/agenda#novo-compromisso"
                  className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Agendar compromisso
                </Link>
              </div>
            )}

            {overview.appointments.map((apt) => (
              <div key={apt.id} className="flex items-start gap-3">
                <Circle className="size-2 mt-1.5 fill-purple-500 text-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{apt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">{apt.type}</Badge>
              </div>
            ))}

            {overview.tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-start gap-3">
                <Circle className="size-2 mt-1.5 fill-blue-500 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <Link href={`/tarefas/${task.id}`} className="text-sm font-medium hover:underline">
                    {task.title}
                  </Link>
                  {task.due_at && (
                    <p className="text-xs text-muted-foreground">
                      até {new Date(task.due_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Próximos prazos ─────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Prazos urgentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum prazo vencido ou previsto para os próximos 7 dias.</p>
            ) : (
              overview.deadlines.map((dl) => {
                const daysLeft = Math.ceil(
                  (new Date(dl.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Link key={dl.id} href={`/prazos/${dl.id}`} className="flex items-start justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{dl.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dl.due_time
                          ? `${formatDate(dl.due_date)} às ${dl.due_time}`
                          : formatDate(dl.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={daysLeft <= 1 ? "destructive" : daysLeft <= 3 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {daysLeft < 0 ? "Atrasado" : daysLeft === 0 ? "Hoje" : daysLeft === 1 ? "Amanhã" : `${daysLeft} dias`}
                      </Badge>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(dl.priority)}`}>
                        {dl.priority}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Financial summary ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4" />
              Financeiro resumido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Recebido no mês</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrencyFromCents(overview.receivedThisMonth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Previsto no mês</p>
                <p className="text-lg font-semibold">
                  {formatCurrencyFromCents(overview.expectedThisMonth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Em atraso</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrencyFromCents(overview.overdueAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas pagas no mês</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrencyFromCents(overview.paidExpensesThisMonth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fluxo de caixa no mês</p>
                <p className={`text-lg font-semibold ${overview.cashFlowThisMonth < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrencyFromCents(overview.cashFlowThisMonth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projeção até o fim do mês</p>
                <p className={`text-lg font-semibold ${overview.projectedCashFlowThisMonth < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrencyFromCents(overview.projectedCashFlowThisMonth)}
                </p>
                <p className="text-xs text-muted-foreground">Despesas previstas: {formatCurrencyFromCents(overview.expectedExpensesThisMonth)}</p>
              </div>
            </div>

            {overview.overdueInstallmentList.length > 0 && (
              <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Parcelas atrasadas</p>
                  {overview.overdueInstallmentList.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between text-sm py-1">
                      <span>{inst.client_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-medium">{formatCurrencyFromCents(inst.amount_cents)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(inst.due_date)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Atividades recentes ─────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            ) : (
              overview.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-3">
                  <p className="text-sm capitalize">{activityLabel(activity.action)}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Retornos e Clientes Inativos ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Retornos pendentes
              {overview.pendingFollowUps > 0 && (
                <Badge variant="secondary" className="text-xs">{overview.pendingFollowUps}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.pendingFollowUps === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum retorno pendente para hoje.</p>
            ) : (
              <Link href="/retornos">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todos os retornos
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <InactiveClients clients={overview.clientsNeedingAttentionList} />
      </div>

    </div>
  );
}

// ── Summary card ────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-red-200 dark:border-red-800" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
