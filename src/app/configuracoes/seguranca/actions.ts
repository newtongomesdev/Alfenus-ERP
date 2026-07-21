"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { upsertSecurityPolicy } from "@/lib/security/policies";
import { terminateSession as terminateSessionQuery, terminateAllSessions } from "@/lib/security/sessions";

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
