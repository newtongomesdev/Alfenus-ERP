"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can, type Role } from "@/lib/auth/permissions";
import {
  createRequest,
  updateRequestStatus,
  createObligation,
  createAmendment,
  decideApproval,
} from "@/lib/clm/queries";

function redirectForError(basePath: string, error: string): never {
  redirect(`${basePath}?erro=${error}`);
}

function hasClmPermission(role: Role): boolean {
  return can(role, "prazos.criar");
}

async function requireContext(basePath: string) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");
  if (!hasClmPermission(context.member.role))
    redirectForError(basePath, "permissao");
  return context;
}

// ---------------------------------------------------------------------------
// Contract Requests
// ---------------------------------------------------------------------------

export async function createRequestAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirectForError(basePath, "validacao");

  const result = await createRequest(context, {
    title,
    description: String(formData.get("description") ?? "").trim() || undefined,
    category: String(formData.get("category") ?? "").trim() || undefined,
    contractType: String(formData.get("contractType") ?? "").trim() || undefined,
    priority: String(formData.get("priority") ?? "").trim() || undefined,
    clientId: String(formData.get("clientId") ?? "").trim() || undefined,
    legalCaseId: String(formData.get("legalCaseId") ?? "").trim() || undefined,
    necessaryDate: String(formData.get("necessaryDate") ?? "").trim() || undefined,
    responsibleMemberId: String(formData.get("responsibleMemberId") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/clm");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Status Update
// ---------------------------------------------------------------------------

export async function updateStatusAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!requestId || !status) redirectForError(basePath, "validacao");

  await updateRequestStatus(context, requestId, status as any);

  revalidatePath("/clm");
  revalidatePath(basePath);
  redirect(`${basePath}?atualizado=1`);
}

// ---------------------------------------------------------------------------
// Obligations
// ---------------------------------------------------------------------------

export async function createObligationAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const contractRequestId = String(formData.get("contractRequestId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!contractRequestId || !description) redirectForError(basePath, "validacao");

  const result = await createObligation(context, {
    contractRequestId,
    description,
    responsibleParty: String(formData.get("responsibleParty") ?? "").trim() || undefined,
    periodicity: String(formData.get("periodicity") ?? "").trim() || undefined,
    dueDate: String(formData.get("dueDate") ?? "").trim() || undefined,
    evidenceDescription: String(formData.get("evidenceDescription") ?? "").trim() || undefined,
    alertDaysBefore: Number(formData.get("alertDaysBefore") ?? 30) || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/clm");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Amendments
// ---------------------------------------------------------------------------

export async function createAmendmentAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const contractRequestId = String(formData.get("contractRequestId") ?? "").trim();
  const amendmentType = String(formData.get("amendmentType") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!contractRequestId || !amendmentType || !description)
    redirectForError(basePath, "validacao");

  const result = await createAmendment(context, {
    contractRequestId,
    amendmentType,
    description,
    newValue: Number(formData.get("newValue") ?? 0) || undefined,
    newVigenceStart: String(formData.get("newVigenceStart") ?? "").trim() || undefined,
    newVigenceEnd: String(formData.get("newVigenceEnd") ?? "").trim() || undefined,
    attachmentUrl: String(formData.get("attachmentUrl") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/clm");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Approval Decision
// ---------------------------------------------------------------------------

export async function decideApprovalAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const approved = formData.get("approved") === "true";
  if (!approvalId) redirectForError(basePath, "validacao");

  await decideApproval(
    context,
    approvalId,
    approved,
    String(formData.get("comments") ?? "").trim() || undefined
  );

  revalidatePath("/clm");
  revalidatePath(basePath);
  redirect(`${basePath}?atualizado=1`);
}
