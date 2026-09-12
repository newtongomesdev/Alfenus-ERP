"use server";

import { z } from "zod";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getClients } from "@/lib/clients/queries";
import { soloCaseInputSchema, type SoloCaseInput } from "@/lib/solo/schemas";

const searchSchema = z.string().trim().max(100);

export async function searchSoloClientsAction(term: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm || !context.member || !can(context.member.role, "clientes.visualizar")) {
    return { ok: false as const, items: [] };
  }

  const parsed = searchSchema.safeParse(term);
  if (!parsed.success) return { ok: true as const, items: [] };

  const result = await getClients(context.lawFirm.id, parsed.data, 1, 20);
  return { ok: true as const, items: result.items.map(({ id, name, document, email, phone }) => ({ id, name, document, email, phone })) };
}

export async function saveSoloCaseDraftAction(input: Partial<SoloCaseInput>, draftId?: string | null) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm || !can(context.member.role, "processos.criar")) {
    return { ok: false as const, error: "Seu perfil não pode salvar rascunhos." };
  }
  const parsed = soloCaseInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  const supabase = await (await import("@/lib/supabase/server")).getSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "O banco de dados está indisponível." };

  const query = (supabase as any).from("solo_case_drafts");
  const { data, error } = draftId
    ? await query
      .update({ payload: parsed.data, updated_at: new Date().toISOString(), resumed_at: new Date().toISOString() })
      .eq("id", draftId)
      .eq("law_firm_id", context.lawFirm.id)
      .eq("created_by", context.member.userId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle()
    : await query
      .insert({ law_firm_id: context.lawFirm.id, created_by: context.member.userId, payload: parsed.data })
      .select("id")
      .single();
  if (error) return { ok: false as const, error: "Não foi possível salvar o rascunho. Tente novamente." };
  if (!data) return { ok: false as const, error: "Este rascunho não está mais disponível." };
  return { ok: true as const, draftId: data.id };
}

export async function archiveSoloCaseDraftAction(draftId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm || !can(context.member.role, "processos.criar")) {
    return { ok: false as const };
  }
  const supabase = await (await import("@/lib/supabase/server")).getSupabaseServerClient();
  if (!supabase) return { ok: false as const };
  const { error } = await (supabase as any)
    .from("solo_case_drafts")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("created_by", context.member.userId)
    .is("archived_at", null);
  return { ok: !error } as const;
}

export async function deleteSoloCaseDraftAction(draftId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm || !can(context.member.role, "processos.criar")) {
    return { ok: false as const, error: "Seu perfil não pode excluir rascunhos." };
  }
  const supabase = await (await import("@/lib/supabase/server")).getSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "O banco de dados está indisponível." };
  const { error } = await (supabase as any)
    .from("solo_case_drafts")
    .delete()
    .eq("id", draftId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("created_by", context.member.userId);
  return error ? { ok: false as const, error: "Não foi possível excluir o rascunho." } : { ok: true as const };
}
