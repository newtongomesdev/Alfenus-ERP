"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can, type Role } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirectForError(basePath: string, error: string): never {
  redirect(`${basePath}?erro=${error}`);
}

async function getDb(basePath: string) {
  const client = await getSupabaseServerClient();
  if (!client) redirectForError(basePath, "servidor");
  return client!;
}

function hasPermission(role: Role): boolean {
  return can(role, "prazos.criar");
}

async function requireContext(basePath: string) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");
  if (!hasPermission(context.member.role))
    redirectForError(basePath, "permissao");
  return context;
}

export async function createConsentAction(
  basePath: string,
  formData: FormData,
) {
  const context = await requireContext(basePath);
  const purpose = String(formData.get("purpose") ?? "").trim();
  const consentText = String(formData.get("consentText") ?? "").trim();

  if (!purpose || !consentText) redirectForError(basePath, "validacao");

  const supabase = await getDb(basePath);
  const { error } = await supabase.from("lgpd_consents").insert({
    law_firm_id: context.lawFirm!.id,
    purpose,
    consent_text: consentText,
    granted: true,
  });

  if (error) redirectForError(basePath, "criacao");

  revalidatePath("/lgpd");
  redirect(`${basePath}?criado=1`);
}

export async function revokeConsentAction(consentId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/entrar");
  if (!hasPermission(context.member.role)) redirect("/entrar");

  const supabase = (await getSupabaseServerClient())!;
  await supabase
    .from("lgpd_consents")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", consentId)
    .eq("law_firm_id", context.lawFirm.id);

  revalidatePath("/lgpd");
}

export async function createRequestAction(
  basePath: string,
  formData: FormData,
) {
  const context = await requireContext(basePath);
  const requestType = String(formData.get("requestType") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!requestType) redirectForError(basePath, "validacao");

  const supabase = await getDb(basePath);
  const { error } = await supabase
    .from("lgpd_data_subject_requests")
    .insert({
      law_firm_id: context.lawFirm!.id,
      request_type: requestType,
      description: description || null,
      status: "recebida",
    });

  if (error) redirectForError(basePath, "criacao");

  revalidatePath("/lgpd");
  redirect(`${basePath}?criado=1`);
}

export async function updateRequestStatusAction(
  requestId: string,
  status: string,
) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/entrar");
  if (!hasPermission(context.member.role)) redirect("/entrar");

  const supabase = (await getSupabaseServerClient())!;
  await supabase
    .from("lgpd_data_subject_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("law_firm_id", context.lawFirm.id);

  revalidatePath("/lgpd");
}

export async function createPolicyAction(
  basePath: string,
  formData: FormData,
) {
  const context = await requireContext(basePath);
  const policyName = String(formData.get("policyName") ?? "").trim();
  const targetModule = String(formData.get("targetModule") ?? "").trim();
  const retentionDays = Number(formData.get("retentionDays") ?? 0);

  if (!policyName || !targetModule || retentionDays <= 0)
    redirectForError(basePath, "validacao");

  const supabase = await getDb(basePath);
  const { error } = await supabase.from("lgpd_retention_policies").insert({
    law_firm_id: context.lawFirm!.id,
    policy_name: policyName,
    target_module: targetModule,
    retention_days: retentionDays,
    is_active: true,
  });

  if (error) redirectForError(basePath, "criacao");

  revalidatePath("/lgpd");
  redirect(`${basePath}?criado=1`);
}

export async function togglePolicyActiveAction(policyId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/entrar");
  if (!hasPermission(context.member.role)) redirect("/entrar");

  const supabase = (await getSupabaseServerClient())!;
  const { data: existing } = await supabase
    .from("lgpd_retention_policies")
    .select("is_active")
    .eq("id", policyId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (existing) {
    await supabase
      .from("lgpd_retention_policies")
      .update({ is_active: !existing.is_active })
      .eq("id", policyId)
      .eq("law_firm_id", context.lawFirm.id);
  }

  revalidatePath("/lgpd");
}
