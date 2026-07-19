import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getTimeEntries(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { entries: [], clients: [], legalCases: [], members: [], totals: { minutes: 0, billableMinutes: 0, amountCents: 0 } };

  const [entriesResult, clientsResult, casesResult, membersResult] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, description, started_at, ended_at, duration_minutes, hourly_rate_cents, billable, status, member_id, client_id, legal_case_id, law_firm_members(name), clients(name), legal_cases(title)")
      .eq("law_firm_id", lawFirmId)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).is("archived_at", null).order("name"),
    supabase.from("legal_cases").select("id, title").eq("law_firm_id", lawFirmId).is("archived_at", null).order("title"),
    supabase.from("law_firm_members").select("id, name").eq("law_firm_id", lawFirmId).eq("status", "ativo").order("name"),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (clientsResult.error) throw clientsResult.error;
  if (casesResult.error) throw casesResult.error;
  if (membersResult.error) throw membersResult.error;

  const entries = (entriesResult.data ?? []).map((item) => {
    const row = item as {
      id: string;
      description: string;
      started_at: string;
      ended_at: string | null;
      duration_minutes: number;
      hourly_rate_cents: number;
      billable: boolean;
      status: string;
      member_id: string;
      client_id: string | null;
      legal_case_id: string | null;
      law_firm_members: { name: string } | null;
      clients: { name: string } | null;
      legal_cases: { title: string } | null;
    };
    return {
      id: row.id,
      description: row.description,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes,
      hourlyRateCents: row.hourly_rate_cents,
      amountCents: Math.round((row.duration_minutes / 60) * row.hourly_rate_cents),
      billable: row.billable,
      status: row.status,
      memberName: row.law_firm_members?.name ?? "Equipe",
      clientName: row.clients?.name ?? null,
      caseTitle: row.legal_cases?.title ?? null,
    };
  });

  const totals = entries.reduce(
    (acc, entry) => {
      acc.minutes += entry.durationMinutes;
      if (entry.billable && entry.status !== "cancelado") {
        acc.billableMinutes += entry.durationMinutes;
        acc.amountCents += entry.amountCents;
      }
      return acc;
    },
    { minutes: 0, billableMinutes: 0, amountCents: 0 },
  );

  return {
    entries,
    totals,
    clients: (clientsResult.data ?? []).map((item) => item as { id: string; name: string }),
    legalCases: (casesResult.data ?? []).map((item) => item as { id: string; title: string }),
    members: (membersResult.data ?? []).map((item) => item as { id: string; name: string }),
  };
}
