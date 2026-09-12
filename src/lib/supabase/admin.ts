import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Supabase admin client using the service_role key.
 * Bypasses RLS — use ONLY in trusted server contexts (cron jobs, webhooks).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client bundle.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
