"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { adminResetMfa } from "@/lib/security/admin-mfa-reset";

export async function adminResetMfaAction(formData: FormData) {
  const { userId: adminUserId, adminClient } = await getAdminContext();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserId) throw new Error("ID do usuário alvo é obrigatório.");
  if (justification.length < 10) {
    throw new Error("Justificativa deve ter pelo menos 10 caracteres.");
  }

  // Buscar a primeira membership do usuário alvo para obter o lawFirmId
  const { data: memberships, error: membersError } = await adminClient
    .from("law_firm_members")
    .select("law_firm_id")
    .eq("user_id", targetUserId)
    .eq("status", "ativo")
    .limit(1);

  if (membersError) {
    throw new Error("Erro ao buscar vínculos do usuário.");
  }

  if (!memberships || memberships.length === 0) {
    throw new Error("Usuário não possui escritório vinculado.");
  }

  const lawFirmId = memberships[0].law_firm_id;

  const result = await adminResetMfa(
    targetUserId,
    lawFirmId,
    adminUserId,
    justification
  );

  if (!result.success) {
    throw new Error(result.error ?? "Erro ao resetar MFA.");
  }

  revalidatePath(`/admin/usuarios/${targetUserId}`);
}
