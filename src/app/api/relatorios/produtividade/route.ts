import { NextRequest, NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("de") || "";
  const dateTo = searchParams.get("ate") || "";
  const filterFrom = dateFrom ? `${dateFrom}T00:00:00` : null;
  const filterTo = dateTo ? `${dateTo}T23:59:59` : null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  // Active members
  const { data: activeMembers } = await supabase
    .from("law_firm_members")
    .select("id, name")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "ativo")
    .order("name", { ascending: true });

  const members = (activeMembers ?? []) as Array<{ id: string; name: string }>;
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const prodMap = new Map<string, { tasksCompleted: number; deadlinesMet: number; appointments: number }>();
  for (const m of members) {
    prodMap.set(m.id, { tasksCompleted: 0, deadlinesMet: 0, appointments: 0 });
  }

  // Tasks completed per member
  let tasksQuery = supabase
    .from("tasks")
    .select("id, responsible_member_id, status, due_at")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "concluido");
  if (filterFrom) tasksQuery = tasksQuery.gte("updated_at", filterFrom);
  if (filterTo) tasksQuery = tasksQuery.lte("updated_at", filterTo);

  const { data: tasksData } = await tasksQuery;
  const taskRows = (tasksData ?? []) as Array<{ id: string; responsible_member_id: string | null; status: string; due_at: string | null }>;
  for (const t of taskRows) {
    if (!t.responsible_member_id) continue;
    const entry = prodMap.get(t.responsible_member_id);
    if (entry) entry.tasksCompleted += 1;
  }

  // Deadlines met per member
  let deadlinesQuery = supabase
    .from("deadlines")
    .select("id, responsible_member_id, status, due_date, completed_at")
    .eq("law_firm_id", context.lawFirm.id);
  if (dateFrom) deadlinesQuery = deadlinesQuery.gte("due_date", dateFrom);
  if (dateTo) deadlinesQuery = deadlinesQuery.lte("due_date", dateTo);

  const { data: deadlinesData } = await deadlinesQuery;
  const deadlineRows = (deadlinesData ?? []) as Array<{ id: string; responsible_member_id: string | null; status: string; due_date: string; completed_at: string | null }>;
  for (const d of deadlineRows) {
    if (!d.responsible_member_id) continue;
    const entry = prodMap.get(d.responsible_member_id);
    if (entry && d.status === "concluido" && d.completed_at && d.completed_at <= `${d.due_date}T23:59:59`) {
      entry.deadlinesMet += 1;
    }
  }

  // Appointments per member
  let appointmentsQuery = supabase
    .from("appointments")
    .select("id, responsible_member_id")
    .eq("law_firm_id", context.lawFirm.id);
  if (filterFrom) appointmentsQuery = appointmentsQuery.gte("starts_at", filterFrom);
  if (filterTo) appointmentsQuery = appointmentsQuery.lte("starts_at", filterTo);

  const { data: appointmentsData } = await appointmentsQuery;
  const appointmentRows = (appointmentsData ?? []) as Array<{ id: string; responsible_member_id: string | null }>;
  for (const a of appointmentRows) {
    if (!a.responsible_member_id) continue;
    const entry = prodMap.get(a.responsible_member_id);
    if (entry) entry.appointments += 1;
  }

  // Build CSV
  const lines = [
    ["Membro", "Tarefas concluídas", "Prazos cumpridos", "Compromissos"].map(escapeCsv).join(";"),
    ...members.map((m) => {
      const prod = prodMap.get(m.id)!;
      return [m.name, String(prod.tasksCompleted), String(prod.deadlinesMet), String(prod.appointments)].map(escapeCsv).join(";");
    }),
  ];

  const periodLabel = dateFrom || dateTo ? `-${dateFrom || "inicio"}_ate-${dateTo || "atual"}` : "";
  const csv = `\ufeff${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alfenus-produtividade${periodLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
