import { getSupabaseServerClient } from "@/lib/supabase/server";

export type LeadListItem = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  interest: string | null;
  funnelStage: string;
  probability: number;
  estimatedValueCents: number;
  nextContactAt: string | null;
  status: string;
  convertedClientId: string | null;
  createdAt: string;
};

export type LeadsResult = { items: LeadListItem[]; totalCount: number };

export async function getLeads(lawFirmId: string, search?: string, page?: number, limit?: number): Promise<LeadsResult> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;
  const offset = (safePage - 1) * safeLimit;

  if (!supabase) {
    return { items: [], totalCount: 0 };
  }

  let query = supabase
    .from("leads")
    .select("id, name, phone, whatsapp, email, source, interest, funnel_stage, probability, estimated_value_cents, next_contact_at, status, converted_client_id, created_at", { count: "exact" })
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim().replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,whatsapp.ilike.%${term}%,interest.ilike.%${term}%`);
  }

  const { data, error, count } = await query.range(offset, offset + safeLimit - 1);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;
  const items = (data ?? []).map((lead) => {
    const row = lead as {
      id: string;
      name: string;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      source: string | null;
      interest: string | null;
      funnel_stage: string;
      probability: number;
      estimated_value_cents: number;
      next_contact_at: string | null;
      status: string;
      converted_client_id: string | null;
      created_at: string;
    };

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      source: row.source,
      interest: row.interest,
      funnelStage: row.funnel_stage,
      probability: row.probability,
      estimatedValueCents: row.estimated_value_cents,
      nextContactAt: row.next_contact_at,
      status: row.status,
      convertedClientId: row.converted_client_id,
      createdAt: row.created_at,
    };
  });

  return { items, totalCount };
}
