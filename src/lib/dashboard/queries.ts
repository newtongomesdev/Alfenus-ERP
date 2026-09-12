import { addDays, endOfMonth, format, startOfDay, startOfMonth } from "date-fns";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardOverview } from "@/lib/dashboard/types";

type CountQuery = PromiseLike<{ count: number | null; error: Error | null }> & {
  eq(column: string, value: unknown): CountQuery;
  is(column: string, value: null): CountQuery;
  in(column: string, values: unknown[]): CountQuery;
  not(column: string, operator: string, value: unknown): CountQuery;
  gte(column: string, value: unknown): CountQuery;
  lte(column: string, value: unknown): CountQuery;
  lt(column: string, value: unknown): CountQuery;
};

function emptyOverview(status: DashboardOverview["status"]): DashboardOverview {
  return {
    status,
    lawFirmName: null,
    memberName: null,
    metrics: [
      { label: "Clientes ativos", value: 0, format: "integer", detail: "Base de clientes do escritório" },
      { label: "Leads ativos", value: 0, format: "integer", detail: "Oportunidades em andamento" },
      { label: "Processos ativos", value: 0, format: "integer", detail: "Casos judiciais em acompanhamento" },
      { label: "Prazos em 7 dias", value: 0, format: "integer", detail: "Compromissos jurídicos próximos" },
      { label: "Parcelas atrasadas", value: 0, format: "integer", detail: "Cobranças vencidas em aberto" },
      { label: "Previsto no mês", value: 0, format: "currency", detail: "Recebíveis com vencimento no mês" },
      { label: "Recebido no mês", value: 0, format: "currency", detail: "Pagamentos registrados no mês" },
    ],
    deadlines: [],
    appointments: [],
    activities: [],
    chart: [
      { label: "Semana 1", previsto: 0, recebido: 0, atrasado: 0 },
      { label: "Semana 2", previsto: 0, recebido: 0, atrasado: 0 },
      { label: "Semana 3", previsto: 0, recebido: 0, atrasado: 0 },
      { label: "Semana 4", previsto: 0, recebido: 0, atrasado: 0 },
    ],
  };
}

