"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can, type Role } from "@/lib/auth/permissions";
import {
  createClaim,
  createRiskAssessment,
  createProvision,
  createGuarantee,
  createDeposit,
  createSeizure,
  createRelease,
} from "@/lib/risco/queries";

function redirectForError(basePath: string, error: string): never {
  redirect(`${basePath}?erro=${error}`);
}

function hasRiscoPermission(role: Role): boolean {
  return can(role, "risco.criar");
}

async function requireContext(basePath: string) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");
  if (!hasRiscoPermission(context.member.role))
    redirectForError(basePath, "permissao");
  return context;
}

// ---------------------------------------------------------------------------
// Process Claims
// ---------------------------------------------------------------------------

export async function createClaimAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!description || !category) redirectForError(basePath, "validacao");

  const result = await createClaim(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    clientId: String(formData.get("clientId") ?? "").trim() || undefined,
    description,
    category,
    originalValue: Number(formData.get("originalValue") ?? 0) || undefined,
    updatedValue: Number(formData.get("updatedValue") ?? 0) || undefined,
    baseDate:
      String(formData.get("baseDate") ?? "").trim() || undefined,
    indexName:
      String(formData.get("indexName") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

export async function updateClaimAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const claimId = String(formData.get("claimId") ?? "").trim();
  if (!claimId) redirectForError(basePath, "validacao");

  const { updateClaim } = await import("@/lib/risco/queries");
  await updateClaim(context, claimId, {
    status: String(formData.get("status") ?? "").trim() || undefined,
    result: String(formData.get("result") ?? "").trim() || undefined,
    updatedValue: Number(formData.get("updatedValue") ?? 0) || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?atualizado=1`);
}

// ---------------------------------------------------------------------------
// Risk Assessments
// ---------------------------------------------------------------------------

export async function createRiskAssessmentAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const classification = String(formData.get("classification") ?? "").trim();
  const scenario = String(formData.get("scenario") ?? "").trim();
  if (!classification || !scenario)
    redirectForError(basePath, "validacao");

  const result = await createRiskAssessment(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    claimId: String(formData.get("claimId") ?? "").trim() || undefined,
    classification,
    probability: Number(formData.get("probability") ?? 0) || undefined,
    estimatedValue:
      Number(formData.get("estimatedValue") ?? 0) || undefined,
    scenario,
    justification:
      String(formData.get("justification") ?? "").trim() || undefined,
    baseDate: String(formData.get("baseDate") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Provisions
// ---------------------------------------------------------------------------

export async function createProvisionAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const value = Number(formData.get("value") ?? 0);
  const provisionType = String(formData.get("provisionType") ?? "").trim();
  if (value <= 0 || !provisionType) redirectForError(basePath, "validacao");

  const result = await createProvision(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    claimId: String(formData.get("claimId") ?? "").trim() || undefined,
    riskAssessmentId:
      String(formData.get("riskAssessmentId") ?? "").trim() || undefined,
    value,
    provisionType,
    competence:
      String(formData.get("competence") ?? "").trim() || undefined,
    baseDate: String(formData.get("baseDate") ?? "").trim() || undefined,
    justification:
      String(formData.get("justification") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Guarantees
// ---------------------------------------------------------------------------

export async function createGuaranteeAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const guaranteeType = String(formData.get("guaranteeType") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  if (!guaranteeType || value <= 0)
    redirectForError(basePath, "validacao");

  const result = await createGuarantee(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    guaranteeType,
    value,
    assetDescription:
      String(formData.get("assetDescription") ?? "").trim() || undefined,
    bank: String(formData.get("bank") ?? "").trim() || undefined,
    accountNumber:
      String(formData.get("accountNumber") ?? "").trim() || undefined,
    validityDate:
      String(formData.get("validityDate") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Deposits
// ---------------------------------------------------------------------------

export async function createDepositAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const depositType = String(formData.get("depositType") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  if (!depositType || value <= 0)
    redirectForError(basePath, "validacao");

  const result = await createDeposit(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    depositType,
    value,
    bank: String(formData.get("bank") ?? "").trim() || undefined,
    agency: String(formData.get("agency") ?? "").trim() || undefined,
    accountNumber:
      String(formData.get("accountNumber") ?? "").trim() || undefined,
    depositDate:
      String(formData.get("depositDate") ?? "").trim() || undefined,
    beneficiary:
      String(formData.get("beneficiary") ?? "").trim() || undefined,
    institution:
      String(formData.get("institution") ?? "").trim() || undefined,
    documentNumber:
      String(formData.get("documentNumber") ?? "").trim() || undefined,
    repasse: Number(formData.get("repasse") ?? 0) || undefined,
    retention: Number(formData.get("retention") ?? 0) || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Seizures
// ---------------------------------------------------------------------------

export async function createSeizureAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const seizureType = String(formData.get("seizureType") ?? "").trim();
  const assetType = String(formData.get("assetType") ?? "").trim();
  if (!seizureType || !assetType)
    redirectForError(basePath, "validacao");

  const result = await createSeizure(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    seizureType,
    assetType,
    assetDescription:
      String(formData.get("assetDescription") ?? "").trim() || undefined,
    assetValue:
      Number(formData.get("assetValue") ?? 0) || undefined,
    entity: String(formData.get("entity") ?? "").trim() || undefined,
    documentNumber:
      String(formData.get("documentNumber") ?? "").trim() || undefined,
    orderDate:
      String(formData.get("orderDate") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}

// ---------------------------------------------------------------------------
// Court Releases
// ---------------------------------------------------------------------------

export async function createReleaseAction(
  basePath: string,
  formData: FormData
) {
  const context = await requireContext(basePath);

  const releasedValue = Number(formData.get("releasedValue") ?? 0);
  if (releasedValue <= 0) redirectForError(basePath, "validacao");

  const result = await createRelease(context, {
    legalCaseId:
      String(formData.get("legalCaseId") ?? "").trim() || undefined,
    seizureId:
      String(formData.get("seizureId") ?? "").trim() || undefined,
    releasedValue,
    beneficiary:
      String(formData.get("beneficiary") ?? "").trim() || undefined,
    releaseDate:
      String(formData.get("releaseDate") ?? "").trim() || undefined,
    institution:
      String(formData.get("institution") ?? "").trim() || undefined,
    documentNumber:
      String(formData.get("documentNumber") ?? "").trim() || undefined,
    repasse: Number(formData.get("repasse") ?? 0) || undefined,
    retention: Number(formData.get("retention") ?? 0) || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!result) redirectForError(basePath, "criacao");

  revalidatePath("/risco");
  revalidatePath(basePath);
  redirect(`${basePath}?criado=1`);
}
