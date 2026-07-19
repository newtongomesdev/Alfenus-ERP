"use server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ConflictClient = { id: string; name: string; document: string | null; email: string | null; phone: string | null; status: string };
export type ConflictParty = { id: string; name: string; party_role: string | null; document: string | null; legal_case_id: string };
export type ConflictCase = { id: string; title: string; case_number: string | null; opposing_party: string | null; opposing_lawyer: string | null; status: string; priority: string };
export type ConflictLead = { id: string; name: string; email: string | null; phone: string | null; interest: string | null; status: string; funnel_stage: string | null };
export type ConflictCorrespondent = { id: string; name: string; oab: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; specialty: string | null };

export type ConflictResult = {
  query: string;
  clients: ConflictClient[];
  parties: ConflictParty[];
  cases: ConflictCase[];
  leads: ConflictLead[];
  correspondents: ConflictCorrespondent[];
  totalMatches: number;
};

export async function enhancedConflictCheck(term: string): Promise<ConflictResult> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const query = term.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, "").slice(0, 80);
  if (query.length < 3) return { query, clients: [], parties: [], cases: [], leads: [], correspondents: [], totalMatches: 0 };

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const like = `%${query}%`;
  const firmId = context.lawFirm.id;

  const [clientsResult, partiesResult, casesResult, leadsResult, corrResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, document, email, phone, status")
      .eq("law_firm_id", firmId)
      .or(`name.ilike.${like},document.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(15),
    supabase
      .from("legal_case_parties")
      .select("id, name, party_role, document, legal_case_id")
      .eq("law_firm_id", firmId)
      .or(`name.ilike.${like},document.ilike.${like},contact.ilike.${like}`)
      .limit(15),
    supabase
      .from("legal_cases")
      .select("id, title, case_number, opposing_party, opposing_lawyer, status, priority")
      .eq("law_firm_id", firmId)
      .or(`title.ilike.${like},case_number.ilike.${like},opposing_party.ilike.${like},opposing_lawyer.ilike.${like}`)
      .limit(15),
    supabase
      .from("leads")
      .select("id, name, email, phone, interest, status, funnel_stage")
      .eq("law_firm_id", firmId)
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},interest.ilike.${like}`)
      .limit(15),
    supabase
      .from("correspondents" as any)
      .select("id, name, oab, email, phone, city, state, specialty")
      .eq("law_firm_id", firmId)
      .or(`name.ilike.${like},oab.ilike.${like},email.ilike.${like},city.ilike.${like}`)
      .limit(15),
  ]);

  const clients = (clientsResult.data ?? []) as ConflictClient[];
  const parties = (partiesResult.data ?? []) as ConflictParty[];
  const cases = (casesResult.data ?? []) as ConflictCase[];
  const leads = (leadsResult.data ?? []) as ConflictLead[];
  const correspondents = (corrResult.data ?? []) as unknown as ConflictCorrespondent[];

  return {
    query,
    clients,
    parties,
    cases,
    leads,
    correspondents,
    totalMatches: clients.length + parties.length + cases.length + leads.length + correspondents.length,
  };
}
