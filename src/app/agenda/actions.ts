"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appointmentSchema } from "@/lib/validations/foundation";

type AppointmentClient = {
  from(table: "appointments"): { insert(values: Record<string, unknown>): { select(columns: string): { single(): Promise<{ data: unknown; error: Error | null }> } } };
  from(table: "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};
function fail(error: string): never { redirect(`/agenda?erro=${error}`); }

export async function createAppointmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  const parsed = appointmentSchema.safeParse({ title: String(formData.get("title") ?? "").trim(), type: String(formData.get("type") ?? "reuniao"), startsAt: String(formData.get("startsAt") ?? ""), endsAt: String(formData.get("endsAt") ?? ""), clientId: String(formData.get("clientId") ?? ""), legalCaseId: String(formData.get("legalCaseId") ?? "") });
  if (!parsed.success) fail("validacao");
  const supabase = await getSupabaseServerClient(); if (!supabase) fail("ambiente"); const client = supabase as unknown as AppointmentClient;
  const { data: appointment, error } = await client.from("appointments").insert({ law_firm_id: context.lawFirm.id, title: parsed.data.title, type: parsed.data.type, starts_at: new Date(parsed.data.startsAt).toISOString(), ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null, client_id: parsed.data.clientId || null, legal_case_id: parsed.data.legalCaseId || null, responsible_member_id: context.member.id, status: "agendado" }).select("id").single();
  if (error) fail("criacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "criou_compromisso", entity_type: "appointment", entity_id: (appointment as { id: string }).id, metadata: { type: parsed.data.type } });
  revalidatePath("/agenda"); revalidatePath("/audiencias"); revalidatePath("/dashboard"); redirect("/agenda?criado=1");
}
