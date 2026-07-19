import { getSupabaseServerClient } from "@/lib/supabase/server";

type PortalQueryClient = {
  from(table: "client_portal_invites"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
  };
};

export async function getClientPortalDashboard(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { invites: [], clients: [] };

  const [invitesResult, clientsResult] = await Promise.all([
    supabase
      .from("client_portal_invites")
      .select("id, token, email, status, expires_at, last_access_at, created_at, client_id, clients(name)")
      .eq("law_firm_id", lawFirmId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("clients").select("id, name, email").eq("law_firm_id", lawFirmId).is("archived_at", null).order("name"),
  ]);

  if (invitesResult.error) throw invitesResult.error;
  if (clientsResult.error) throw clientsResult.error;

  return {
    invites: (invitesResult.data ?? []).map((item) => {
      const row = item as {
        id: string;
        token: string;
        email: string | null;
        status: string;
        expires_at: string | null;
        last_access_at: string | null;
        created_at: string;
        client_id: string;
        clients: { name: string } | null;
      };
      return {
        id: row.id,
        token: row.token,
        email: row.email,
        status: row.status,
        expiresAt: row.expires_at,
        lastAccessAt: row.last_access_at,
        createdAt: row.created_at,
        clientId: row.client_id,
        clientName: row.clients?.name ?? "Cliente",
      };
    }),
    clients: (clientsResult.data ?? []).map((item) => item as { id: string; name: string; email: string | null }),
  };
}

export async function getPublicPortalByToken(token: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: invite, error } = await supabase
    .from("client_portal_invites")
    .select("id, law_firm_id, client_id, email, status, expires_at, clients(id, name, email), law_firms(name)")
    .eq("token", token)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  if (!invite) return null;

  const row = invite as {
    id: string;
    law_firm_id: string;
    client_id: string;
    email: string | null;
    status: string;
    expires_at: string | null;
    clients: { id: string; name: string; email: string | null } | null;
    law_firms: { name: string } | null;
  };

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

  const client = supabase as unknown as PortalQueryClient;
  await client.from("client_portal_invites").update({ last_access_at: new Date().toISOString() }).eq("id", row.id);

  const [casesResult, contractsResult, documentsResult, deadlinesResult, expensesResult, docRequestsResult] = await Promise.all([
    supabase.from("legal_cases").select("id, title, case_number, status, priority, court, district, state").eq("law_firm_id", row.law_firm_id).eq("client_id", row.client_id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, service_description, total_amount_cents, status, created_at").eq("law_firm_id", row.law_firm_id).eq("client_id", row.client_id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, name, mime_type, size_bytes, entity_type, entity_id, created_at").eq("law_firm_id", row.law_firm_id).eq("entity_type", "client").eq("entity_id", row.client_id).order("created_at", { ascending: false }),
    supabase.from("deadlines").select("id, title, due_date, due_time, status, legal_case_id").eq("law_firm_id", row.law_firm_id).eq("client_id", row.client_id).order("due_date", { ascending: true }).limit(20),
    supabase.from("expenses").select("id, description, category, amount_cents, status, due_date, paid_at").eq("law_firm_id", row.law_firm_id).eq("client_id", row.client_id).order("created_at", { ascending: false }).limit(20),
    supabase.from("document_requests" as any).select("id, title, document_type, status, priority, due_date, created_at").eq("law_firm_id", row.law_firm_id).eq("client_id", row.client_id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (casesResult.error) throw casesResult.error;
  if (contractsResult.error) throw contractsResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (deadlinesResult.error) throw deadlinesResult.error;

  return {
    client: row.clients,
    lawFirm: row.law_firms,
    cases: casesResult.data ?? [],
    contracts: contractsResult.data ?? [],
    documents: documentsResult.data ?? [],
    deadlines: deadlinesResult.data ?? [],
    expenses: (expensesResult.data ?? []) as any[],
    documentRequests: (docRequestsResult.data ?? []) as any[],
  };
}
