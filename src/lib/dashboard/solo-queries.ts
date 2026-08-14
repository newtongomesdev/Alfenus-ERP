import { addDays, format, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SoloOverview } from "@/lib/solo/types";

export async function getSoloOverview(): Promise<SoloOverview> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return emptySoloOverview();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptySoloOverview();
  }

  const { data: member } = await supabase
    .from("law_firm_members")
    .select("id, name, law_firm_id")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!member) {
    return emptySoloOverview();
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
    expectedInstallmentsResult,
    overdueAmountResult,
    recentActivityResult,
    pendingFollowUpsResult,
    inactiveClientsResult,
  ] = await Promise.all([
    // Today's tasks
    supabase
      .from("tasks")
      .select("id, title, status, due_at, priority")
      .eq("law_firm_id", lawFirmId)
      .eq("responsible_member_id", memberId)
      .in("status", ["pendente", "em_andamento"])
      .lte("due_at", format(addDays(today, 1), "yyyy-MM-dd'T'23:59:59"))
      .order("due_at", { ascending: true })
      .limit(10),

    // Upcoming deadlines (next 7 days)
    supabase
      .from("deadlines")
      .select("id, title, due_date, due_time, priority")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["pendente", "em_andamento"])
      .gte("due_date", format(today, "yyyy-MM-dd"))
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

    // Expected installments this month
    supabase
      .from("installments")
      .select("id, final_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd")),

    // Overdue amount
    supabase
      .from("installments")
      .select("id, final_amount_cents, paid_amount_cents")
      .eq("law_firm_id", lawFirmId)
      .lt("due_date", format(today, "yyyy-MM-dd"))
      .in("status", ["atrasada", "parcialmente_paga"]),

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

    // Clients needing attention (no activity in 30+ days)
    supabase
      .from("clients")
      .select("id, name, updated_at")
      .eq("law_firm_id", lawFirmId)
      .eq("status", "ativo")
      .lt("updated_at", format(addDays(today, -30), "yyyy-MM-dd'T'00:00:00"))
      .order("updated_at", { ascending: true })
      .limit(10),
  ]);

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
  const expectedInstallments = (expectedInstallmentsResult.data ?? []) as Array<{ final_amount_cents: number }>;
  const overdueAmountRows = (overdueAmountResult.data ?? []) as Array<{ final_amount_cents: number; paid_amount_cents: number }>;

  const receivedThisMonth = payments.reduce((sum, p) => sum + ((p.amount_cents as number) ?? 0), 0);
  const expectedThisMonth = expectedInstallments.reduce((sum, i) => sum + ((i.final_amount_cents as number) ?? 0), 0);
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

  const clientsNeedingAttentionList = (inactiveClientsResult.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    reason: "Sem contato há mais de 30 dias",
    last_contact: c.updated_at as string | null,
    days_since_contact: Math.floor(
      (today.getTime() - new Date(c.updated_at as string).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return {
    todayTasks: tasks.length,
    todayDeadlines: deadlines.length,
    todayAppointments: appointments.length,
    overdueInstallments: overdueInstallmentList.length,
    pendingFollowUps,
    receivedThisMonth,
    expectedThisMonth,
    overdueAmount,
    clientsNeedingAttention: clientsNeedingAttentionList.length,
    tasks,
    deadlines,
    appointments,
    overdueInstallmentList,
    clientsNeedingAttentionList,
    recentActivities: activities,
  };
}

function emptySoloOverview(): SoloOverview {
  return {
    todayTasks: 0,
    todayDeadlines: 0,
    todayAppointments: 0,
    overdueInstallments: 0,
    pendingFollowUps: 0,
    receivedThisMonth: 0,
    expectedThisMonth: 0,
    overdueAmount: 0,
    clientsNeedingAttention: 0,
    tasks: [],
    deadlines: [],
    appointments: [],
    overdueInstallmentList: [],
    clientsNeedingAttentionList: [],
    recentActivities: [],
  };
}
