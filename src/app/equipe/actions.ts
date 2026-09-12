"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { teamInvitationSchema } from "@/lib/validations/foundation";

type TeamClient = {
  from(table: "team_invitations" | "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
  from(table: "law_firm_members"): { update(values: Record<string, unknown>): { eq(column: string, value: string): { eq(column: string, value: string): PromiseLike<{ error: Error | null }> } } };
};

function fail(code: string): never { redirect(`/equipe?erro=${code}`); }

export async function inviteTeamMemberAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "equipe.gerenciar")) fail("permissao");
  const parsed = teamInvitationSchema.safeParse({ email: String(formData.get("email") ?? "").trim().toLowerCase(), role: String(formData.get("role") ?? "colaborador") });
  if (!parsed.success) fail("validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as TeamClient;
  const { error } = await client.from("team_invitations").insert({ law_firm_id: context.lawFirm.id, email: parsed.data.email, role: parsed.data.role, token: randomUUID(), invited_by: context.member.id, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
  if (error) fail("convite");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "convidou_membro", entity_type: "team_invitation", metadata: { email: parsed.data.email, role: parsed.data.role } });
  revalidatePath("/equipe");
  redirect("/equipe?convidado=1");
}

export async function updateMemberRoleAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "equipe.gerenciar")) fail("permissao");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");
  const parsed = teamInvitationSchema.shape.role.safeParse(role);
  if (!memberId || !parsed.success) fail("validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as TeamClient;
  const { error } = await client.from("law_firm_members").update({ role: parsed.data }).eq("law_firm_id", context.lawFirm.id).eq("id", memberId);
  if (error) fail("papel");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "alterou_papel_membro", entity_type: "law_firm_member", entity_id: memberId, metadata: { role: parsed.data } });
  revalidatePath("/equipe"); revalidatePath("/configuracoes");
  redirect("/equipe?atualizado=1");
}
