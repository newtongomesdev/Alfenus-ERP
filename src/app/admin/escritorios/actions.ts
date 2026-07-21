"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function suspendTenantAction(formData: FormData) {
  const { adminClient, userId, email } = await getAdminContext();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) redirect("/admin/escritorios");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("law_firms").update({ status: "suspenso" }).eq("id", tenantId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "tenant.suspend",
    entityType: "law_firm",
    entityId: tenantId,
    details: { status: "suspenso" },
  });

  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${tenantId}`);
}

export async function reactivateTenantAction(formData: FormData) {
  const { adminClient, userId, email } = await getAdminContext();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) redirect("/admin/escritorios");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("law_firms").update({ status: "ativo" }).eq("id", tenantId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "tenant.reactivate",
    entityType: "law_firm",
    entityId: tenantId,
    details: { status: "ativo" },
  });

  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${tenantId}`);
}

export async function startTrialAction(tenantId: string, days: number) {
  const { userId, email, adminClient } = await getAdminContext();

  const now = new Date();
  const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("law_firms")
    .update({
      trial_starts_at: now.toISOString(),
      trial_ends_at: endsAt.toISOString(),
      trial_used: true,
      updated_at: now.toISOString(),
    })
    .eq("id", tenantId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "tenant.trial.start",
    entityType: "law_firm",
    entityId: tenantId,
    details: { days, trialStartsAt: now.toISOString(), trialEndsAt: endsAt.toISOString() },
  });

  revalidatePath(`/admin/escritorios/${tenantId}`);
  revalidatePath("/admin/escritorios");
}

export async function extendTrialAction(tenantId: string, days: number) {
  const { userId, email, adminClient } = await getAdminContext();

  const { data: firm } = await (adminClient as any)
    .from("law_firms")
    .select("trial_ends_at")
    .eq("id", tenantId)
    .maybeSingle();

  const currentEnds = firm?.trial_ends_at ? new Date(firm.trial_ends_at) : new Date();
  const newEnds = new Date(currentEnds.getTime() + days * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("law_firms")
    .update({
      trial_ends_at: newEnds.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "tenant.trial.extend",
    entityType: "law_firm",
    entityId: tenantId,
    details: { days, newTrialEndsAt: newEnds.toISOString() },
  });

  revalidatePath(`/admin/escritorios/${tenantId}`);
}

export async function endTrialAction(tenantId: string) {
  const { userId, email, adminClient } = await getAdminContext();

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("law_firms")
    .update({
      trial_ends_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", tenantId);

  await logAdminAction({
    adminUserId: userId,
    adminEmail: email,
    action: "tenant.trial.end",
    entityType: "law_firm",
    entityId: tenantId,
    details: { endedAt: now.toISOString() },
  });

  revalidatePath(`/admin/escritorios/${tenantId}`);
}
