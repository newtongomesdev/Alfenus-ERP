"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { upsertSecurityPolicy } from "@/lib/security/policies";
import { terminateSession as terminateSessionQuery, terminateAllSessions } from "@/lib/security/sessions";
import { generateSecret, generateQRCodeUri, verifyToken } from "@/lib/security/totp";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function saveSecurityPolicyAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  await upsertSecurityPolicy(context, {
    mfaRequired: formData.get("mfaRequired") === "on",
    mfaMinRole: String(formData.get("mfaMinRole") ?? "advogado"),
    passwordMinLength: Number(formData.get("passwordMinLength") ?? 8),
    passwordExpiryDays: Number(formData.get("passwordExpiryDays") ?? 0),
    passwordRequireUppercase: formData.get("passwordRequireUppercase") === "on",
    passwordRequireNumber: formData.get("passwordRequireNumber") === "on",
    passwordRequireSymbol: formData.get("passwordRequireSymbol") === "on",
    sessionTimeoutMinutes: Number(formData.get("sessionTimeoutMinutes") ?? 480),
    ipRestrictionEnabled: formData.get("ipRestrictionEnabled") === "on",
  });

  revalidatePath("/configuracoes/seguranca");
}

export async function terminateSessionAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("ID da sessao invalido");

  await terminateSessionQuery(context, sessionId);
  revalidatePath("/configuracoes/seguranca");
}

export async function terminateAllSessionsAction() {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");

  if (!context.member) throw new Error("Membro nao encontrado");
  await terminateAllSessions(context, context.member.userId);
  revalidatePath("/configuracoes/seguranca");
}

// ---------------------------------------------------------------------------
// MFA Enrollment
// ---------------------------------------------------------------------------

export async function startMfaEnrollmentAction(): Promise<{
  secret: string;
  qrUri: string;
  enrollmentId: string;
}> {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  // Desabilitar enrollments TOTP anteriores nao verificados
  await supabase
    .from("mfa_enrollments")
    .delete()
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("factor_type", "totp")
    .eq("verified", false);

  const secret = generateSecret();
  const email = context.member.email;
  const qrUri = generateQRCodeUri(secret, email, context.lawFirm.name);

  const { data, error } = await supabase
    .from("mfa_enrollments")
    .insert({
      law_firm_id: context.lawFirm.id,
      user_id: context.member.userId,
      member_id: context.member.id,
      factor_type: "totp",
      secret,
      verified: false,
      enabled: false,
    })
    .select("id")
    .single();

  if (error) throw new Error("Erro ao criar enrollment MFA.");
  if (!data) throw new Error("Enrollment MFA nao criado.");

  return { secret, qrUri, enrollmentId: data.id };
}

export async function verifyMfaEnrollmentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const token = String(formData.get("token") ?? "");
  if (!enrollmentId) throw new Error("ID do enrollment invalido");
  if (!token) throw new Error("Codigo de verificacao obrigatorio");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  const { data: enrollment, error: fetchError } = await supabase
    .from("mfa_enrollments")
    .select("id, secret, verified")
    .eq("id", enrollmentId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("factor_type", "totp")
    .single();

  if (fetchError || !enrollment) throw new Error("Enrollment nao encontrado.");
  if (enrollment.verified) throw new Error("Enrollment ja verificado.");
  if (!enrollment.secret) throw new Error("Secret do enrollment invalido.");

  const valid = await verifyToken(enrollment.secret, token);
  if (!valid) throw new Error("Codigo invalido. Verifique o aplicativo autenticador.");

  const { error: updateError } = await supabase
    .from("mfa_enrollments")
    .update({ verified: true, enabled: true })
    .eq("id", enrollment.id);

  if (updateError) throw new Error("Erro ao ativar MFA.");

  revalidatePath("/configuracoes/seguranca");
}

export async function disableMfaAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Nao autenticado");
  if (!context.member) throw new Error("Membro nao encontrado");
  if (!context.lawFirm) throw new Error("Escritorio nao encontrado");

  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  if (!enrollmentId) throw new Error("ID do enrollment invalido");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Servidor indisponivel");

  await supabase
    .from("mfa_enrollments")
    .update({ enabled: false })
    .eq("id", enrollmentId)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId);

  revalidatePath("/configuracoes/seguranca");
}
