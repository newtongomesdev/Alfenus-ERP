"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { caseMovementSchema, casePartySchema } from "@/lib/validations/foundation";

type CaseActionClient = {
  from(table: "legal_case_parties" | "legal_case_movements" | "legal_case_collaborators"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
  from(table: "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};
function fail(caseId: string, code: string): never { redirect(`/processos/${caseId}?erro=${code}`); }

export async function addCasePartyAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) fail(caseId, "permissao");
  const parsed = casePartySchema.safeParse({ name: String(formData.get("name") ?? "").trim(), partyRole: String(formData.get("partyRole") ?? "").trim(), document: String(formData.get("document") ?? "").trim(), contact: String(formData.get("contact") ?? "").trim() });
  if (!parsed.success) fail(caseId, "validacao");
  const supabase = await getSupabaseServerClient(); if (!supabase) fail(caseId, "ambiente"); const client = supabase as unknown as CaseActionClient;
  const { error } = await client.from("legal_case_parties").insert({ law_firm_id: context.lawFirm.id, legal_case_id: caseId, name: parsed.data.name, party_role: parsed.data.partyRole, document: parsed.data.document || null, contact: parsed.data.contact || null });
  if (error) fail(caseId, "criacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "adicionou_parte_processo", entity_type: "legal_case", entity_id: caseId, metadata: { name: parsed.data.name } });
  revalidatePath(`/processos/${caseId}`); redirect(`/processos/${caseId}?salvo=1`);
}

export async function addCaseMovementAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) fail(caseId, "permissao");
  const parsed = caseMovementSchema.safeParse({ title: String(formData.get("title") ?? "").trim(), description: String(formData.get("description") ?? "").trim(), occurredAt: String(formData.get("occurredAt") ?? "") });
  if (!parsed.success) fail(caseId, "validacao");
  const supabase = await getSupabaseServerClient(); if (!supabase) fail(caseId, "ambiente"); const client = supabase as unknown as CaseActionClient;
  const { error } = await client.from("legal_case_movements").insert({ law_firm_id: context.lawFirm.id, legal_case_id: caseId, title: parsed.data.title, description: parsed.data.description || null, occurred_at: new Date(parsed.data.occurredAt).toISOString(), created_by: context.member.id });
  if (error) fail(caseId, "criacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "adicionou_movimentacao_processo", entity_type: "legal_case", entity_id: caseId, metadata: { title: parsed.data.title } });
  revalidatePath(`/processos/${caseId}`); redirect(`/processos/${caseId}?salvo=1`);
}

export async function addCaseCollaboratorAction(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? ""); const memberId = String(formData.get("memberId") ?? "");
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) fail(caseId, "permissao");
  const supabase = await getSupabaseServerClient(); if (!supabase) fail(caseId, "ambiente"); const client = supabase as unknown as CaseActionClient;
  const { error } = await client.from("legal_case_collaborators").insert({ law_firm_id: context.lawFirm.id, legal_case_id: caseId, member_id: memberId, collaborator_role: String(formData.get("collaboratorRole") ?? "Colaborador") });
  if (error) fail(caseId, "colaborador");
  revalidatePath(`/processos/${caseId}`); redirect(`/processos/${caseId}?salvo=1`);
}
