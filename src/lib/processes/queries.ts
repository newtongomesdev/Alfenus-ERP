import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProcessListItem = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  caseKind: string;
  actionType: string | null;
  caseNumber: string | null;
  court: string | null;
  district: string | null;
  state: string | null;
  status: string;
  priority: string;
  opposingParty: string | null;
  createdAt: string;
};

export type ProcessesResult = { items: ProcessListItem[]; totalCount: number };

export async function getProcesses(lawFirmId: string, search?: string, page?: number, limit?: number): Promise<ProcessesResult> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;
  const offset = (safePage - 1) * safeLimit;

  if (!supabase) {
    return { items: [], totalCount: 0 };
  }

  let query = supabase
    .from("legal_cases")
    .select("id, client_id, title, case_kind, action_type, case_number, court, district, state, status, priority, opposing_party, created_at", { count: "exact" })
    .eq("law_firm_id", lawFirmId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,case_number.ilike.%${term}%,action_type.ilike.%${term}%`);
  }

  const { data, error, count } = await query.range(offset, offset + safeLimit - 1);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;

  const processRows = (data ?? []) as Array<{
    id: string;
    client_id: string | null;
    title: string;
    case_kind: string;
    action_type: string | null;
    case_number: string | null;
    court: string | null;
    district: string | null;
    state: string | null;
    status: string;
    priority: string;
    opposing_party: string | null;
    created_at: string;
  }>;

  const clientIds = Array.from(new Set(processRows.map((item) => item.client_id).filter(Boolean))) as string[];
  let clientNames = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("law_firm_id", lawFirmId)
      .in("id", clientIds);

    if (clientsError) {
      throw clientsError;
    }

    clientNames = new Map(
      ((clients ?? []) as Array<{ id: string; name: string }>).map((client) => [client.id, client.name]),
    );
  }

  const items = processRows.map((item) => ({
    id: item.id,
    clientId: item.client_id,
    clientName: item.client_id ? clientNames.get(item.client_id) ?? null : null,
    title: item.title,
    caseKind: item.case_kind,
    actionType: item.action_type,
    caseNumber: item.case_number,
    court: item.court,
    district: item.district,
    state: item.state,
    status: item.status,
    priority: item.priority,
    opposingParty: item.opposing_party,
    createdAt: item.created_at,
  }));

  return { items, totalCount };
}
