import { addDays, format, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SoloOverview, SoloOverviewResult } from "@/lib/solo/types";
import { getSoloOverviewStatus } from "@/lib/solo/ux";

export async function getSoloOverview(): Promise<SoloOverviewResult> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { status: "unavailable", data: null, message: "O banco de dados não está configurado." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unavailable", data: null, message: "Entre novamente para carregar o seu dia." };
  }

  const { data: member } = await supabase
    .from("law_firm_members")
    .select("id, name, law_firm_id")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!member) {
    return { status: "unavailable", data: null, message: "Crie ou selecione um escritório para carregar o seu dia." };
  }

  const lawFirmId = (member as { law_firm_id: string }).law_firm_id;
  const memberId = (member as { id: string }).id;
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    tasksResult,
    deadlinesResult,
    appointmentsResult,
    overdueInstallmentsResult,
    paymentsResult,
    paidExpensesResult,
    expectedExpensesResult,
    expectedInstallmentsResult,
    overdueAmountResult,
    recentActivityResult,
    pendingFollowUpsResult,
    inactiveClientsResult,
    contactHistoryResult,
  ] = await Promise.all([
    // Today's tasks
    supabase
      .from("tasks")
      .select("id, title, status, due_at, priority")
      .eq("law_firm_id", lawFirmId)
      .or(`responsible_member_id.eq.${memberId},responsible_member_id.is.null`)
      .in("status", ["pendente", "em_andamento"])
      .lte("due_at", format(today, "yyyy-MM-dd'T'23:59:59"))
      .order("due_at", { ascending: true })
      .limit(50),

    // Upcoming deadlines (next 7 days)
    supabase
      .from("deadlines")
      .select("id, title, due_date, due_time, priority")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"])
      .lte("due_date", format(addDays(today, 7), "yyyy-MM-dd"))
      .order("due_date", { ascending: true })
      .limit(10),

    // Today's appointments
    supabase
      .from("appointments")
      .select("id, title, starts_at, type")
      .eq("law_firm_id", lawFirmId)
      .gte("starts_at", today.toISOString())
      .lt("starts_at", addDays(today, 1).toISOString())
      .order("starts_at", { ascending: true })
      .limit(10),

    // Overdue installments
    supabase
      .from("installments")
      .select("id, final_amount_cents, paid_amount_cents, due_date, status, clients(name)")
      .eq("law_firm_id", lawFirmId)
      .lt("due_date", format(today, "yyyy-MM-dd"))
      .in("status", ["pendente", "vencendo", "atrasada", "parcialmente_paga"])
      .order("due_date", { ascending: true })
      .limit(10),

    // Payments received this month
    supabase
      .from("payments")
      .select("id, amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("paid_at", monthStart.toISOString())
      .lte("paid_at", monthEnd.toISOString()),

    // Cash flow only deducts expenses paid during this month.
    supabase
      .from("expenses")
      .select("id, amount_cents")
      .eq("law_firm_id", lawFirmId)
      .not("paid_at", "is", null)
      .gte("paid_at", monthStart.toISOString())
      .lte("paid_at", monthEnd.toISOString()),

    // Expenses scheduled for this month and not yet paid.
    supabase
      .from("expenses")
      .select("id, amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd"))
      .neq("status", "paga")
      .neq("status", "cancelada"),

    // Expected installments this month
    supabase
      .from("installments")
      .select("id, final_amount_cents, paid_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd"))
      .in("status", ["pendente", "vencendo", "atrasada", "parcialmente_paga"]),

    // Overdue amount
    supabase
      .from("installments")
      .select("id, final_amount_cents, paid_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .lt("due_date", format(today, "yyyy-MM-dd"))
      .in("status", ["pendente", "vencendo", "atrasada", "parcialmente_paga"]),

    // Recent activities
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .eq("law_firm_id", lawFirmId)
      .order("created_at", { ascending: false })
      .limit(8),

    // Pending follow-ups (solo mode)
    supabase
      .from("follow_ups" as any)
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .eq("status", "pendente")
      .lte("scheduled_date", format(today, "yyyy-MM-dd")),

    // Client records are filtered after checking completed follow-ups.
    supabase
      .from("clients")
      .select("id, name, updated_at")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "ativo")
      .order("updated_at", { ascending: true })
      .limit(100),

    // A completed return is the closest reliable contact signal available.
    supabase
      .from("follow_ups" as any)
      .select("client_id, completed_at, scheduled_date")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "realizado")
      .not("client_id", "is", null)
      .order("completed_at", { ascending: false })
      .limit(500),
  ]);

  const queryResults = [
    tasksResult,
    deadlinesResult,
    appointmentsResult,
    overdueInstallmentsResult,
    paymentsResult,
    paidExpensesResult,
    expectedExpensesResult,
    expectedInstallmentsResult,
    overdueAmountResult,
    recentActivityResult,
    pendingFollowUpsResult,
    inactiveClientsResult,
    contactHistoryResult,
  ];
  const coreQueryErrors = queryResults.slice(0, 9).filter((result) => result.error);
  const optionalQueryErrors = queryResults.slice(9).filter((result) => result.error);
  if (getSoloOverviewStatus(true, coreQueryErrors.length) === "error") {
    console.error("[solo/overview] falha ao carregar o resumo", coreQueryErrors.map((result) => String(result.error)));
    return { status: "error", data: null, message: "Não foi possível carregar o seu dia. Tente novamente." };
  }
  if (optionalQueryErrors.length > 0) {
    console.warn("[solo/overview] blocos opcionais indisponíveis", optionalQueryErrors.map((result) => String(result.error)));
  }

  // Process results
  const tasks = (tasksResult.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    due_at: t.due_at as string | null,
    priority: t.priority as string,
  }));

  const deadlines = (deadlinesResult.data ?? []).map((d) => ({
    id: d.id as string,
    title: d.title as string,
    due_date: d.due_date as string,
    due_time: d.due_time as string | null,
    priority: d.priority as string,
  }));

  const appointments = (appointmentsResult.data ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    starts_at: a.starts_at as string,
    type: a.type as string,
  }));

  const overdueInstallmentList = (overdueInstallmentsResult.data ?? []).map((i) => {
    const client = (i as any).clients;
    return {
      id: i.id as string,
      client_name: client?.name ?? "Cliente",
      amount_cents: Math.max(((i.final_amount_cents as number) ?? 0) - ((i.paid_amount_cents as number) ?? 0), 0),
      due_date: i.due_date as string,
      status: i.status as string,
    };
  });

  const payments = (paymentsResult.data ?? []) as Array<{ amount_cents: number }>;
  const paidExpenses = (paidExpensesResult.data ?? []) as Array<{ amount_cents: number }>;
  const expectedExpenses = (expectedExpensesResult.data ?? []) as Array<{ amount_cents: number }>;
  const expectedInstallments = (expectedInstallmentsResult.data ?? []) as Array<{ final_amount_cents: number; paid_amount_cents: number }>;
  const overdueAmountRows = (overdueAmountResult.data ?? []) as Array<{ final_amount_cents: number; paid_amount_cents: number }>;

  const receivedThisMonth = payments.reduce((sum, p) => sum + ((p.amount_cents as number) ?? 0), 0);
  const paidExpensesThisMonth = paidExpenses.reduce((sum, expense) => sum + ((expense.amount_cents as number) ?? 0), 0);
  const expectedExpensesThisMonth = expectedExpenses.reduce((sum, expense) => sum + ((expense.amount_cents as number) ?? 0), 0);
  const expectedThisMonth = expectedInstallments.reduce(
    (sum, i) => sum + Math.max(((i.final_amount_cents as number) ?? 0) - ((i.paid_amount_cents as number) ?? 0), 0),
    0,
  );
  const overdueAmount = overdueAmountRows.reduce(
    (sum, i) => sum + Math.max(((i.final_amount_cents as number) ?? 0) - ((i.paid_amount_cents as number) ?? 0), 0),
    0,
  );

  const activities = (recentActivityResult.data ?? []).map((a) => ({
    id: a.id as string,
    action: a.action as string,
    entity_type: a.entity_type as string,
    created_at: a.created_at as string,
  }));

  const pendingFollowUps = (pendingFollowUpsResult as any).count ?? 0;

  const latestContactByClient = new Map<string, string>();
  for (const row of (contactHistoryResult.data ?? []) as unknown as Array<{ client_id: string | null; completed_at: string | null; scheduled_date: string | null }>) {
    if (row.client_id && !latestContactByClient.has(row.client_id)) {
      latestContactByClient.set(row.client_id, row.completed_at ?? row.scheduled_date ?? "");
    }
  }
  const clientsNeedingAttentionList = (inactiveClientsResult.data ?? [])
    .map((c) => {
      const lastContact = latestContactByClient.get(c.id as string) || (c.updated_at as string | null);
      const daysSince = lastContact
        ? Math.floor((today.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        id: c.id as string,
        name: c.name as string,
        reason: latestContactByClient.has(c.id as string) ? "Sem contato há mais de 30 dias" : "Sem contato registrado",
        last_contact: lastContact,
        days_since_contact: daysSince,
      };
    })
    .filter((client) => (client.days_since_contact ?? 999) > 30)
    .sort((left, right) => (right.days_since_contact ?? 999) - (left.days_since_contact ?? 999))
    .slice(0, 10);

  const priorityWeight: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
  tasks.sort((left, right) => (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4) || String(left.due_at ?? "").localeCompare(String(right.due_at ?? "")));
  deadlines.sort((left, right) => {
    const leftOverdue = left.due_date < format(today, "yyyy-MM-dd") ? 0 : 1;
    const rightOverdue = right.due_date < format(today, "yyyy-MM-dd") ? 0 : 1;
    return leftOverdue - rightOverdue
      || left.due_date.localeCompare(right.due_date)
      || (priorityWeight[left.priority] ?? 4) - (priorityWeight[right.priority] ?? 4);
  });

  return { status: "ready", data: {
    todayTasks: tasks.length,
    todayDeadlines: deadlines.length,
    todayAppointments: appointments.length,
    overdueInstallments: overdueInstallmentList.length,
    pendingFollowUps,
    receivedThisMonth,
    paidExpensesThisMonth,
    cashFlowThisMonth: receivedThisMonth - paidExpensesThisMonth,
    expectedExpensesThisMonth,
    projectedCashFlowThisMonth: receivedThisMonth + expectedThisMonth - paidExpensesThisMonth - expectedExpensesThisMonth,
    expectedThisMonth,
    overdueAmount,
    clientsNeedingAttention: clientsNeedingAttentionList.length,
    tasks,
    deadlines,
    appointments,
    overdueInstallmentList,
    clientsNeedingAttentionList,
    recentActivities: activities,
  } };
}
