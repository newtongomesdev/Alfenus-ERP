"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/prazos/queries";

function redirectForError(error: string): never {
  redirect(`/prazos/calendarios?erro=${error}`);
}

export async function createCalendarEventAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  )
    redirect("/onboarding");
  if (!can(context.member.role, "prazos.criar"))
    redirectForError("permissao");

  const calendarId = String(formData.get("calendarId") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  if (!calendarId || !eventName || !startDate || !endDate)
    redirectForError("validacao");

  await createCalendarEvent(context, {
    calendarId,
    eventName,
    eventType: String(formData.get("eventType") ?? "feriado") as
      | "feriado"
      | "recesso"
      | "suspensao"
      | "indisponibilidade"
      | "sem_expediente",
    startDate,
    endDate,
    isRecurring: formData.get("isRecurring") === "true",
    description:
      String(formData.get("description") ?? "").trim() || undefined,
  });

  revalidatePath("/prazos/calendarios");
  redirect("/prazos/calendarios");
}

export async function deleteCalendarEventAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  )
    redirect("/onboarding");
  if (!can(context.member.role, "prazos.editar"))
    redirectForError("permissao");

  const id = String(formData.get("eventId") ?? "");
  if (!id) redirectForError("validacao");

  await deleteCalendarEvent(context, id);

  revalidatePath("/prazos/calendarios");
  redirect("/prazos/calendarios");
}
