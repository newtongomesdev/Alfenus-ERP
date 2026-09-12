"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { upsertFeatureFlag, setFeatureFlagOverride, removeFeatureFlagOverride } from "@/lib/admin/feature-flags";
import { logAdminAction } from "@/lib/admin/audit";

export async function toggleFeatureFlagAction(formData: FormData) {
  const { adminClient, userId, email } = await getAdminContext();
  const flagId = String(formData.get("flagId") ?? "");
  const enabled = formData.get("enabled") === "true";

  if (!flagId) return;

  const { error } = await adminClient
    .from("feature_flags")
    .update({ enabled_by_default: enabled, updated_at: new Date().toISOString() })
    .eq("id", flagId);

  if (error) throw error;

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: enabled ? "feature_flag.enable" : "feature_flag.disable",
    entityType: "feature_flag",
    entityId: flagId,
    details: { enabled },
  });

  revalidatePath("/admin/feature-flags");
}

export async function setFlagOverrideAction(flagId: string, lawFirmId: string, enabled: boolean) {
  const { userId, email } = await getAdminContext();

  await setFeatureFlagOverride(flagId, lawFirmId, enabled);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: enabled ? "feature_flag.override.set" : "feature_flag.override.set",
    entityType: "feature_flag_override",
    entityId: flagId,
    details: { lawFirmId, enabled },
  });

  revalidatePath("/admin/feature-flags");
}

export async function removeFlagOverrideAction(flagId: string, lawFirmId: string) {
  const { userId, email } = await getAdminContext();

  await removeFeatureFlagOverride(flagId, lawFirmId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "feature_flag.override.remove",
    entityType: "feature_flag_override",
    entityId: flagId,
    details: { lawFirmId },
  });

  revalidatePath("/admin/feature-flags");
}

export async function createFeatureFlagAction(formData: FormData) {
  const { adminClient, userId, email } = await getAdminContext();
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!key || !name) throw new Error("Chave e nome sao obrigatorios");

  const { error } = await adminClient
    .from("feature_flags")
    .upsert({
      key,
      name,
      description: description || null,
      enabled_by_default: false,
      is_global: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) throw error;

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "feature_flag.create",
    entityType: "feature_flag",
    entityName: key,
    details: { key, name, description },
  });

  revalidatePath("/admin/feature-flags");
}
