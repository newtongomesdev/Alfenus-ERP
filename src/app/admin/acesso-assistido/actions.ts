"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";

export async function startAssistedAccessAction(formData: FormData) {
  const { adminClient, userId, email } = await getAdminContext();
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) redirect("/admin/escritorios");

  // Get tenant name
  const { data: firm } = await adminClient
    .from("law_firms")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  // Log the assisted access
  const { error } = await adminClient
    .from("assisted_access_logs")
    .insert({
      superadmin_user_id: userId,
      superadmin_email: email,
      target_law_firm_id: tenantId,
      target_law_firm_name: firm?.name ?? null,
    });

  if (error) throw error;

  // In a real implementation, this would set a session cookie/impersonation token
  // and redirect to the tenant's dashboard. For now, redirect to the tenant detail page.
  revalidatePath("/admin/logs");
  redirect(`/dashboard?impersonate=${tenantId}`);
}
