"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { legalCaseSchema } from "@/lib/validations/foundation";

type UpdateProcessClient = {
  from(table: "legal_cases"): {
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

function normalizeTags(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function updateProcessAction(formData: FormData) {
  const processId = String(formData.get("processId") ?? "");
  if (!processId) redirect("/processos?erro=processo");

  const context = await getAppContext();
  if (context.status === "missing-env") redirect(`/processos/${processId}/editar?erro=ambiente`);
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) redirect(`/processos/${processId}/editar?erro=permissao`);

  const parsed = legalCaseSchema.safeParse({
    clientId: String(formData.get("clientId") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    caseKind: String(formData.get("caseKind") ?? "judicial"),
    actionType: String(formData.get("actionType") ?? "").trim(),
    caseNumber: String(formData.get("caseNumber") ?? "").trim(),
    court: String(formData.get("court") ?? "").trim(),
    courtDivision: String(formData.get("courtDivision") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    startedAt: String(formData.get("startedAt") ?? "").trim(),
    status: String(formData.get("status") ?? "em_analise"),
    priority: String(formData.get("priority") ?? "normal"),
    opposingParty: String(formData.get("opposingParty") ?? "").trim(),
    opposingLawyer: String(formData.get("opposingLawyer") ?? "").trim(),
    strategicNotes: String(formData.get("strategicNotes") ?? "").trim(),
    tags: String(formData.get("tags") ?? "").trim(),
  });

  if (!parsed.success) redirect(`/processos/${processId}/editar?erro=validacao`);

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/processos/${processId}/editar?erro=ambiente`);

  const client = supabase as unknown as UpdateProcessClient;
  const { error } = await client
    .from("legal_cases")
    .update({
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      case_kind: parsed.data.caseKind,
      action_type: parsed.data.actionType,
      case_number: parsed.data.caseKind === "judicial" ? parsed.data.caseNumber : parsed.data.caseNumber || null,
      court: parsed.data.court || null,
      court_division: parsed.data.courtDivision || null,
      district: parsed.data.district || null,
      state: parsed.data.state || null,
      started_at: parsed.data.startedAt || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      opposing_party: parsed.data.opposingParty || null,
      opposing_lawyer: parsed.data.opposingLawyer || null,
      strategic_notes: parsed.data.strategicNotes || null,
      tags: normalizeTags(parsed.data.tags),
    })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", processId);

  if (error) redirect(`/processos/${processId}/editar?erro=atualizacao`);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "editou_processo",
    entity_type: "legal_case",
    entity_id: processId,
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath(`/processos/${processId}`);
  redirect(`/processos/${processId}?salvo=1`);
}
