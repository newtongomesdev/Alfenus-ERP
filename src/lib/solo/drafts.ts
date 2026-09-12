import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SoloCaseInput } from "@/lib/solo/schemas";

export type SoloCaseDraft = {
  id: string;
  payload: Partial<SoloCaseInput>;
  updatedAt: string;
};

export async function getSoloCaseDraft(draftId?: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm || !draftId) return null;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from("solo_case_drafts")
    .select("id, payload, updated_at")
    .eq("id", draftId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("created_by", context.member.userId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) return null;
  await (supabase as any)
    .from("solo_case_drafts")
    .update({ resumed_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("created_by", context.member.userId);
  return { id: data.id, payload: data.payload as Partial<SoloCaseInput>, updatedAt: data.updated_at } satisfies SoloCaseDraft;
}

export async function getSoloCaseDrafts() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return [];
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await (supabase as any)
    .from("solo_case_drafts")
    .select("id, payload, updated_at")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("created_by", context.member.userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(10);
  return ((data ?? []) as Array<{ id: string; payload: Partial<SoloCaseInput>; updated_at: string }>).map((draft) => ({
    id: draft.id,
    title: draft.payload.caseTitle || draft.payload.clientName || "Rascunho sem título",
    clientName: draft.payload.clientName || "Cliente ainda não informado",
    updatedAt: draft.updated_at,
  }));
}
