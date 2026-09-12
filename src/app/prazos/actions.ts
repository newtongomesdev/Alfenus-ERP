"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deadlineSchema } from "@/lib/validations/foundation";
import { checkDeadlineReminders } from "@/lib/alerts/check-deadline-reminders";

type DeadlineActionClient = {
  from(table: "deadlines"): {
    insert(values: Record<string, unknown>): { select(columns: string): { single(): Promise<{ data: unknown; error: Error | null }> } };
    update(values: Record<string, unknown>): { eq(column: string, value: string): { eq(column: string, value: string): PromiseLike<{ error: Error | null }> } };
  };
  from(table: "notifications" | "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};

function redirectForError(error: string): never {
  redirect(`/prazos?erro=${error}`);
}

export async function createDeadlineAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirectForError("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "prazos.criar")) redirectForError("permissao");

  const parsed = deadlineSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim(),
    clientId: String(formData.get("clientId") ?? ""),
    legalCaseId: String(formData.get("legalCaseId") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    dueTime: String(formData.get("dueTime") ?? ""),
    priority: String(formData.get("priority") ?? "normal"),
    description: String(formData.get("description") ?? "").trim(),
  });
  if (!parsed.success) redirectForError("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirectForError("ambiente");
  const client = supabase as unknown as DeadlineActionClient;
  const { data: deadline, error } = await client.from("deadlines").insert({
    law_firm_id: context.lawFirm.id,
    title: parsed.data.title,
    type: parsed.data.type,
    client_id: parsed.data.clientId || null,
    legal_case_id: parsed.data.legalCaseId || null,
    responsible_member_id: context.member.id,
    due_date: parsed.data.dueDate,
    due_time: parsed.data.dueTime || null,
    priority: parsed.data.priority,
    status: "pendente",
    description: parsed.data.description || null,
  }).select("id").single();
  if (error) redirectForError("criacao");

  const deadlineId = (deadline as { id: string }).id;
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "criou_prazo", entity_type: "deadline", entity_id: deadlineId, metadata: { title: parsed.data.title, due_date: parsed.data.dueDate } });

  await client.from("notifications").insert({
    law_firm_id: context.lawFirm.id,
    member_id: context.member.id,
    type: "prazo",
    title: "Novo prazo",
    body: `Novo prazo: ${parsed.data.title} - Vence em ${parsed.data.dueDate}`,
    metadata: { deadline_id: deadlineId, due_date: parsed.data.dueDate },
  });

  revalidatePath("/prazos");
  revalidatePath("/dashboard");
  checkDeadlineReminders().catch((err) => console.error("[background] checkDeadlineReminders:", err));
  redirect("/prazos?criado=1");
}

export async function completeDeadlineAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "prazos.concluir")) redirectForError("permissao");
  const deadlineId = String(formData.get("deadlineId") ?? "");
  if (!deadlineId) redirectForError("prazo");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirectForError("ambiente");
  const client = supabase as unknown as DeadlineActionClient;
  const { error } = await client.from("deadlines").update({ status: "concluido", completed_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", deadlineId);
  if (error) redirectForError("atualizacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "concluiu_prazo", entity_type: "deadline", entity_id: deadlineId, metadata: {} });
  checkDeadlineReminders().catch((err) => console.error("[background] checkDeadlineReminders:", err));
  revalidatePath("/prazos");
  revalidatePath("/dashboard");
  redirect("/prazos?concluido=1");
}
