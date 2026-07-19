import { getSupabaseServerClient } from "@/lib/supabase/server";

function normalizeSearch(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, "").slice(0, 80);
}

export async function getConflictCheck(lawFirmId: string, term: string) {
  const query = normalizeSearch(term);
  if (query.length < 3) return { query, clients: [], parties: [], cases: [] };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { query, clients: [], parties: [], cases: [] };

  const like = `%${query}%`;
  const [clientsResult, partiesResult, casesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, document, email, status")
      .eq("law_firm_id", lawFirmId)
      .or(`name.ilike.${like},document.ilike.${like},email.ilike.${like}`)
      .limit(10),
    supabase
      .from("legal_case_parties")
      .select("id, name, party_role, document, legal_case_id")
      .eq("law_firm_id", lawFirmId)
      .or(`name.ilike.${like},document.ilike.${like},contact.ilike.${like}`)
      .limit(10),
    supabase
      .from("legal_cases")
      .select("id, title, case_number, opposing_party, opposing_lawyer, status")
      .eq("law_firm_id", lawFirmId)
      .or(`title.ilike.${like},case_number.ilike.${like},opposing_party.ilike.${like},opposing_lawyer.ilike.${like}`)
      .limit(10),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (partiesResult.error) throw partiesResult.error;
  if (casesResult.error) throw casesResult.error;

  return {
    query,
    clients: clientsResult.data ?? [],
    parties: partiesResult.data ?? [],
    cases: casesResult.data ?? [],
  };
}
