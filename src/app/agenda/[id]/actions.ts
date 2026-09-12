"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { appointmentSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AppointmentReadClient = {
  from(table: "appointments"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null; error: Error | null }> };
      };
    };
  };
};

type AppointmentUpdateClient = {
  from(table: "appointments"): {
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

function fail(error: string): never {
  redirect(`/agenda?erro=${error}`);
}

export type AppointmentData = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  client_id: string | null;
  legal_case_id: string | null;
  responsible_member_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getAppointmentById(lawFirmId: string, appointmentId: string): Promise<AppointmentData | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await (supabase as unknown as AppointmentReadClient)
    .from("appointments")
    .select("id, title, type, starts_at, ends_at, client_id, legal_case_id, responsible_member_id, status, created_at, updated_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", appointmentId)
    .maybeSingle();
  return (data as AppointmentData | null) ?? null;
}

export async function updateAppointmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "agenda.editar")) fail("permissao");

  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) fail("validacao");

  const parsed = appointmentSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "reuniao"),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    legalCaseId: String(formData.get("legalCaseId") ?? ""),
  });
  if (!parsed.success) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as AppointmentUpdateClient;
  const { error } = await client
    .from("appointments")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      starts_at: new Date(parsed.data.startsAt).toISOString(),
      ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null,
      client_id: parsed.data.clientId || null,
      legal_case_id: parsed.data.legalCaseId || null,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", appointmentId);

  if (error) fail("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "atualizou_compromisso",
    entity_type: "appointment",
    entity_id: appointmentId,
    metadata: { type: parsed.data.type },
  });

  revalidatePath("/agenda");
  revalidatePath("/audiencias");
  revalidatePath("/dashboard");
  redirect("/agenda?salvo=1");
}

export async function deleteAppointmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "agenda.editar")) fail("permissao");

  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as AppointmentUpdateClient;
  const { error } = await client
    .from("appointments")
    .update({ status: "cancelado", updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", appointmentId);

  if (error) fail("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_compromisso",
    entity_type: "appointment",
    entity_id: appointmentId,
    metadata: {},
  });

  revalidatePath("/agenda");
  revalidatePath("/audiencias");
  revalidatePath("/dashboard");
  redirect("/agenda?cancelado=1");
}