async function countRows(
  client: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  table: "clients" | "leads" | "legal_cases" | "deadlines" | "installments",
  lawFirmId: string,
  filters: (query: CountQuery) => CountQuery,
) {
  const query = client.from(table).select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
  const { count, error } = await filters(query as unknown as CountQuery);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (!hasSupabaseEnv()) {
    return emptyOverview("missing-env");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return emptyOverview("missing-env");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyOverview("signed-out");
  }

  const { data: member, error: memberError } = await supabase
    .from("law_firm_members")
    .select("id, name, law_firm_id, law_firms(name)")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (!member) {
    return emptyOverview("missing-tenant");
  }

  const memberRow = member as {
    law_firm_id: string;
    name: string;
    law_firms: { name: string } | null;
  };

  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const lawFirmId = memberRow.law_firm_id;

  const [
    activeClients,
    activeLeads,
    activeCases,
    upcomingDeadlines,
    overdueInstallments,
    installments,
    payments,
    deadlines,
    appointments,
    activities,
  ] = await Promise.all([
    countRows(supabase, "clients", lawFirmId, (query) => query.eq("status", "ativo").is("archived_at", null)),
    countRows(supabase, "leads", lawFirmId, (query) => query.in("status", ["novo", "em_atendimento", "qualificado"])),
    countRows(supabase, "legal_cases", lawFirmId, (query) => query.not("status", "in", "(encerrado,arquivado)").is("archived_at", null)),
    countRows(supabase, "deadlines", lawFirmId, (query) =>
      query.gte("due_date", format(today, "yyyy-MM-dd")).lte("due_date", format(nextWeek, "yyyy-MM-dd")).in("status", ["pendente", "em_andamento"]),
    ),
    countRows(supabase, "installments", lawFirmId, (query) =>
      query.lt("due_date", format(today, "yyyy-MM-dd")).in("status", ["pendente", "vencendo", "atrasada", "parcialmente_paga"]),
    ),
    supabase
      .from("installments")
      .select("id, final_amount_cents, paid_amount_cents, due_date, status")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(monthStart, "yyyy-MM-dd"))
      .lte("due_date", format(monthEnd, "yyyy-MM-dd")),
    supabase
      .from("payments")
      .select("id, amount_cents, paid_at")
      .eq("law_firm_id", lawFirmId)
      .gte("paid_at", monthStart.toISOString())
      .lte("paid_at", monthEnd.toISOString()),
    supabase
      .from("deadlines")
      .select("id, title, due_date, priority, status")
      .eq("law_firm_id", lawFirmId)
      .gte("due_date", format(today, "yyyy-MM-dd"))
      .order("due_date", { ascending: true })
      .limit(6),
    supabase
      .from("appointments")
      .select("id, title, starts_at, type")
      .eq("law_firm_id", lawFirmId)
      .gte("starts_at", today.toISOString())
      .lt("starts_at", addDays(today, 1).toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .eq("law_firm_id", lawFirmId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  for (const response of [installments, payments, deadlines, appointments, activities]) {
    if (response.error) {
      throw response.error;
    }
  }

  const installmentRows = (installments.data ?? []) as Array<{
    final_amount_cents: number;
    paid_amount_cents: number;
    status: string;
  }>;
  const paymentRows = (payments.data ?? []) as Array<{ amount_cents: number }>;
  const deadlineRows = (deadlines.data ?? []) as Array<{
    id: string;
    title: string;
    due_date: string;
    priority: string;
    status: string;
  }>;
  const appointmentRows = (appointments.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
    type: string;
  }>;
  const activityRows = (activities.data ?? []) as Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }>;
  const expectedThisMonth = installmentRows.reduce((total, item) => total + item.final_amount_cents, 0);
  const receivedThisMonth = paymentRows.reduce((total, item) => total + item.amount_cents, 0);
  const overdueAmount = installmentRows
    .filter((item) => ["atrasada", "parcialmente_paga"].includes(item.status))
    .reduce((total, item) => total + Math.max(item.final_amount_cents - item.paid_amount_cents, 0), 0);

  return {
    status: "ready",
    lawFirmName: memberRow.law_firms?.name ?? "Escritório",
    memberName: memberRow.name,
    metrics: [
      { label: "Clientes ativos", value: activeClients, format: "integer", detail: "Base de clientes do escritório" },
      { label: "Leads ativos", value: activeLeads, format: "integer", detail: "Oportunidades em andamento" },
      { label: "Processos ativos", value: activeCases, format: "integer", detail: "Casos judiciais em acompanhamento" },
      { label: "Prazos em 7 dias", value: upcomingDeadlines, format: "integer", detail: "Compromissos jurídicos próximos" },
      { label: "Parcelas atrasadas", value: overdueInstallments, format: "integer", detail: "Cobranças vencidas em aberto" },
      { label: "Previsto no mês", value: expectedThisMonth, format: "currency", detail: "Recebíveis com vencimento no mês" },
      { label: "Recebido no mês", value: receivedThisMonth, format: "currency", detail: "Pagamentos registrados no mês" },
    ],
    deadlines: deadlineRows.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      dueDate: deadline.due_date,
      priority: deadline.priority,
      status: deadline.status,
    })),
    appointments: appointmentRows.map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      startsAt: appointment.starts_at,
      type: appointment.type,
    })),
    activities: activityRows.map((activity) => ({
      id: activity.id,
      title: activity.action,
      description: activity.entity_type,
      createdAt: activity.created_at,
    })),
    chart: [
      { label: "Previsto", previsto: expectedThisMonth, recebido: 0, atrasado: 0 },
      { label: "Recebido", previsto: 0, recebido: receivedThisMonth, atrasado: 0 },
      { label: "Atrasado", previsto: 0, recebido: 0, atrasado: overdueAmount },
    ],
  };
}
