"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";

export async function suspendTenantAction(formData: FormData) {
  const { adminClient } = await getAdminContext();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) redirect("/admin/escritorios");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("law_firms").update({ status: "suspenso" }).eq("id", tenantId);
  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${tenantId}`);
}

export async function reactivateTenantAction(formData: FormData) {
  const { adminClient } = await getAdminContext();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) redirect("/admin/escritorios");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from("law_firms").update({ status: "ativo" }).eq("id", tenantId);
  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${tenantId}`);
}
