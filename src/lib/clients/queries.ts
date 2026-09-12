import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClientListItem = {
  id: string;
  name: string;
  personType: string;
  document: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  interestArea: string | null;
  status: string;
  tags: string[];
  createdAt: string;
};

export type ClientDetail = ClientListItem & {
  birthDate: string | null;
  profession: string | null;
  maritalStatus: string | null;
  notes: string | null;
};

export type ClientRelatedCounts = {
  processes: number;
  contracts: number;
  deadlines: number;
  documents: number;
  payments: number;
};

export type ClientsResult = { items: ClientListItem[]; totalCount: number };

export async function getClients(lawFirmId: string, search?: string, page?: number, limit?: number): Promise<ClientsResult> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;
  const offset = (safePage - 1) * safeLimit;

  if (!supabase) {
    return { items: [], totalCount: 0 };
  }

  let query = supabase
    .from("clients")
    .select("id, name, person_type, document, whatsapp, phone, email, source, interest_area, status, tags, created_at", { count: "exact" })
    .eq("law_firm_id", lawFirmId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,document.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error, count } = await query.range(offset, offset + safeLimit - 1);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;
  const items = (data ?? []).map((client) => {
    const row = client as {
      id: string;
      name: string;
      person_type: string;
      document: string | null;
      whatsapp: string | null;
      phone: string | null;
      email: string | null;
      source: string | null;
      interest_area: string | null;
      status: string;
      tags: string[] | null;
      created_at: string;
    };

    return {
      id: row.id,
      name: row.name,
      personType: row.person_type,
      document: row.document,
      whatsapp: row.whatsapp,
      phone: row.phone,
      email: row.email,
      source: row.source,
      interestArea: row.interest_area,
      status: row.status,
      tags: row.tags ?? [],
      createdAt: row.created_at,
    };
  });

  return { items, totalCount };
}

export async function getClientDetail(lawFirmId: string, clientId: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, person_type, document, birth_date, profession, marital_status, whatsapp, phone, email, source, interest_area, status, notes, tags, created_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", clientId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as {
    id: string;
    name: string;
    person_type: string;
    document: string | null;
    birth_date: string | null;
    profession: string | null;
    marital_status: string | null;
    whatsapp: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    interest_area: string | null;
    status: string;
    notes: string | null;
    tags: string[] | null;
    created_at: string;
  };

  return {
    id: row.id,
    name: row.name,
    personType: row.person_type,
    document: row.document,
    birthDate: row.birth_date,
    profession: row.profession,
    maritalStatus: row.marital_status,
    whatsapp: row.whatsapp,
    phone: row.phone,
    email: row.email,
    source: row.source,
    interestArea: row.interest_area,
    status: row.status,
    notes: row.notes,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  } satisfies ClientDetail;
}

async function countRelated(
  table: "legal_cases" | "contracts" | "deadlines" | "documents" | "payments",
  lawFirmId: string,
  clientId: string,
) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return 0;
  }

  // documents uses entity_type/entity_id instead of client_id
  const query =
    table === "documents"
      ? supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("law_firm_id", lawFirmId)
          .eq("entity_type", "client")
          .eq("entity_id", clientId)
      : supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("law_firm_id", lawFirmId)
          .eq("client_id", clientId);

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getClientRelatedCounts(lawFirmId: string, clientId: string): Promise<ClientRelatedCounts> {
  const [processes, contracts, deadlines, documents, payments] = await Promise.all([
    countRelated("legal_cases", lawFirmId, clientId),
    countRelated("contracts", lawFirmId, clientId),
    countRelated("deadlines", lawFirmId, clientId),
    countRelated("documents", lawFirmId, clientId),
    countRelated("payments", lawFirmId, clientId),
  ]);

  return { processes, contracts, deadlines, documents, payments };
}

export type TimelineEvent = {
  id: string;
  type: "contrato" | "pagamento" | "processo" | "prazo" | "tarefa";
  title: string;
  description: string | null;
  amountCents: number | null;
  date: string;
};

export async function getClientTimeline(lawFirmId: string, clientId: string): Promise<TimelineEvent[]> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const [contractsResult, paymentsResult, casesResult, deadlinesResult, tasksResult] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, service_description, total_amount_cents, status, created_at")
      .eq("law_firm_id", lawFirmId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("id, amount_cents, payment_method, paid_at, created_at")
      .eq("law_firm_id", lawFirmId)
      .eq("client_id", clientId)
      .order("paid_at", { ascending: false })
      .limit(10),
    supabase
      .from("legal_cases")
      .select("id, title, case_number, status, created_at")
      .eq("law_firm_id", lawFirmId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("deadlines")
      .select("id, title, type, due_date, status, created_at")
      .eq("law_firm_id", lawFirmId)
      .eq("client_id", clientId)
      .order("due_date", { ascending: false })
      .limit(10),
    supabase
      .from("tasks")
      .select("id, title, status, due_at, created_at")
      .eq("law_firm_id", lawFirmId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const events: TimelineEvent[] = [];

  for (const row of contractsResult.data ?? []) {
    const r = row as { id: string; service_description: string; total_amount_cents: number; status: string; created_at: string };
    events.push({
      id: r.id,
      type: "contrato",
      title: r.service_description.slice(0, 60),
      description: `Status: ${r.status}`,
      amountCents: r.total_amount_cents,
      date: r.created_at,
    });
  }

  for (const row of paymentsResult.data ?? []) {
    const r = row as { id: string; amount_cents: number; payment_method: string; paid_at: string; created_at: string };
    events.push({
      id: r.id,
      type: "pagamento",
      title: `Pagamento via ${r.payment_method}`,
      description: null,
      amountCents: r.amount_cents,
      date: r.paid_at || r.created_at,
    });
  }

  for (const row of casesResult.data ?? []) {
    const r = row as { id: string; title: string; case_number: string | null; status: string; created_at: string };
    events.push({
      id: r.id,
      type: "processo",
      title: r.title,
      description: [r.case_number, r.status].filter(Boolean).join(" · "),
      amountCents: null,
      date: r.created_at,
    });
  }

  for (const row of deadlinesResult.data ?? []) {
    const r = row as { id: string; title: string; type: string; due_date: string; status: string; created_at: string };
    events.push({
      id: r.id,
      type: "prazo",
      title: r.title,
      description: `${r.type} · ${r.status}`,
      amountCents: null,
      date: r.due_date,
    });
  }

  for (const row of tasksResult.data ?? []) {
    const r = row as { id: string; title: string; status: string; due_at: string | null; created_at: string };
    events.push({
      id: r.id,
      type: "tarefa",
      title: r.title,
      description: `Status: ${r.status}`,
      amountCents: null,
      date: r.due_at || r.created_at,
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events.slice(0, 30);
}
