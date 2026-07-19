import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

type OverdueClient = {
  from(table: "installments"): {
    select(columns: string): {
      lt(column: string, value: unknown): {
        neq(column: string, value: unknown): {
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
  from(table: "contracts"): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
};

type OverdueInstallment = {
  id: string;
  law_firm_id: string;
  contract_id: string;
  number: number;
  final_amount_cents: number;
  paid_amount_cents: number;
  due_date: string;
};

/**
 * Checks for overdue installments and creates notifications
 * for the responsible members of the related contracts.
 * @param adminClient - Optional service-role client for cron (bypasses RLS).
 */
export async function checkOverduePayments(adminClient?: SupabaseClient) {
  const supabase = adminClient ?? (await getSupabaseServerClient());
  if (!supabase) return;

  const client = supabase as unknown as OverdueClient;
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueInstallments } = await client
    .from("installments")
    .select("id, law_firm_id, contract_id, number, final_amount_cents, paid_amount_cents, due_date")
    .lt("due_date", today)
    .neq("status", "cancelada")
    .neq("status", "pago");

  for (const inst of (overdueInstallments ?? []) as OverdueInstallment[]) {
    const { data: existing } = await client
      .from("notifications")
      .select("id")
      .eq("law_firm_id", inst.law_firm_id)
      .eq("type", "pagamento_atrasado")
      .contains("metadata", { installment_id: inst.id })
      .maybeSingle();

    if (existing) continue;

    const { data: contract } = await client
      .from("contracts")
      .select("responsible_member_id, service_description")
      .eq("id", inst.contract_id)
      .maybeSingle();

    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);

    await client.from("notifications").insert({
      law_firm_id: inst.law_firm_id,
      member_id: (contract as Record<string, unknown>)?.responsible_member_id ?? null,
      type: "pagamento_atrasado",
      title: `Parcela #${inst.number} em atraso`,
      body: `Valor: R$ ${(remaining / 100).toFixed(2)} | Vencimento: ${inst.due_date}`,
      metadata: { installment_id: inst.id, contract_id: inst.contract_id },
    });
  }
}
