import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

type DeadlineReminderClient = {
  from(table: "deadlines"): {
    select(columns: string): {
      gte(column: string, value: unknown): {
        lte(column: string, value: unknown): {
          neq(column: string, value: unknown): Promise<{ data: unknown[] | null; error: Error | null }>;
        };
      };
    };
  };
  from(table: "notifications"): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          contains(column: string, value: unknown): {
            maybeSingle(): Promise<{ data: unknown; error: Error | null }>;
          };
        };
      };
    };
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

type DeadlineReminder = {
  id: string;
  law_firm_id: string;
  responsible_member_id: string | null;
  title: string;
  due_date: string;
  due_time: string | null;
};

/**
 * Checks for deadlines due in the next 24 hours and creates
 * reminder notifications for the responsible members.
 * @param adminClient - Optional service-role client for cron (bypasses RLS).
 */
export async function checkDeadlineReminders(adminClient?: SupabaseClient) {
  const supabase = adminClient ?? (await getSupabaseServerClient());
  if (!supabase) return;

  const client = supabase as unknown as DeadlineReminderClient;
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: urgentDeadlines } = await client
    .from("deadlines")
    .select("id, law_firm_id, responsible_member_id, title, due_date, due_time")
    .gte("due_date", now.toISOString().slice(0, 10))
    .lte("due_date", tomorrow.toISOString().slice(0, 10))
    .neq("status", "concluido");

  for (const deadline of (urgentDeadlines ?? []) as DeadlineReminder[]) {
    const { data: existing } = await client
      .from("notifications")
      .select("id")
      .eq("law_firm_id", deadline.law_firm_id)
      .eq("type", "prazo_proximo")
      .contains("metadata", { deadline_id: deadline.id })
      .maybeSingle();

    if (existing) continue;

    await client.from("notifications").insert({
      law_firm_id: deadline.law_firm_id,
      member_id: deadline.responsible_member_id,
      type: "prazo_proximo",
      title: `Prazo próximo: ${deadline.title}`,
      body: `Vence em: ${deadline.due_date}${deadline.due_time ? " às " + deadline.due_time : ""}`,
      metadata: { deadline_id: deadline.id },
    });
  }
}
