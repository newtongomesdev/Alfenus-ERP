import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

type OverdueTaskClient = {
  from(table: "tasks"): {
    select(columns: string): {
      lt(column: string, value: unknown): {
        neq(column: string, value: unknown): Promise<{ data: unknown[] | null; error: Error | null }>;
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

type OverdueTask = {
  id: string;
  law_firm_id: string;
  responsible_member_id: string | null;
  title: string;
  due_at: string;
};

/**
 * Checks for overdue tasks and creates notifications
 * for the responsible members.
 * @param adminClient - Optional service-role client for cron (bypasses RLS).
 */
export async function checkOverdueTasks(adminClient?: SupabaseClient) {
  const supabase = adminClient ?? (await getSupabaseServerClient());
  if (!supabase) return;

  const client = supabase as unknown as OverdueTaskClient;
  const now = new Date().toISOString();

  const { data: overdueTasks } = await client
    .from("tasks")
    .select("id, law_firm_id, responsible_member_id, title, due_at")
    .lt("due_at", now)
    .neq("status", "concluido");

  for (const task of (overdueTasks ?? []) as OverdueTask[]) {
    const { data: existing } = await client
      .from("notifications")
      .select("id")
      .eq("law_firm_id", task.law_firm_id)
      .eq("type", "tarefa_atrasada")
      .contains("metadata", { task_id: task.id })
      .maybeSingle();

    if (existing) continue;

    await client.from("notifications").insert({
      law_firm_id: task.law_firm_id,
      member_id: task.responsible_member_id,
      type: "tarefa_atrasada",
      title: `Tarefa atrasada: ${task.title}`,
      body: `Prazo: ${task.due_at}`,
      metadata: { task_id: task.id },
    });
  }
}
