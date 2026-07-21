"use server";

import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function setTenantLimitOverrideAction(
  tenantId: string,
  limitKey: string,
  overrideValue: number,
  reason: string,
) {
  const { adminClient, userId, email } = await getAdminContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("tenant_limit_overrides")
    .upsert(
      {
        law_firm_id: tenantId,
        limit_key: limitKey,
        override_value: overrideValue,
        reason: reason || null,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "law_firm_id,limit_key" },
    );

  if (error) throw error;

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "limit_override.set",
    entityType: "tenant_limit_override",
    entityId: tenantId,
    entityName: limitKey,
    details: { limitKey, overrideValue, reason },
  });

  revalidatePath(`/admin/escritorios/${tenantId}/limites`);
  revalidatePath(`/admin/escritorios/${tenantId}`);
}

export async function removeTenantLimitOverrideAction(
  tenantId: string,
  limitKey: string,
) {
  const { adminClient, userId, email } = await getAdminContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("tenant_limit_overrides")
    .delete()
    .eq("law_firm_id", tenantId)
    .eq("limit_key", limitKey);

  if (error) throw error;

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "limit_override.remove",
    entityType: "tenant_limit_override",
    entityId: tenantId,
    entityName: limitKey,
    details: { limitKey },
  });

  revalidatePath(`/admin/escritorios/${tenantId}/limites`);
  revalidatePath(`/admin/escritorios/${tenantId}`);
}
