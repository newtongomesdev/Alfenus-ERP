import { getLawFirmMembers } from "@/lib/auth/context";
import { getDeadlineOptions } from "@/lib/deadlines/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  clientName: string | null;
  legalCaseTitle: string | null;
  responsibleName: string | null;
  dueAt: string | null;
  priority: string;
  status: string;
  displayStatus: string;
};

export type TasksOverview = {
  pendingCount: number;
  overdueCount: number;
  urgentCount: number;
  completedCount: number;
  tasks: TaskItem[];
  totalCount: number;
};

export async function getTaskOptions(lawFirmId: string) {
  const [contextOptions, members] = await Promise.all([getDeadlineOptions(lawFirmId), getLawFirmMembers(lawFirmId)]);
  return { ...contextOptions, members: members.map((member) => ({ id: member.id, name: member.name, role: member.role })) };
}

export async function getTasksOverview(lawFirmId: string, page?: number, limit?: number): Promise<TasksOverview> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { pendingCount: 0, overdueCount: 0, urgentCount: 0, completedCount: 0, tasks: [], totalCount: 0 };

  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;

  const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
  const totalCount = count ?? 0;

  // Fetch paginated tasks
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const { data, error } = await supabase.from("tasks").select("id, title, description, client_id, legal_case_id, responsible_member_id, due_at, priority, status").eq("law_firm_id", lawFirmId).order("due_at", { ascending: true, nullsFirst: false }).range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; title: string; description: string | null; client_id: string | null; legal_case_id: string | null; responsible_member_id: string | null; due_at: string | null; priority: string; status: string }>;
  const clientIds = Array.from(new Set(rows.map((row) => row.client_id).filter(Boolean))) as string[];
  const caseIds = Array.from(new Set(rows.map((row) => row.legal_case_id).filter(Boolean))) as string[];
  const memberIds = Array.from(new Set(rows.map((row) => row.responsible_member_id).filter(Boolean))) as string[];
  const [clientsResult, casesResult, membersResult] = await Promise.all([
    clientIds.length > 0 ? supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    caseIds.length > 0 ? supabase.from("legal_cases").select("id, title").eq("law_firm_id", lawFirmId).in("id", caseIds) : Promise.resolve({ data: [], error: null }),
    memberIds.length > 0 ? supabase.from("law_firm_members").select("id, name").eq("law_firm_id", lawFirmId).in("id", memberIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsResult.error) throw clientsResult.error;
  if (casesResult.error) throw casesResult.error;
  if (membersResult.error) throw membersResult.error;

  const names = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]));
  const cases = new Map(((casesResult.data ?? []) as Array<{ id: string; title: string }>).map((item) => [item.id, item.title]));
  const members = new Map(((membersResult.data ?? []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]));
  const now = Date.now();
  const tasks = rows.map((row) => {
    const overdue = Boolean(row.due_at) && new Date(row.due_at as string).getTime() < now && !["concluido", "cancelado"].includes(row.status);
    return { id: row.id, title: row.title, description: row.description, clientName: row.client_id ? names.get(row.client_id) ?? null : null, legalCaseTitle: row.legal_case_id ? cases.get(row.legal_case_id) ?? null : null, responsibleName: row.responsible_member_id ? members.get(row.responsible_member_id) ?? null : null, dueAt: row.due_at, priority: row.priority, status: row.status, displayStatus: overdue ? "vencido" : row.status } satisfies TaskItem;
  });

  // Compute summary stats from ALL tasks (not just current page)
  const { data: allTasks } = await supabase.from("tasks").select("status, priority, due_at").eq("law_firm_id", lawFirmId);
  const allRows = (allTasks ?? []) as Array<{ status: string; priority: string; due_at: string | null }>;

  const pendingCount = allRows.filter((t) => !["concluido", "cancelado"].includes(t.status)).length;
  const completedCount = allRows.filter((t) => t.status === "concluido").length;
  const overdueCount = allRows.filter((t) => !["concluido", "cancelado"].includes(t.status) && t.due_at && new Date(t.due_at).getTime() < now).length;
  const urgentCount = allRows.filter((t) => t.priority === "urgente" && !["concluido", "cancelado"].includes(t.status)).length;

  return { pendingCount, overdueCount, urgentCount, completedCount, tasks, totalCount };
}
