/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Solo Pro Queries
 * Server-side queries for Meu Escritório dashboard
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import type { MeuEscritorioOverview, OfficeHealthOverview, OperationalRecommendation } from "./types";

// Helper to access new columns before migration is applied and types are regenerated.
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Get office health overview ──────────────────────────────────────

export async function getOfficeHealth(lawFirmId: string): Promise<OfficeHealthOverview | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    clientsResult,
    casesResult,
    proposalsResult,
    followUpsResult,
    tasksResult,
    deadlinesResult,
    paymentsResult,
    expectedInstallmentsResult,
    overdueAmountResult,
    expensesResult,
    recommendationResult,
    lastHealthResult,
  ] = await Promise.all([
    // Clients
    tbl(supabase, "clients")
      .select("id, status, updated_at")
      .eq("law_firm_id", lawFirmId),

    // Active cases
    tbl(supabase, "legal_cases")
      .select("id, status, updated_at")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["em_andamento", "ativo"]),

    // Pending proposals
    tbl(supabase, "fee_proposals")
      .select("id, status")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "rascunho"),

    // Pending follow-ups
    tbl(supabase, "follow_ups")
      .select("id, status")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "pendente"),

    // Pending tasks
    tbl(supabase, "tasks")
      .select("id, status")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"]),

    // Deadlines
    tbl(supabase, "deadlines")
      .select("id, status, due_date")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"]),

    // Payments
    tbl(supabase, "payments")
      .select("id, amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("paid_at", monthStart.toISOString())
      .lte("paid_at", monthEnd.toISOString()),

    // Expected installments
    tbl(supabase, "installments")
      .select("id, final_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd")),

    // Overdue amount
    tbl(supabase, "installments")
      .select("id, final_amount_cents, paid_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .lt("due_date", format(today, "yyyy-MM-dd"))
      .in("status", ["atrasada", "parcialmente_paga"]),

    // Expenses
    tbl(supabase, "expenses")
      .select("id, amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd")),

    // Active recommendations
    tbl(supabase, "operational_recommendations")
      .select("id, priority")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "ativa"),

    // Last health snapshot
    tbl(supabase, "office_health_snapshots")
      .select("score_number")
      .eq("law_firm_id", lawFirmId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const clientsTotal = Array.isArray(clientsResult.data) ? clientsResult.data.length : 0;
  const clientsActive = Array.isArray(clientsResult.data) ? clientsResult.data.filter((c: any) => c.status === "ativo").length : 0;
  const clientsInactive = clientsTotal - clientsActive;
  const casesActive = Array.isArray(casesResult.data) ? casesResult.data.length : 0;
  const proposalsPending = Array.isArray(proposalsResult.data) ? proposalsResult.data.length : 0;
  const followUpsPending = Array.isArray(followUpsResult.data) ? followUpsResult.data.length : 0;
  const tasksPending = Array.isArray(tasksResult.data) ? tasksResult.data.length : 0;
  const deadlinesList = Array.isArray(deadlinesResult.data) ? deadlinesResult.data : [];
  const deadlinesUpcoming = deadlinesList.filter((d: any) => {
    const due = new Date(d.due_date);
    return due >= today && due <= addDays(today, 7);
  }).length;
  const deadlinesOverdue = deadlinesList.filter((d: any) => new Date(d.due_date) < today).length;
  const receivedMonth = Array.isArray(paymentsResult.data) ? (paymentsResult.data as any[]).reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) : 0;
  const expectedMonth = Array.isArray(expectedInstallmentsResult.data) ? (expectedInstallmentsResult.data as any[]).reduce((sum: number, i: any) => sum + (i.final_amount_cents || 0), 0) : 0;
  const overdueAmount = Array.isArray(overdueAmountResult.data) ? (overdueAmountResult.data as any[]).reduce((sum: number, i: any) => sum + ((i.final_amount_cents || 0) - (i.paid_amount_cents || 0)), 0) : 0;
  const expensesMonth = Array.isArray(expensesResult.data) ? (expensesResult.data as any[]).reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0) : 0;
  const recommendationsActive = Array.isArray(recommendationResult.data) ? recommendationResult.data.length : 0;
  const recommendationsCritical = Array.isArray(recommendationResult.data) ? recommendationResult.data.filter((r: any) => r.priority === "critica").length : 0;

  // Calculate score from snapshot or from in-memory heuristic
  let score = (lastHealthResult.data as any)?.score_number ?? 0;
  if (score === 0) {
    // Simple calculation if no snapshot exists
    score = 100 - Math.min(deadlinesOverdue * 5, 25);
    score -= Math.min(followUpsPending * 3, 15);
    score -= Math.min(tasksPending * 2, 15);
    score -= Math.min(recommendationsCritical * 5, 15);
    score = Math.max(0, Math.min(100, score));
  }

  // Determine status from score
  let status: "organizado" | "atencao" | "pendente" | "critico";
  if (score >= 80) status = "organizado";
  else if (score >= 60) status = "atencao";
  else if (score >= 40) status = "pendente";
  else status = "critico";

  const statusLabels = {
    organizado: "Organizado",
    atencao: "Atenção",
    pendente: "Pendente",
    critico: "Crítico",
  };

  return {
    score,
    status,
    statusLabel: statusLabels[status],
    clientsActive,
    clientsInactive,
    casesActive,
    casesPendingAction: 0,
    casesOverdue: 0,
    proposalsPending,
    proposalsExpired: 0,
    followUpsPending,
    followUpsOverdue: 0,
    tasksPending,
    tasksOverdue: 0,
    deadlinesUpcoming,
    deadlinesOverdue,
    revenueMonth: expectedMonth,
    receivedMonth,
    overdueAmount,
    expensesMonth,
    recommendationsActive,
    recommendationsCritical,
  };
}

