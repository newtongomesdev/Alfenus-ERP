"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations/foundation";

type TaskActionClient = {
  from(table: "tasks"): {
    insert(values: Record<string, unknown>): { select(columns: string): { single(): Promise<{ data: unknown; error: Error | null }> } };
    update(values: Record<string, unknown>): { eq(column: string, value: string): { eq(column: string, value: string): PromiseLike<{ error: Error | null }> } };
  };
  from(table: "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};

function fail(error: string): never {
  redirect(`/tarefas?erro=${error}`);
}

export async function createTaskAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "tarefas.gerenciar")) fail("permissao");

  const parsed = taskSchema.safeParse({ title: String(formData.get("title") ?? "").trim(), description: String(formData.get("description") ?? "").trim(), clientId: String(formData.get("clientId") ?? ""), legalCaseId: String(formData.get("legalCaseId") ?? ""), responsibleMemberId: String(formData.get("responsibleMemberId") ?? ""), priority: String(formData.get("priority") ?? "normal"), dueAt: String(formData.get("dueAt") ?? "") });
  if (!parsed.success) fail("validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as TaskActionClient;
  const { data: task, error } = await client.from("tasks").insert({ law_firm_id: context.lawFirm.id, title: parsed.data.title, description: parsed.data.description || null, client_id: parsed.data.clientId || null, legal_case_id: parsed.data.legalCaseId || null, responsible_member_id: parsed.data.responsibleMemberId || context.member.id, priority: parsed.data.priority, status: "pendente", due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null }).select("id").single();
  if (error) fail("criacao");
  const taskId = (task as { id: string }).id;
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "criou_tarefa", entity_type: "task", entity_id: taskId, metadata: { title: parsed.data.title } });
  revalidatePath("/tarefas");
  revalidatePath("/dashboard");
  redirect("/tarefas?criado=1");
}

export async function completeTaskAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "tarefas.gerenciar")) fail("permissao");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) fail("tarefa");
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as TaskActionClient;
  const { error } = await client.from("tasks").update({ status: "concluido" }).eq("law_firm_id", context.lawFirm.id).eq("id", taskId);
  if (error) fail("atualizacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "concluiu_tarefa", entity_type: "task", entity_id: taskId, metadata: {} });
  revalidatePath("/tarefas");
  revalidatePath("/dashboard");
  redirect("/tarefas?concluido=1");
}
