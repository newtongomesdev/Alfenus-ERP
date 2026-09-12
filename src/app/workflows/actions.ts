"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type WorkflowActionClient = {
  from(table: "tasks" | "deadlines"): {
    insert(values: Record<string, unknown>[]): PromiseLike<{ error: Error | null }>;
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

export async function applyWorkflowTemplateAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) redirect("/workflows?erro=permissao");

  const templateId = String(formData.get("templateId") ?? "");
  const legalCaseId = String(formData.get("legalCaseId") ?? "");
  const responsibleMemberId = String(formData.get("responsibleMemberId") ?? context.member.id);
  if (!templateId || !legalCaseId) redirect("/workflows?erro=dados");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/workflows?erro=ambiente");

  const [templateResult, caseResult] = await Promise.all([
    supabase
      .from("workflow_template_items")
      .select("item_type, title, description, offset_days, priority")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("template_id", templateId)
      .order("sort_order"),
    supabase.from("legal_cases").select("id, client_id, title").eq("law_firm_id", context.lawFirm.id).eq("id", legalCaseId).maybeSingle(),
  ]);

  if (templateResult.error || caseResult.error || !caseResult.data) redirect("/workflows?erro=consulta");

  const client = supabase as unknown as WorkflowActionClient;
  const baseDate = new Date();
  const items = (templateResult.data ?? []) as Array<{ item_type: string; title: string; description: string | null; offset_days: number; priority: string }>;
  const caseRow = caseResult.data as { id: string; client_id: string | null; title: string };
  const taskRows = items
    .filter((item) => item.item_type === "task")
    .map((item) => ({
      law_firm_id: context.lawFirm!.id,
      title: item.title,
      description: item.description,
      client_id: caseRow.client_id,
      legal_case_id: caseRow.id,
      responsible_member_id: responsibleMemberId || context.member!.id,
      priority: item.priority,
      status: "pendente",
      due_at: addDays(baseDate, item.offset_days).toISOString(),
    }));
  const deadlineRows = items
    .filter((item) => item.item_type === "deadline")
    .map((item) => {
      const due = addDays(baseDate, item.offset_days);
      return {
        law_firm_id: context.lawFirm!.id,
        title: item.title,
        type: "prazo_interno",
        client_id: caseRow.client_id,
        legal_case_id: caseRow.id,
        responsible_member_id: responsibleMemberId || context.member!.id,
        priority: item.priority,
        status: "pendente",
        due_date: due.toISOString().slice(0, 10),
        description: item.description,
      };
    });

  if (taskRows.length > 0) {
    const { error } = await client.from("tasks").insert(taskRows);
    if (error) redirect("/workflows?erro=tarefas");
  }
  if (deadlineRows.length > 0) {
    const { error } = await client.from("deadlines").insert(deadlineRows);
    if (error) redirect("/workflows?erro=prazos");
  }

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "aplicou_template_workflow",
    entity_type: "legal_case",
    entity_id: legalCaseId,
    metadata: { template_id: templateId, tasks: taskRows.length, deadlines: deadlineRows.length },
  });

  revalidatePath("/workflows");
  revalidatePath(`/processos/${legalCaseId}`);
  revalidatePath("/tarefas");
  revalidatePath("/prazos");
  redirect(`/processos/${legalCaseId}?workflow=1`);
}
