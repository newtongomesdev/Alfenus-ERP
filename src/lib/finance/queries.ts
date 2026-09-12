import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ClientFinancialSummary = {
  clientId: string;
  totalContracts: number;
  totalContractAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  overdueAmountCents: number;
  overdueInstallments: number;
};

export type ContractFinancialSummary = {
  contractId: string;
  serviceDescription: string;
  totalAmountCents: number;
  paidAmountCents: number;
  pendingAmountCents: number;
  overdueAmountCents: number;
  overdueInstallments: number;
  installments: Array<{
    id: string;
    number: number;
    finalAmountCents: number;
    paidAmountCents: number;
    dueDate: string;
    status: string;
  }>;
};

export async function getFinancialSummaryByClient(lawFirmId: string, clientId: string): Promise<ClientFinancialSummary> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { clientId, totalContracts: 0, totalContractAmountCents: 0, totalPaidCents: 0, totalPendingCents: 0, overdueAmountCents: 0, overdueInstallments: 0 };

  const { data: contracts, error: contractsError } = await supabase
    .from("contracts")
    .select("id, total_amount_cents")
    .eq("law_firm_id", lawFirmId)
    .eq("client_id", clientId);

  if (contractsError) throw contractsError;

  const contractRows = (contracts ?? []) as Array<{ id: string; total_amount_cents: number }>;
  const contractIds = contractRows.map((c) => c.id);

  if (contractIds.length === 0) {
    return { clientId, totalContracts: 0, totalContractAmountCents: 0, totalPaidCents: 0, totalPendingCents: 0, overdueAmountCents: 0, overdueInstallments: 0 };
  }

  const { data: installments, error: installmentsError } = await supabase
    .from("installments")
    .select("final_amount_cents, paid_amount_cents, due_date, status")
    .eq("law_firm_id", lawFirmId)
    .in("contract_id", contractIds)
    .neq("status", "cancelada");

  if (installmentsError) throw installmentsError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const installmentRows = (installments ?? []) as Array<{
    final_amount_cents: number;
    paid_amount_cents: number;
    due_date: string;
    status: string;
  }>;

  let totalPaid = 0;
  let totalPending = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inst of installmentRows) {
    totalPaid += inst.paid_amount_cents;
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    totalPending += remaining;
    if (remaining > 0 && new Date(`${inst.due_date}T00:00:00`) < today) {
      overdueAmount += remaining;
      overdueCount += 1;
    }
  }

  return {
    clientId,
    totalContracts: contractRows.length,
    totalContractAmountCents: contractRows.reduce((sum, c) => sum + c.total_amount_cents, 0),
    totalPaidCents: totalPaid,
    totalPendingCents: totalPending,
    overdueAmountCents: overdueAmount,
    overdueInstallments: overdueCount,
  };
}

export async function getFinancialSummaryByContract(lawFirmId: string, contractId: string): Promise<ContractFinancialSummary | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, service_description, total_amount_cents")
    .eq("law_firm_id", lawFirmId)
    .eq("id", contractId)
    .maybeSingle();

  if (contractError || !contract) return null;

  const { data: installments, error: installmentsError } = await supabase
    .from("installments")
    .select("id, number, final_amount_cents, paid_amount_cents, due_date, status")
    .eq("law_firm_id", lawFirmId)
    .eq("contract_id", contractId)
    .neq("status", "cancelada")
    .order("number", { ascending: true });

  if (installmentsError) throw installmentsError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const installmentRows = (installments ?? []) as Array<{
    id: string;
    number: number;
    final_amount_cents: number;
    paid_amount_cents: number;
    due_date: string;
    status: string;
  }>;

  let paidAmount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inst of installmentRows) {
    paidAmount += inst.paid_amount_cents;
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    if (remaining > 0 && new Date(`${inst.due_date}T00:00:00`) < today) {
      overdueAmount += remaining;
      overdueCount += 1;
    }
  }

  const totalAmount = (contract as { total_amount_cents: number }).total_amount_cents;

  return {
    contractId: (contract as { id: string }).id,
    serviceDescription: (contract as { service_description: string }).service_description,
    totalAmountCents: totalAmount,
    paidAmountCents: paidAmount,
    pendingAmountCents: Math.max(totalAmount - paidAmount, 0),
    overdueAmountCents: overdueAmount,
    overdueInstallments: overdueCount,
    installments: installmentRows.map((inst) => ({
      id: inst.id,
      number: inst.number,
      finalAmountCents: inst.final_amount_cents,
      paidAmountCents: inst.paid_amount_cents,
      dueDate: inst.due_date,
      status: inst.status,
    })),
  };
}
