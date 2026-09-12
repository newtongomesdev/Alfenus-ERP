import { checkOverduePayments } from "./check-overdue-payments";
import { checkOverdueTasks } from "./check-overdue-tasks";
import { checkDeadlineReminders } from "./check-deadline-reminders";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").getSupabaseServerClient>>;

/**
 * Runs all alert checks in parallel.
 * @param adminClient - Optional service-role client for cron (bypasses RLS).
 */
export async function runAllAlertChecks(adminClient?: SupabaseClient) {
  await Promise.allSettled([
    checkOverduePayments(adminClient),
    checkOverdueTasks(adminClient),
    checkDeadlineReminders(adminClient),
  ]);
}
