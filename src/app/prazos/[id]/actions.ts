"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { deadlineSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type DeadlineReadClient = {
  from(table: "deadlines"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null; error: Error | null }> };
      };
    };
  };
};

type DeadlineUpdateClient = {
  from(table: "deadlines"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

function redirectForError(error: string): never {
  redirect(`/prazos?erro=${error}`);
}

export type DeadlineData = {
  id: string;
  title: string;
  type: string;
  client_id: string | null;
  legal_case_id: string | null;
  responsible_member_id: string | null;
  due_date: string;
  due_time: string | null;
  priority: string;
  status: string;
  description: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getDeadlineById(lawFirmId: string, deadlineId: string): Promise<DeadlineData | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await (supabase as unknown as DeadlineReadClient)
    .from("deadlines")
    .select("id, title, type, client_id, legal_case_id, responsible_member_id, due_date, due_time, priority, status, description, completed_at, created_at, updated_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", deadlineId)
    .maybeSingle();
  return (data as DeadlineData | null) ?? null;
}

export async function updateDeadlineAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "prazos.editar")) redirectForError("permissao");

  const deadlineId = String(formData.get("deadlineId") ?? "");
  if (!deadlineId) redirectForError("validacao");

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

  const client = supabase as unknown as DeadlineUpdateClient;
  const { error } = await client
    .from("deadlines")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      client_id: parsed.data.clientId || null,
      legal_case_id: parsed.data.legalCaseId || null,
      due_date: parsed.data.dueDate,
      due_time: parsed.data.dueTime || null,
      priority: parsed.data.priority,
      description: parsed.data.description || null,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", deadlineId);

  if (error) redirectForError("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "atualizou_prazo",
    entity_type: "deadline",
    entity_id: deadlineId,
    metadata: { title: parsed.data.title, due_date: parsed.data.dueDate },
  });

  revalidatePath("/prazos");
  revalidatePath("/dashboard");
  redirect("/prazos?salvo=1");
}

export async function deleteDeadlineAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "prazos.editar")) redirectForError("permissao");

  const deadlineId = String(formData.get("deadlineId") ?? "");
  if (!deadlineId) redirectForError("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirectForError("ambiente");

  const client = supabase as unknown as DeadlineUpdateClient;
  const { error } = await client
    .from("deadlines")
    .update({ status: "cancelado", updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", deadlineId);

  if (error) redirectForError("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_prazo",
    entity_type: "deadline",
    entity_id: deadlineId,
    metadata: {},
  });

  revalidatePath("/prazos");
  revalidatePath("/dashboard");
  redirect("/prazos?cancelado=1");
}
