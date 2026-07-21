import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Admin client not available");
  return client;
}

// Types
export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledByDefault: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeatureFlagWithOverride = FeatureFlag & {
  overrideEnabled: boolean | null;
};

export type FeatureFlagOverride = {
  id: string;
  flagId: string;
  lawFirmId: string;
  enabled: boolean;
  createdAt: string;
};

// Queries
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await getAdminClient()
    .from("feature_flags")
    .select("*")
    .order("key");

  return (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabledByDefault: row.enabled_by_default,
    isGlobal: row.is_global,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getFeatureFlagsForTenant(lawFirmId: string): Promise<FeatureFlagWithOverride[]> {
  const { data: flags } = await getAdminClient()
    .from("feature_flags")
    .select("*")
    .order("key");

  const { data: overrides } = await getAdminClient()
    .from("feature_flag_overrides")
    .select("*")
    .eq("law_firm_id", lawFirmId);

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.flag_id, o.enabled])
  );

  return (flags ?? []).map((flag) => ({
    id: flag.id,
    key: flag.key,
    name: flag.name,
    description: flag.description,
    enabledByDefault: flag.enabled_by_default,
    isGlobal: flag.is_global,
    createdAt: flag.created_at,
    updatedAt: flag.updated_at,
    overrideEnabled: overrideMap.get(flag.id) ?? null,
  }));
}

export async function isFeatureEnabled(key: string, lawFirmId?: string): Promise<boolean> {
  const { data: flag } = await getAdminClient()
    .from("feature_flags")
    .select("id, enabled_by_default")
    .eq("key", key)
    .maybeSingle();

  if (!flag) return false;

  if (lawFirmId) {
    const { data: override } = await getAdminClient()
      .from("feature_flag_overrides")
      .select("enabled")
      .eq("flag_id", flag.id)
      .eq("law_firm_id", lawFirmId)
      .maybeSingle();

    if (override) return override.enabled;
  }

  return flag.enabled_by_default;
}

export async function upsertFeatureFlag(
  key: string,
  data: { name: string; description?: string; enabledByDefault?: boolean; isGlobal?: boolean }
): Promise<void> {
  const { error } = await getAdminClient()
    .from("feature_flags")
    .upsert({
      key,
      name: data.name,
      description: data.description ?? null,
      enabled_by_default: data.enabledByDefault ?? false,
      is_global: data.isGlobal ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) throw error;
}

export async function setFeatureFlagOverride(
  flagId: string,
  lawFirmId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await getAdminClient()
    .from("feature_flag_overrides")
    .upsert({
      flag_id: flagId,
      law_firm_id: lawFirmId,
      enabled,
    }, { onConflict: "flag_id,law_firm_id" });

  if (error) throw error;
}

export async function removeFeatureFlagOverride(
  flagId: string,
  lawFirmId: string
): Promise<void> {
  const { error } = await getAdminClient()
    .from("feature_flag_overrides")
    .delete()
    .eq("flag_id", flagId)
    .eq("law_firm_id", lawFirmId);

  if (error) throw error;
}
