"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import {
  createCalculation,
  submitForReview,
  approveCalculation,
  reviewCalculation,
  cancelCalculation,
} from "@/lib/prazos/queries";

function redirectForError(error: string): never {
  redirect(`/prazos/calculos?erro=${error}`);
}

export async function createCalculationAction(formData: FormData) {
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

  const tribunal = String(formData.get("tribunal") ?? "").trim();
  if (!tribunal) redirectForError("validacao");

  const quantity = Number(formData.get("quantity") ?? 0);
  if (quantity <= 0) redirectForError("validacao");

  const startDate = String(formData.get("startDate") ?? "").trim();
  if (!startDate) redirectForError("validacao");

  const result = await createCalculation(context, {
    tribunal,
    jurisdition: String(formData.get("jurisdition") ?? "").trim() || undefined,
    procedureType:
      String(formData.get("procedureType") ?? "").trim() || undefined,
    ruleDescription:
      String(formData.get("ruleDescription") ?? "").trim() || undefined,
    disponibilizedAt:
      String(formData.get("disponibilizedAt") ?? "").trim() || undefined,
    publishedAt:
      String(formData.get("publishedAt") ?? "").trim() || undefined,
    knowledgeAt:
      String(formData.get("knowledgeAt") ?? "").trim() || undefined,
    startDate,
    quantity,
    unit: String(formData.get("unit") ?? "dias") as
      | "dias"
      | "horas"
      | "meses"
      | "anos",
    businessDays: formData.get("businessDays") === "true",
    includeStartDate: formData.get("includeStartDate") === "true",
    includeEndDate: formData.get("includeEndDate") !== "false",
    calendarId:
      String(formData.get("calendarId") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError("criacao");

  revalidatePath("/prazos/calculos");
  redirect("/prazos/calculos");
}

export async function submitForReviewAction(formData: FormData) {
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

  const id = String(formData.get("calculationId") ?? "");
  if (!id) redirectForError("validacao");

  await submitForReview(context, id);

  revalidatePath("/prazos/calculos");
  revalidatePath("/prazos/revisao");
  redirect("/prazos/calculos");
}

export async function approveCalculationAction(formData: FormData) {
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

  const id = String(formData.get("calculationId") ?? "");
  if (!id) redirectForError("validacao");

  await approveCalculation(context, id);

  revalidatePath("/prazos/calculos");
  revalidatePath("/prazos/revisao");
  redirect("/prazos/revisao");
}

export async function rejectCalculationAction(formData: FormData) {
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

  const id = String(formData.get("calculationId") ?? "");
  if (!id) redirectForError("validacao");

  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  await reviewCalculation(context, id, false, notes);

  revalidatePath("/prazos/calculos");
  revalidatePath("/prazos/revisao");
  redirect("/prazos/revisao");
}

export async function cancelCalculationAction(formData: FormData) {
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

  const id = String(formData.get("calculationId") ?? "");
  if (!id) redirectForError("validacao");

  await cancelCalculation(context, id);

  revalidatePath("/prazos/calculos");
  redirect("/prazos/calculos");
}
