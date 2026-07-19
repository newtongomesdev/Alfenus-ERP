import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminContext = {
  userId: string;
  email: string;
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
};

/**
 * Validates the current user is a superadmin and returns admin context.
 * Redirects to /dashboard if not authenticated or not a superadmin.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/entrar");

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/entrar");

  // Check app_metadata.role
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") redirect("/dashboard");

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) redirect("/dashboard");

  return {
    userId: user.id,
    email: user.email ?? "",
    adminClient,
  };
}
