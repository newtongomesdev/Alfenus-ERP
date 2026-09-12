import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";

export type MfaEnrollment = {
  id: string;
  lawFirmId: string;
  userId: string;
  memberId: string;
  factorType: string;
  phone: string | null;
  verified: boolean;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export async function getMfaEnrollments(context: AppContext): Promise<MfaEnrollment[]> {
  if (!context.lawFirm) return [];
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("mfa_enrollments")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    memberId: row.member_id,
    factorType: row.factor_type,
    phone: row.phone,
    verified: row.verified,
    enabled: row.enabled,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }));
}

export async function getMfaStatus(context: AppContext): Promise<{
  required: boolean;
  enabled: boolean;
  minRole: string;
}> {
  if (!context.lawFirm || !context.member) return { required: false, enabled: false, minRole: "advogado" };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { required: false, enabled: false, minRole: "advogado" };
  const { data: policy } = await supabase
    .from("security_policies")
    .select("mfa_required, mfa_min_role")
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  const { data: enrollments } = await supabase
    .from("mfa_enrollments")
    .select("enabled")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("user_id", context.member.userId)
    .eq("enabled", true);

  return {
    required: policy?.mfa_required ?? false,
    enabled: (enrollments ?? []).length > 0,
    minRole: policy?.mfa_min_role ?? "advogado",
  };
}

export async function checkMfaCompliance(
  context: AppContext
): Promise<{ compliant: boolean; reason?: string }> {
  const status = await getMfaStatus(context);
  if (!status.required) return { compliant: true };

  if (!context.member) return { compliant: false, reason: "Membro nao encontrado." };

  const roleHierarchy = ["visualizador", "colaborador", "assistente", "financeiro", "advogado", "administrador", "proprietario"];
  const memberRoleIndex = roleHierarchy.indexOf(context.member.role);
  const minRoleIndex = roleHierarchy.indexOf(status.minRole);

  if (memberRoleIndex < minRoleIndex) return { compliant: true };
  if (status.enabled) return { compliant: true };

  return {
    compliant: false,
    reason: "MFA obrigatorio nao configurado. Configure a autenticacao de dois fatores nas configuracoes de seguranca.",
  };
}
