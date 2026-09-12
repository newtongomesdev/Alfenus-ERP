"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { legalCaseSchema } from "@/lib/validations/foundation";

type InsertProcessClient = {
  from(table: "legal_cases"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
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

export async function createProcessAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/processos/novo?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "processos.criar")) {
    redirect("/processos/novo?erro=permissao");
  }

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

  if (!parsed.success) {
    redirect("/processos/novo?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/processos/novo?erro=ambiente");
  }

  const insertClient = supabase as unknown as InsertProcessClient;
  const { data: legalCase, error } = await insertClient
    .from("legal_cases")
    .insert({
      law_firm_id: context.lawFirm.id,
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
      main_responsible_id: context.member.id,
      status: parsed.data.status,
      priority: parsed.data.priority,
      opposing_party: parsed.data.opposingParty || null,
      opposing_lawyer: parsed.data.opposingLawyer || null,
      strategic_notes: parsed.data.strategicNotes || null,
      tags: normalizeTags(parsed.data.tags),
    })
    .select("id")
    .single();

  if (error) {
    redirect("/processos/novo?erro=criacao");
  }

  const legalCaseId = (legalCase as { id: string }).id;

  await insertClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_processo",
    entity_type: "legal_case",
    entity_id: legalCaseId,
    metadata: { title: parsed.data.title, client_id: parsed.data.clientId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  redirect("/processos?criado=1");
}

export async function archiveProcessAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/processos?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "processos.editar")) redirect("/processos?erro=permissao");
  const processId = String(formData.get("processId") ?? "");
  if (!processId) redirect("/processos?erro=processo");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/processos?erro=ambiente");
  const client = supabase as unknown as InsertProcessClient;
  const { error } = await client.from("legal_cases").update({ archived_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", processId);
  if (error) redirect("/processos?erro=arquivamento");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "arquivou_processo", entity_type: "legal_case", entity_id: processId, metadata: {} });
  revalidatePath("/processos");
  revalidatePath("/dashboard");
  redirect("/processos?arquivado=1");
}
