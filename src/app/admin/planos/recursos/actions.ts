"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function togglePlanFeatureAction(plan: string, featureKey: string, enabled: boolean) {
  const { adminClient, userId, email } = await getAdminContext();

  const { data: planSettings } = await (adminClient as any)
    .from("plan_settings")
    .select("feature_overrides")
    .eq("id", plan)
    .maybeSingle();

  const currentOverrides: Record<string, boolean> = planSettings?.feature_overrides ?? {};
  const updatedOverrides = { ...currentOverrides, [featureKey]: enabled };

  const { error } = await (adminClient as any)
    .from("plan_settings")
    .upsert({
      id: plan,
      feature_overrides: updatedOverrides,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw error;

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "plan_feature.toggle",
    entityType: "plan_feature",
    entityId: `${plan}:${featureKey}`,
    entityName: `${plan} / ${featureKey}`,
    details: { plan, featureKey, enabled },
  });

  revalidatePath("/admin/planos/recursos");
}
