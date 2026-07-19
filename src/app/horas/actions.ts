"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type TimeEntryActionClient = {
  from(table: "time_entries"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

export async function createTimeEntryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "tarefas.gerenciar")) redirect("/horas?erro=permissao");

  const description = String(formData.get("description") ?? "").trim();
  const startedAt = String(formData.get("startedAt") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const hourlyRateCents = Math.round(Number(String(formData.get("hourlyRate") ?? "0").replace(",", ".")) * 100);
  if (!description || !startedAt || !Number.isFinite(durationMinutes) || durationMinutes <= 0) redirect("/horas?erro=validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/horas?erro=ambiente");

  const client = supabase as unknown as TimeEntryActionClient;
  const starts = new Date(startedAt);
  const ends = new Date(starts.getTime() + durationMinutes * 60_000);
  const { error } = await client.from("time_entries").insert({
    law_firm_id: context.lawFirm.id,
    member_id: String(formData.get("memberId") ?? "") || context.member.id,
    client_id: String(formData.get("clientId") ?? "") || null,
    legal_case_id: String(formData.get("legalCaseId") ?? "") || null,
    description,
    started_at: starts.toISOString(),
    ended_at: ends.toISOString(),
    duration_minutes: durationMinutes,
    hourly_rate_cents: Number.isFinite(hourlyRateCents) ? Math.max(hourlyRateCents, 0) : 0,
    billable: formData.get("billable") === "on",
    status: String(formData.get("status") ?? "rascunho"),
    created_by: context.member.id,
  });

  if (error) redirect("/horas?erro=criacao");
  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "registrou_horas",
    entity_type: "time_entry",
    entity_id: null,
    metadata: { duration_minutes: durationMinutes, description },
  });

  revalidatePath("/horas");
  redirect("/horas?criado=1");
}
