import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ContractListItem = {
  id: string;
  clientId: string;
  clientName: string | null;
  legalCaseId: string | null;
  legalCaseTitle: string | null;
  serviceDescription: string;
  totalAmountCents: number;
  balanceCents: number;
  installmentsCount: number;
  firstDueDate: string | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  paidAmountCents: number;
  overdueAmountCents: number;
  openInstallments: number;
};

export type ContractDetail = ContractListItem & {
  upfrontAmountCents: number;
  hasInstallments: boolean;
  frequency: string | null;
  successFee: string | null;
  responsibleMemberId: string | null;
  notes: string | null;
  updatedAt: string;
  installments: Array<{
    id: string;
    number: number;
    originalAmountCents: number;
    finalAmountCents: number;
    paidAmountCents: number;
    dueDate: string;
    paidAt: string | null;
    status: string;
  }>;
};

export type ContractFormOptions = {
  clients: Array<{ id: string; name: string }>;
  legalCases: Array<{ id: string; clientId: string | null; title: string; caseNumber: string | null }>;
};

export type ContractsOverview = {
  activeContracts: number;
  totalPortfolioCents: number;
  openAmountCents: number;
  overdueAmountCents: number;
  contracts: ContractListItem[];
  totalCount: number;
};

export async function getContractFormOptions(lawFirmId: string): Promise<ContractFormOptions> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { clients: [], legalCases: [] };
  }

  const [clientsResult, casesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("law_firm_id", lawFirmId)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("legal_cases")
      .select("id, client_id, title, case_number")
      .eq("law_firm_id", lawFirmId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error) {
    throw clientsResult.error;
  }

  if (casesResult.error) {
    throw casesResult.error;
  }

  return {
    clients: ((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((client) => ({
      id: client.id,
      name: client.name,
    })),
    legalCases: ((casesResult.data ?? []) as Array<{
      id: string;
      client_id: string | null;
      title: string;
      case_number: string | null;
    }>).map((legalCase) => ({
      id: legalCase.id,
      clientId: legalCase.client_id,
      title: legalCase.title,
      caseNumber: legalCase.case_number,
    })),
  };
}

export async function getContractsOverview(lawFirmId: string, page?: number, limit?: number): Promise<ContractsOverview> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;

  if (!supabase) {
    return { activeContracts: 0, totalPortfolioCents: 0, openAmountCents: 0, overdueAmountCents: 0, contracts: [], totalCount: 0 };
  }

  // Count all contracts for pagination
  const { count } = await supabase.from("contracts").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId);
  const totalCount = count ?? 0;

  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // Fetch paginated contracts
  const { data, error } = await supabase
    .from("contracts")
    .select("id, client_id, legal_case_id, service_description, total_amount_cents, balance_cents, installments_count, first_due_date, payment_method, status, created_at")
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const contractRows = (data ?? []) as Array<{
    id: string;
    client_id: string;
    legal_case_id: string | null;
    service_description: string;
    total_amount_cents: number;
    balance_cents: number;
    installments_count: number;
    first_due_date: string | null;
    payment_method: string | null;
    status: string;
    created_at: string;
  }>;

  const clientIds = Array.from(new Set(contractRows.map((contract) => contract.client_id)));
  const legalCaseIds = Array.from(new Set(contractRows.map((contract) => contract.legal_case_id).filter(Boolean))) as string[];
  const contractIds = contractRows.map((contract) => contract.id);

  const [clientsResult, casesResult, installmentsResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    legalCaseIds.length > 0
      ? supabase.from("legal_cases").select("id, title").eq("law_firm_id", lawFirmId).in("id", legalCaseIds)
      : Promise.resolve({ data: [], error: null }),
    contractIds.length > 0
      ? supabase
          .from("installments")
          .select("contract_id, final_amount_cents, paid_amount_cents, due_date, status")
          .eq("law_firm_id", lawFirmId)
          .in("contract_id", contractIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (clientsResult.error) {
    throw clientsResult.error;
  }

  if (casesResult.error) {
    throw casesResult.error;
  }

  if (installmentsResult.error) {
    throw installmentsResult.error;
  }

  const clientNames = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((client) => [client.id, client.name]));
  const caseTitles = new Map(((casesResult.data ?? []) as Array<{ id: string; title: string }>).map((legalCase) => [legalCase.id, legalCase.title]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const installmentStats = new Map<string, { paid: number; overdue: number; open: number }>();

  for (const installment of (installmentsResult.data ?? []) as Array<{
    contract_id: string;
    final_amount_cents: number;
    paid_amount_cents: number;
    due_date: string;
    status: string;
  }>) {
    const current = installmentStats.get(installment.contract_id) ?? { paid: 0, overdue: 0, open: 0 };
    const remaining = Math.max(installment.final_amount_cents - installment.paid_amount_cents, 0);

    current.paid += installment.paid_amount_cents;

    if (installment.status !== "pago" && remaining > 0) {
      current.open += 1;

      if (new Date(`${installment.due_date}T00:00:00`) < today) {
        current.overdue += remaining;
      }
    }

    installmentStats.set(installment.contract_id, current);
  }

  // Fetch summary stats from ALL contracts (not paginated)
  const [allContractsResult, allInstallmentsResult] = await Promise.all([
    supabase.from("contracts").select("id, total_amount_cents, status").eq("law_firm_id", lawFirmId),
    supabase.from("installments").select("contract_id, final_amount_cents, paid_amount_cents, due_date, status").eq("law_firm_id", lawFirmId),
  ]);

  const allContracts = (allContractsResult.data ?? []) as Array<{ id: string; total_amount_cents: number; status: string }>;
  const allInstallments = (allInstallmentsResult.data ?? []) as Array<{ contract_id: string; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;

  const activeContracts = allContracts.filter((c) => c.status === "ativo").length;
  const totalPortfolioCents = allContracts.reduce((total, c) => total + c.total_amount_cents, 0);

  // Compute open/overdue from ALL installments
  let openAmountCents = 0;
  let overdueAmountCents = 0;
  const allStats = new Map<string, { paid: number; overdue: number }>();

  for (const inst of allInstallments) {
    const current = allStats.get(inst.contract_id) ?? { paid: 0, overdue: 0 };
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    current.paid += inst.paid_amount_cents;
    if (inst.status !== "pago" && remaining > 0) {
      openAmountCents += remaining;
      if (new Date(`${inst.due_date}T00:00:00`) < today) {
        overdueAmountCents += remaining;
        current.overdue += remaining;
      }
    }
    allStats.set(inst.contract_id, current);
  }

  const contracts = contractRows.map((contract) => {
    const stats = installmentStats.get(contract.id) ?? { paid: 0, overdue: 0, open: 0 };

    return {
      id: contract.id,
      clientId: contract.client_id,
      clientName: clientNames.get(contract.client_id) ?? null,
      legalCaseId: contract.legal_case_id,
      legalCaseTitle: contract.legal_case_id ? caseTitles.get(contract.legal_case_id) ?? null : null,
      serviceDescription: contract.service_description,
      totalAmountCents: contract.total_amount_cents,
      balanceCents: contract.balance_cents,
      installmentsCount: contract.installments_count,
      firstDueDate: contract.first_due_date,
      paymentMethod: contract.payment_method,
      status: contract.status,
      createdAt: contract.created_at,
      paidAmountCents: stats.paid,
      overdueAmountCents: stats.overdue,
      openInstallments: stats.open,
    } satisfies ContractListItem;
  });

  return {
    activeContracts,
    totalPortfolioCents,
    openAmountCents,
    overdueAmountCents,
    contracts,
    totalCount,
  };
}

export async function getContractDetails(lawFirmId: string, contractId: string): Promise<ContractDetail | null> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, client_id, legal_case_id, service_description, total_amount_cents, upfront_amount_cents, balance_cents, has_installments, installments_count, first_due_date, frequency, payment_method, success_fee, responsible_member_id, status, notes, created_at, updated_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return null;
  }

  const row = contract as {
    id: string;
    client_id: string;
    legal_case_id: string | null;
    service_description: string;
    total_amount_cents: number;
    upfront_amount_cents: number;
    balance_cents: number;
    has_installments: boolean;
    installments_count: number;
    first_due_date: string | null;
    frequency: string | null;
    payment_method: string | null;
    success_fee: string | null;
    responsible_member_id: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };

  const [{ data: client }, { data: legalCase }, { data: installmentsData }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).eq("id", row.client_id).maybeSingle(),
    row.legal_case_id
      ? supabase.from("legal_cases").select("id, title").eq("law_firm_id", lawFirmId).eq("id", row.legal_case_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("installments")
      .select("id, number, original_amount_cents, final_amount_cents, paid_amount_cents, due_date, paid_at, status")
      .eq("law_firm_id", lawFirmId)
      .eq("contract_id", contractId)
      .order("number", { ascending: true }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let paidAmountCents = 0;
  let overdueAmountCents = 0;
  let openInstallments = 0;

  const installments = (installmentsData ?? []).map((inst) => {
    const i = inst as { id: string; number: number; original_amount_cents: number; final_amount_cents: number; paid_amount_cents: number; due_date: string; paid_at: string | null; status: string };
    paidAmountCents += i.paid_amount_cents;
    const remaining = Math.max(i.final_amount_cents - i.paid_amount_cents, 0);
    if (i.status !== "pago" && remaining > 0) {
      openInstallments += 1;
      if (new Date(`${i.due_date}T00:00:00`) < today) {
        overdueAmountCents += remaining;
      }
    }
    return {
      id: i.id,
      number: i.number,
      originalAmountCents: i.original_amount_cents,
      finalAmountCents: i.final_amount_cents,
      paidAmountCents: i.paid_amount_cents,
      dueDate: i.due_date,
      paidAt: i.paid_at,
      status: i.status,
    };
  });

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: (client as { name: string } | null)?.name ?? null,
    legalCaseId: row.legal_case_id,
    legalCaseTitle: (legalCase as { title: string } | null)?.title ?? null,
    serviceDescription: row.service_description,
    totalAmountCents: row.total_amount_cents,
    upfrontAmountCents: row.upfront_amount_cents,
    balanceCents: row.balance_cents,
    hasInstallments: row.has_installments,
    installmentsCount: row.installments_count,
    firstDueDate: row.first_due_date,
    frequency: row.frequency,
    paymentMethod: row.payment_method,
    successFee: row.success_fee,
    responsibleMemberId: row.responsible_member_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAmountCents,
    overdueAmountCents,
    openInstallments,
    installments,
  };
}
