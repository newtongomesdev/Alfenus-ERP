import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";

export type SecurityPolicy = {
  id: string;
  lawFirmId: string;
  mfaRequired: boolean;
  mfaMinRole: string;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordExpiryDays: number;
  ipRestrictionEnabled: boolean;
  forceLogoutAll: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_POLICY = {
  mfa_required: false,
  mfa_min_role: "advogado",
  session_timeout_minutes: 480,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_number: true,
  password_require_symbol: false,
  password_expiry_days: 0,
  ip_restriction_enabled: false,
  force_logout_all: false,
};

export async function getSecurityPolicy(context: AppContext): Promise<SecurityPolicy> {
  if (!context.lawFirm) {
    return {
      id: "",
      lawFirmId: "",
      mfaRequired: DEFAULT_POLICY.mfa_required,
      mfaMinRole: DEFAULT_POLICY.mfa_min_role,
      sessionTimeoutMinutes: DEFAULT_POLICY.session_timeout_minutes,
      passwordMinLength: DEFAULT_POLICY.password_min_length,
      passwordRequireUppercase: DEFAULT_POLICY.password_require_uppercase,
      passwordRequireNumber: DEFAULT_POLICY.password_require_number,
      passwordRequireSymbol: DEFAULT_POLICY.password_require_symbol,
      passwordExpiryDays: DEFAULT_POLICY.password_expiry_days,
      ipRestrictionEnabled: DEFAULT_POLICY.ip_restriction_enabled,
      forceLogoutAll: DEFAULT_POLICY.force_logout_all,
      createdAt: "",
      updatedAt: "",
    };
  }
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      id: "",
      lawFirmId: context.lawFirm.id,
      mfaRequired: DEFAULT_POLICY.mfa_required,
      mfaMinRole: DEFAULT_POLICY.mfa_min_role,
      sessionTimeoutMinutes: DEFAULT_POLICY.session_timeout_minutes,
      passwordMinLength: DEFAULT_POLICY.password_min_length,
      passwordRequireUppercase: DEFAULT_POLICY.password_require_uppercase,
      passwordRequireNumber: DEFAULT_POLICY.password_require_number,
      passwordRequireSymbol: DEFAULT_POLICY.password_require_symbol,
      passwordExpiryDays: DEFAULT_POLICY.password_expiry_days,
      ipRestrictionEnabled: DEFAULT_POLICY.ip_restriction_enabled,
      forceLogoutAll: DEFAULT_POLICY.force_logout_all,
      createdAt: "",
      updatedAt: "",
    };
  }
  const { data } = await supabase
    .from("security_policies")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!data) {
    return {
      id: "",
      lawFirmId: context.lawFirm.id,
      mfaRequired: DEFAULT_POLICY.mfa_required,
      mfaMinRole: DEFAULT_POLICY.mfa_min_role,
      sessionTimeoutMinutes: DEFAULT_POLICY.session_timeout_minutes,
      passwordMinLength: DEFAULT_POLICY.password_min_length,
      passwordRequireUppercase: DEFAULT_POLICY.password_require_uppercase,
      passwordRequireNumber: DEFAULT_POLICY.password_require_number,
      passwordRequireSymbol: DEFAULT_POLICY.password_require_symbol,
      passwordExpiryDays: DEFAULT_POLICY.password_expiry_days,
      ipRestrictionEnabled: DEFAULT_POLICY.ip_restriction_enabled,
      forceLogoutAll: DEFAULT_POLICY.force_logout_all,
      createdAt: "",
      updatedAt: "",
    };
  }

  return {
    id: data.id,
    lawFirmId: data.law_firm_id,
    mfaRequired: data.mfa_required,
    mfaMinRole: data.mfa_min_role,
    sessionTimeoutMinutes: data.session_timeout_minutes,
    passwordMinLength: data.password_min_length,
    passwordRequireUppercase: data.password_require_uppercase,
    passwordRequireNumber: data.password_require_number,
    passwordRequireSymbol: data.password_require_symbol,
    passwordExpiryDays: data.password_expiry_days,
    ipRestrictionEnabled: data.ip_restriction_enabled,
    forceLogoutAll: data.force_logout_all,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertSecurityPolicy(
  context: AppContext,
  policy: Partial<SecurityPolicy>
): Promise<void> {
  if (!context.lawFirm) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("security_policies")
    .upsert({
      law_firm_id: context.lawFirm.id,
      ...(policy.mfaRequired !== undefined && { mfa_required: policy.mfaRequired }),
      ...(policy.mfaMinRole !== undefined && { mfa_min_role: policy.mfaMinRole }),
      ...(policy.sessionTimeoutMinutes !== undefined && { session_timeout_minutes: policy.sessionTimeoutMinutes }),
      ...(policy.passwordMinLength !== undefined && { password_min_length: policy.passwordMinLength }),
      ...(policy.passwordRequireUppercase !== undefined && { password_require_uppercase: policy.passwordRequireUppercase }),
      ...(policy.passwordRequireNumber !== undefined && { password_require_number: policy.passwordRequireNumber }),
      ...(policy.passwordRequireSymbol !== undefined && { password_require_symbol: policy.passwordRequireSymbol }),
      ...(policy.passwordExpiryDays !== undefined && { password_expiry_days: policy.passwordExpiryDays }),
      ...(policy.ipRestrictionEnabled !== undefined && { ip_restriction_enabled: policy.ipRestrictionEnabled }),
      ...(policy.forceLogoutAll !== undefined && { force_logout_all: policy.forceLogoutAll }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "law_firm_id" });

  if (error) throw error;
}

export type IpAllowlistEntry = {
  id: string;
  lawFirmId: string;
  ipAddress: string;
  cidrRange: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export async function getIpAllowlist(context: AppContext): Promise<IpAllowlistEntry[]> {
  if (!context.lawFirm) return [];
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("ip_allowlists")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    lawFirmId: row.law_firm_id,
    ipAddress: row.ip_address,
    cidrRange: row.cidr_range,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function isIpAllowed(
  context: AppContext,
  ip: string
): Promise<boolean> {
  if (!context.lawFirm) return true;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return true;
  const { data: policy } = await supabase
    .from("security_policies")
    .select("ip_restriction_enabled")
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!policy?.ip_restriction_enabled) return true;

  const { data: allowlist } = await supabase
    .from("ip_allowlists")
    .select("ip_address, cidr_range")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("is_active", true);

  if (!allowlist || allowlist.length === 0) return true;

  return allowlist.some((entry) => {
    if (entry.ip_address === ip) return true;
    if (entry.cidr_range) {
      // Basic CIDR check (simplified - in production use a proper IP library)
      const ipParts = ip.split(".").map(Number);
      const [rangeIp, bits] = entry.cidr_range.split("/");
      const rangeParts = rangeIp.split(".").map(Number);
      const mask = ~((1 << (32 - Number(bits))) - 1);
      const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
      return (ipNum & mask) === (rangeNum & mask);
    }
    return false;
  });
}

export async function addIpAllowlistEntry(
  context: AppContext,
  data: { ipAddress: string; cidrRange?: string; description?: string }
): Promise<void> {
  if (!context.lawFirm) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("ip_allowlists")
    .insert({
      law_firm_id: context.lawFirm.id,
      ip_address: data.ipAddress,
      cidr_range: data.cidrRange ?? null,
      description: data.description ?? null,
      is_active: true,
    });

  if (error) throw error;
}

export async function removeIpAllowlistEntry(
  context: AppContext,
  entryId: string
): Promise<void> {
  if (!context.lawFirm) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("ip_allowlists")
    .delete()
    .eq("id", entryId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
}