// ── Get active recommendations ──────────────────────────────────────

export async function getActiveRecommendations(lawFirmId: string): Promise<OperationalRecommendation[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await tbl(supabase, "operational_recommendations")
    .select("*")
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativa")
    .order("priority", { ascending: true })
    .limit(15);

  return (data as any[] ?? []).map((r: any) => ({
    id: r.id as string,
    law_firm_id: r.law_firm_id as string,
    rule_id: r.rule_id as string | null,
    recommendation_type: r.recommendation_type as any,
    title: r.title as string,
    description: r.description as string,
    priority: r.priority as any,
    entity_type: r.entity_type as string | null,
    entity_id: r.entity_id as string | null,
    related_entity_name: r.related_entity_name as string | null,
    reason: r.reason as string | null,
    action_label: r.action_label as string | null,
    action_url: r.action_url as string | null,
    status: r.status as any,
    generated_at: r.generated_at as string,
    expires_at: r.expires_at as string | null,
    dismissed_at: r.dismissed_at as string | null,
    dismissed_by: r.dismissed_by as string | null,
    dismissed_reason: r.dismissed_reason as string | null,
    completed_at: r.completed_at as string | null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

// ── Get Meu Escritório overview ─────────────────────────────────────

export async function getMeuEscritorioOverview(lawFirmId: string): Promise<MeuEscritorioOverview | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const today = new Date();

  const [health, recommendations, todayTasks, todayDeadlines, todayFollowUps, todayAppointments] = await Promise.all([
    getOfficeHealth(lawFirmId),
    getActiveRecommendations(lawFirmId),
    tbl(supabase, "tasks")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"])
      .lte("due_at", addDays(today, 1).toISOString())
      .gte("due_at", today.toISOString()),
    tbl(supabase, "deadlines")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"])
      .gte("due_date", format(today, "yyyy-MM-dd"))
      .lte("due_date", format(addDays(today, 7), "yyyy-MM-dd")),
    tbl(supabase, "follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .eq("status", "pendente")
      .lte("scheduled_date", format(today, "yyyy-MM-dd")),
    tbl(supabase, "appointments")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .gte("starts_at", today.toISOString())
      .lt("starts_at", addDays(today, 1).toISOString()),
  ]);

  return {
    health: health ?? getEmptyHealth(),
    today: {
      tasks: (todayTasks as any).count ?? 0,
      deadlines: (todayDeadlines as any).count ?? 0,
      followUps: (todayFollowUps as any).count ?? 0,
      appointments: (todayAppointments as any).count ?? 0,
    },
    clients: {
      total: health?.clientsActive ?? 0,
      withoutContact: 0,
      pendingReturn: 0,
      inactiveDays: 0,
    },
    legal: {
      activeCases: health?.casesActive ?? 0,
      pendingAction: health?.casesPendingAction ?? 0,
      overdueDeadlines: health?.deadlinesOverdue ?? 0,
      pendingProposals: health?.proposalsPending ?? 0,
    },
    financial: {
      receivedMonth: health?.receivedMonth ?? 0,
      expectedMonth: health?.revenueMonth ?? 0,
      overdueAmount: health?.overdueAmount ?? 0,
      expensesMonth: health?.expensesMonth ?? 0,
      cashflowBalance: (health?.receivedMonth ?? 0) - (health?.expensesMonth ?? 0),
    },
    growth: {
      referralClients: 0,
      conversionRate: 0,
      capacityUsedPercent: 0,
      hireReadiness: 0,
    },
    recommendations,
    quickActions: [
      { label: "Novo Cliente", href: "/clientes/novo", icon: "user-plus", description: "Cadastrar novo cliente" },
      { label: "Novo Caso", href: "/processos/novo", icon: "briefcase", description: "Abrir novo caso" },
      { label: "Proposta", href: "/propostas/nova", icon: "file-plus", description: "Criar proposta de honorários" },
      { label: "Emitir Recibo", href: "/recibos/novo", icon: "receipt", description: "Emitir recibo" },
      { label: "Ficha Atendimento", href: "/atendimentos/novo", icon: "clipboard-list", description: "Nova ficha de atendimento" },
      { label: "Novo Retorno", href: "/retornos/novo", icon: "phone", description: "Agendar retorno" },
    ],
  };
}

function getEmptyHealth(): OfficeHealthOverview {
  return {
    score: 0,
    status: "critico",
    statusLabel: "Crítico",
    clientsActive: 0,
    clientsInactive: 0,
    casesActive: 0,
    casesPendingAction: 0,
    casesOverdue: 0,
    proposalsPending: 0,
    proposalsExpired: 0,
    followUpsPending: 0,
    followUpsOverdue: 0,
    tasksPending: 0,
    tasksOverdue: 0,
    deadlinesUpcoming: 0,
    deadlinesOverdue: 0,
    revenueMonth: 0,
    receivedMonth: 0,
    overdueAmount: 0,
    expensesMonth: 0,
    recommendationsActive: 0,
    recommendationsCritical: 0,
  };
}