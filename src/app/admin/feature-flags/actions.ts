"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { upsertFeatureFlag, setFeatureFlagOverride } from "@/lib/admin/feature-flags";

export async function toggleFeatureFlagAction(formData: FormData) {
  const { adminClient } = await getAdminContext();
  const flagId = String(formData.get("flagId") ?? "");
  const enabled = formData.get("enabled") === "true";

  if (!flagId) return;

  const { error } = await adminClient
    .from("feature_flags")
    .update({ enabled_by_default: enabled, updated_at: new Date().toISOString() })
    .eq("id", flagId);

  if (error) throw error;
  revalidatePath("/admin/feature-flags");
}

export async function createFeatureFlagAction(formData: FormData) {
  const { adminClient } = await getAdminContext();
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
  revalidatePath("/admin/feature-flags");
}
