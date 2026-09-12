"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PrivacyAdminClient = { from(table: "privacy_requests" | "audit_logs"): { update?(values: Record<string, unknown>): { eq(column: string, value: string): { eq(column: string, value: string): PromiseLike<{ error: Error | null }> } }; insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> } };

export async function updatePrivacyRequestAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "configuracoes.administrar")) redirect("/configuracoes/privacidade?erro=permissao");
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!requestId || !["recebida", "em_analise", "atendida", "negada", "cancelada"].includes(status)) redirect("/configuracoes/privacidade?erro=validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/configuracoes/privacidade?erro=ambiente");
  const client = supabase as unknown as PrivacyAdminClient;
  const update = client.from("privacy_requests").update;
  if (!update) redirect("/configuracoes/privacidade?erro=ambiente");
  const { error } = await update({ status, resolution_notes: notes || null, handled_by: context.member.id, handled_at: ["atendida", "negada", "cancelada"].includes(status) ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", requestId);
  if (error) redirect("/configuracoes/privacidade?erro=salvar");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "atualizou_solicitacao_lgpd", entity_type: "privacy_request", entity_id: requestId, metadata: { status } });
  revalidatePath("/configuracoes/privacidade");
  redirect("/configuracoes/privacidade?salvo=1");
}
