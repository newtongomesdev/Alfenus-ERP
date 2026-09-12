"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { upsertPlanLimit, deletePlanLimit } from "@/lib/admin/plan-limits";
import { logAdminAction } from "@/lib/admin/audit";

export async function savePlanLimitAction(planId: string, limitKey: string, limitValue: number) {
  const { userId, email } = await getAdminContext();

  await upsertPlanLimit(planId, limitKey, limitValue);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "plan_limit.upsert",
    entityType: "plan_limit",
    entityId: `${planId}:${limitKey}`,
    entityName: `${planId} / ${limitKey}`,
    details: { planId, limitKey, limitValue },
  });

  revalidatePath("/admin/planos/limites");
}

export async function deletePlanLimitAction(planId: string, limitKey: string) {
  const { userId, email } = await getAdminContext();

  await deletePlanLimit(planId, limitKey);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "plan_limit.delete",
    entityType: "plan_limit",
    entityId: `${planId}:${limitKey}`,
    entityName: `${planId} / ${limitKey}`,
    details: { planId, limitKey },
  });

  revalidatePath("/admin/planos/limites");
}
