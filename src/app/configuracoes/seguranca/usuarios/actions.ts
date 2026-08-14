"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { adminResetMfa } from "@/lib/security/admin-mfa-reset";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

export async function resetMfaForUserAction(
  targetUserId: string,
  justification: string
): Promise<{ success: boolean; error?: string }> {
  const context = await getAppContext();
  if (context.status !== "ready") {
    return { success: false, error: "Nao autenticado" };
  }
  if (
    context.member?.role !== "proprietario" &&
    context.member?.role !== "administrador"
  ) {
    return { success: false, error: "Permissao negada" };
  }

  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) {
    return { success: false, error: "Servidor indisponivel" };
  }

  if (!targetUserId) {
    return { success: false, error: "ID do usuario alvo obrigatorio." };
  }
  if (justification.trim().length < 10) {
    return {
      success: false,
      error: "Justificativa deve ter pelo menos 10 caracteres.",
    };
  }

  // Buscar o law_firm_id do usuario alvo
  const { data: memberships, error: memberError } = await adminClient
    .from("law_firm_members")
    .select("law_firm_id")
    .eq("user_id", targetUserId)
    .eq("status", "ativo")
    .limit(1);

  if (memberError || !memberships || memberships.length === 0) {
    return {
      success: false,
      error: "Usuario alvo nao encontrado ou sem escritorio vinculado.",
    };
  }

  const lawFirmId = memberships[0].law_firm_id;

  const result = await adminResetMfa(
    targetUserId,
    lawFirmId,
    context.member.userId,
    justification.trim()
  );

  if (!result.success) {
    return { success: false, error: result.error ?? "Erro ao resetar MFA." };
  }

  revalidatePath("/configuracoes/seguranca/usuarios");
  return { success: true };
}
