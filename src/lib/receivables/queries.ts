import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ReceivableItem = {
  id: string;
  contractId: string;
  contractDescription: string | null;
  clientId: string;
  clientName: string | null;
  number: number;
  finalAmountCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  status: string;
  displayStatus: string;
};

export type ReceivablesOverview = {
  expectedAmountCents: number;
  receivedAmountCents: number;
  openAmountCents: number;
  overdueAmountCents: number;
  installments: ReceivableItem[];
  totalCount: number;
};

type InstallmentRow = {
  id: string;
  contract_id: string;
  client_id: string;
  number: number;
  final_amount_cents: number;
  paid_amount_cents: number;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  status: string;
};

export async function getReceivablesOverview(lawFirmId: string, page?: number, limit?: number): Promise<ReceivablesOverview> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;

  if (!supabase) return { expectedAmountCents: 0, receivedAmountCents: 0, openAmountCents: 0, overdueAmountCents: 0, installments: [], totalCount: 0 };

  // Single query: fetch ALL non-cancelled installments sorted by due_date
  const { data, error } = await supabase
    .from("installments")
    .select("id, contract_id, client_id, number, final_amount_cents, paid_amount_cents, due_date, paid_at, payment_method, status")
    .eq("law_firm_id", lawFirmId)
    .neq("status", "cancelada")
    .order("due_date", { ascending: true });

  if (error) throw error;

  const allRows = (data ?? []) as InstallmentRow[];
  const totalCount = allRows.length;

  // Paginate in memory
  const from = (safePage - 1) * safeLimit;
  const pageRows = allRows.slice(from, from + safeLimit);

  // Fetch client and contract names for the current page
  const clientIds = Array.from(new Set(pageRows.map((row) => row.client_id)));
  const contractIds = Array.from(new Set(pageRows.map((row) => row.contract_id)));
  const [clientsResult, contractsResult] = await Promise.all([
    clientIds.length > 0 ? supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    contractIds.length > 0 ? supabase.from("contracts").select("id, service_description").eq("law_firm_id", lawFirmId).in("id", contractIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (contractsResult.error) throw contractsResult.error;

  const clientNames = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]));
  const contractDescriptions = new Map(((contractsResult.data ?? []) as Array<{ id: string; service_description: string }>).map((item) => [item.id, item.service_description]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute summary stats from all rows (single pass)
  let expectedAmountCents = 0;
  let receivedAmountCents = 0;
  let openAmountCents = 0;
  let overdueAmountCents = 0;

  for (const row of allRows) {
    expectedAmountCents += row.final_amount_cents;
    receivedAmountCents += row.paid_amount_cents;
    const remaining = Math.max(row.final_amount_cents - row.paid_amount_cents, 0);
    openAmountCents += remaining;
    if (remaining > 0 && new Date(`${row.due_date}T00:00:00`) < today) {
      overdueAmountCents += remaining;
    }
  }

  // Build display items for current page
  const installments = pageRows.map((row) => {
    const remaining = Math.max(row.final_amount_cents - row.paid_amount_cents, 0);
    const displayStatus = remaining > 0 && new Date(`${row.due_date}T00:00:00`) < today ? "atrasada" : row.status;
    return { id: row.id, contractId: row.contract_id, contractDescription: contractDescriptions.get(row.contract_id) ?? null, clientId: row.client_id, clientName: clientNames.get(row.client_id) ?? null, number: row.number, finalAmountCents: row.final_amount_cents, paidAmountCents: row.paid_amount_cents, remainingAmountCents: remaining, dueDate: row.due_date, paidAt: row.paid_at, paymentMethod: row.payment_method, status: row.status, displayStatus } satisfies ReceivableItem;
  });

  return {
    expectedAmountCents,
    receivedAmountCents,
    openAmountCents,
    overdueAmountCents,
    installments,
    totalCount,
  };
}
