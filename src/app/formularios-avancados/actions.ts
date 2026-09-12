"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can, type Role } from "@/lib/auth/permissions";
import {
  createFormBuilder,
  createProfessional,
  createService,
  createBooking,
  cancelBooking,
} from "@/lib/formularios/queries";

function redirectForError(basePath: string, error: string): never {
  redirect(`${basePath}?erro=${error}`);
}

function hasFormPermission(role: Role): boolean {
  return can(role, "prazos.criar");
}

async function requireContext(basePath: string) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");
  if (!hasFormPermission(context.member.role))
    redirectForError(basePath, "permissao");
  return context;
}

// ---------------------------------------------------------------------------
// Form Builders
// ---------------------------------------------------------------------------

export async function createFormBuilderAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!name || !slug) redirectForError(basePath, "validacao");

  const result = await createFormBuilder(context, {
    name,
    slug,
    description: String(formData.get("description") ?? "").trim() || undefined,
    formType: String(formData.get("formType") ?? "").trim() || undefined,
    legalArea: String(formData.get("legalArea") ?? "").trim() || undefined,
    publicLink: String(formData.get("publicLink") ?? "").trim() || undefined,
    confirmationMessage:
      String(formData.get("confirmationMessage") ?? "").trim() || undefined,
    lgpdConsentText:
      String(formData.get("lgpdConsentText") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/formularios-avancados");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Scheduling Professionals
// ---------------------------------------------------------------------------

export async function createProfessionalAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const memberId = String(formData.get("memberId") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!memberId || !displayName) redirectForError(basePath, "validacao");

  const result = await createProfessional(context, {
    memberId,
    displayName,
    specialty: String(formData.get("specialty") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/formularios-avancados");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Scheduling Services
// ---------------------------------------------------------------------------

export async function createServiceAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectForError(basePath, "validacao");

  const result = await createService(context, {
    name,
    description: String(formData.get("description") ?? "").trim() || undefined,
    durationMinutes: Number(formData.get("durationMinutes") ?? 60) || undefined,
    modality: String(formData.get("modality") ?? "").trim() || undefined,
    requiresApproval: formData.get("requiresApproval") === "on",
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/formularios-avancados");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Scheduling Bookings
// ---------------------------------------------------------------------------

export async function createBookingAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const professionalId = String(formData.get("professionalId") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const bookingDate = String(formData.get("bookingDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  if (!professionalId || !serviceId || !clientName || !bookingDate || !startTime || !endTime)
    redirectForError(basePath, "validacao");

  const result = await createBooking(context, {
    professionalId,
    serviceId,
    clientName,
    clientEmail: String(formData.get("clientEmail") ?? "").trim() || undefined,
    clientPhone: String(formData.get("clientPhone") ?? "").trim() || undefined,
    bookingDate,
    startTime,
    endTime,
    modality: String(formData.get("modality") ?? "").trim() || undefined,
    address: String(formData.get("address") ?? "").trim() || undefined,
    meetingLink: String(formData.get("meetingLink") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/formularios-avancados");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Cancel Booking
// ---------------------------------------------------------------------------

export async function cancelBookingAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) redirectForError(basePath, "validacao");

  await cancelBooking(context, bookingId);

  revalidatePath("/formularios-avancados");
  revalidatePath(basePath);
  redirect(`${basePath}?atualizado=1`);
}
