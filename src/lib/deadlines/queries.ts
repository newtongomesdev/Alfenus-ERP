import { getSupabaseServerClient } from "@/lib/supabase/server";

export type DeadlineItem = {
  id: string;
  title: string;
  type: string;
  clientId: string | null;
  clientName: string | null;
  legalCaseId: string | null;
  legalCaseTitle: string | null;
  dueDate: string;
  dueTime: string | null;
  priority: string;
  status: string;
  displayStatus: string;
  description: string | null;
};

export type DeadlineOptions = {
  clients: Array<{ id: string; name: string }>;
  legalCases: Array<{ id: string; title: string; clientId: string | null }>;
};

export type DeadlinesOverview = {
  pendingCount: number;
  overdueCount: number;
  urgentCount: number;
  completedCount: number;
  deadlines: DeadlineItem[];
  totalCount: number;
};

export async function getDeadlineOptions(lawFirmId: string): Promise<DeadlineOptions> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { clients: [], legalCases: [] };

  const [clientsResult, casesResult] = await Promise.all([
    supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).is("archived_at", null).order("name"),
    supabase.from("legal_cases").select("id, title, client_id").eq("law_firm_id", lawFirmId).is("archived_at", null).order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (casesResult.error) throw casesResult.error;

  return {
    clients: ((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((client) => ({ id: client.id, name: client.name })),
    legalCases: ((casesResult.data ?? []) as Array<{ id: string; title: string; client_id: string | null }>).map((legalCase) => ({ id: legalCase.id, title: legalCase.title, clientId: legalCase.client_id })),
  };
}

export async function getDeadlinesOverview(lawFirmId: string, page?: number, limit?: number): Promise<DeadlinesOverview> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { pendingCount: 0, overdueCount: 0, urgentCount: 0, completedCount: 0, deadlines: [], totalCount: 0 };

  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;

  const { count } = await supabase.from("deadlines").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
  const totalCount = count ?? 0;

  // Fetch paginated deadlines
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const { data, error } = await supabase.from("deadlines").select("id, title, type, client_id, legal_case_id, due_date, due_time, priority, status, description").eq("law_firm_id", lawFirmId).order("due_date", { ascending: true }).range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; title: string; type: string; client_id: string | null; legal_case_id: string | null; due_date: string; due_time: string | null; priority: string; status: string; description: string | null }>;
  const clientIds = Array.from(new Set(rows.map((row) => row.client_id).filter(Boolean))) as string[];
  const caseIds = Array.from(new Set(rows.map((row) => row.legal_case_id).filter(Boolean))) as string[];
  const [clientsResult, casesResult] = await Promise.all([
    clientIds.length > 0 ? supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    caseIds.length > 0 ? supabase.from("legal_cases").select("id, title").eq("law_firm_id", lawFirmId).in("id", caseIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsResult.error) throw clientsResult.error;
  if (casesResult.error) throw casesResult.error;

  const clientNames = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((client) => [client.id, client.name]));
  const caseTitles = new Map(((casesResult.data ?? []) as Array<{ id: string; title: string }>).map((legalCase) => [legalCase.id, legalCase.title]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlines = rows.map((row) => {
    const isOverdue = row.status !== "concluido" && row.status !== "cancelado" && new Date(`${row.due_date}T00:00:00`) < today;
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      clientId: row.client_id,
      clientName: row.client_id ? clientNames.get(row.client_id) ?? null : null,
      legalCaseId: row.legal_case_id,
      legalCaseTitle: row.legal_case_id ? caseTitles.get(row.legal_case_id) ?? null : null,
      dueDate: row.due_date,
      dueTime: row.due_time,
      priority: row.priority,
      status: row.status,
      displayStatus: isOverdue ? "vencido" : row.status,
      description: row.description,
    } satisfies DeadlineItem;
  });

  // Compute summary stats from ALL deadlines (not just current page)
  const { data: allDeadlines } = await supabase.from("deadlines").select("status, priority, due_date").eq("law_firm_id", lawFirmId);
  const allRows = (allDeadlines ?? []) as Array<{ status: string; priority: string; due_date: string }>;

  const pendingCount = allRows.filter((d) => !["concluido", "cancelado"].includes(d.status)).length;
  const completedCount = allRows.filter((d) => d.status === "concluido").length;
  const overdueCount = allRows.filter((d) => !["concluido", "cancelado"].includes(d.status) && new Date(`${d.due_date}T00:00:00`) < today).length;
  const urgentCount = allRows.filter((d) => d.priority === "urgente" && !["concluido", "cancelado"].includes(d.status)).length;

  return {
    pendingCount,
    overdueCount,
    urgentCount,
    completedCount,
    deadlines,
    totalCount,
  };
}
