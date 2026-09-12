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
  sourceProposalId: string | null;
  sourceProposalTitle: string | null;
  responsibleMemberId: string | null;
  responsibleMemberName: string | null;
  archivedAt: string | null;
  activeVersionNumber: number | null;
};

export type ContractListFilters = {
  search?: string;
  status?: string;
  clientId?: string;
  responsibleMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
  origin?: "proposal" | "manual";
  includeArchived?: boolean;
  sort?: "created_at" | "updated_at" | "total_amount_cents" | "service_description" | "status";
  direction?: "asc" | "desc";
};

export async function getContractListOptions(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { clients: [] as Array<{ id: string; name: string }> };
  const result = await supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).order("name", { ascending: true });
  if (result.error) throw result.error;
  return { clients: (result.data ?? []) as Array<{ id: string; name: string }> };
}

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

export type ContractConversionDetail = {
  sourceProposalId: string;
  sourceProposalVersionId: string;
  snapshotJson: Record<string, unknown> | null;
  snapshotHash: string | null;
  convertedAt: string | null;
  versionId: string | null;
  versionNumber: number | null;
  versionTitle: string | null;
  versionContent: string | null;
  clauses: Array<{ id: string; title: string; content: string; orderIndex: number }>;
};

export type ContractEditorVersion = {
  id: string; number: number; title: string; content: string; parties: Record<string, unknown>; terms: Record<string, unknown>; metadata: Record<string, unknown>; readiness: Array<Record<string, unknown>>; hash: string; isActive: boolean; createdAt: string; clauses: Array<Record<string, unknown>>;
};
export type ContractEditorDetail = { contract: { id: string; title: string; status: string; updatedAt: string; activeVersionId: string | null; archivedAt: string | null; metadata: Record<string, unknown>; canWrite: boolean }; versions: ContractEditorVersion[]; events: Array<{ type: string; versionId: string | null; createdAt: string; metadata: Record<string, unknown> }> };

export async function getContractEditorDetails(contractId: string): Promise<ContractEditorDetail | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await (supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> }).rpc("get_contract_editor_secure", { p_contract_id: contractId });
  if (error || !data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const contract = raw.contract as Record<string, unknown> | undefined;
  if (!contract) return null;
  return { contract: { id: String(contract.id), title: String(contract.title), status: String(contract.status), updatedAt: String(contract.updatedAt), activeVersionId: contract.activeVersionId ? String(contract.activeVersionId) : null, archivedAt: contract.archivedAt ? String(contract.archivedAt) : null, metadata: (contract.metadata ?? {}) as Record<string, unknown>, canWrite: Boolean(contract.canWrite) }, versions: Array.isArray(raw.versions) ? raw.versions as ContractEditorVersion[] : [], events: Array.isArray(raw.events) ? raw.events as ContractEditorDetail["events"] : [] };
}

export async function getContractConversionDetails(contractId: string): Promise<ContractConversionDetail | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await (supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }> }).rpc("get_contract_conversion_secure", { p_contract_id: contractId });
  if (error || !data?.[0]) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    sourceProposalId: String(row.source_proposal_id), sourceProposalVersionId: String(row.source_proposal_version_id),
    snapshotJson: (row.snapshot_json ?? null) as Record<string, unknown> | null, snapshotHash: row.snapshot_hash ? String(row.snapshot_hash) : null,
    convertedAt: row.converted_at ? String(row.converted_at) : null, versionId: row.version_id ? String(row.version_id) : null,
    versionNumber: row.version_number == null ? null : Number(row.version_number), versionTitle: row.version_title ? String(row.version_title) : null,
    versionContent: row.version_content ? String(row.version_content) : null,
    clauses: Array.isArray(row.clauses) ? (row.clauses as Array<Record<string, unknown>>).map((clause) => ({ id: String(clause.id), title: String(clause.title), content: String(clause.content ?? ""), orderIndex: Number(clause.orderIndex ?? 0) })) : [],
  };
}

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

export async function getContractsOverview(lawFirmId: string, page?: number, limit?: number, filters: ContractListFilters = {}): Promise<ContractsOverview> {
  const supabase = await getSupabaseServerClient();
  const safeLimit = limit ?? 20;
  const safePage = page ?? 1;

  if (!supabase) {
    return { activeContracts: 0, totalPortfolioCents: 0, openAmountCents: 0, overdueAmountCents: 0, contracts: [], totalCount: 0 };
  }

  const sortAllowlist: Record<NonNullable<ContractListFilters["sort"]>, string> = { created_at: "created_at", updated_at: "updated_at", total_amount_cents: "total_amount_cents", service_description: "service_description", status: "status" };
  const sortColumn = sortAllowlist[filters.sort ?? "created_at"];
  const direction = filters.direction === "asc";
  const matchingClientIds = filters.search ? (await supabase.from("clients").select("id").eq("law_firm_id", lawFirmId).ilike("name", `%${filters.search}%`)).data?.map((row) => row.id) ?? [] : [];
  const buildQuery = () => {
    let query = supabase.from("contracts").select("id, client_id, legal_case_id, service_description, total_amount_cents, balance_cents, installments_count, first_due_date, payment_method, status, created_at, updated_at, responsible_member_id, archived_at, source_proposal_id", { count: "exact" }).eq("law_firm_id", lawFirmId);
    if (!filters.includeArchived) query = query.is("archived_at", null);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.responsibleMemberId) query = query.eq("responsible_member_id", filters.responsibleMemberId);
    if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
    if (filters.origin === "proposal") query = query.not("source_proposal_id", "is", null);
    if (filters.origin === "manual") query = query.is("source_proposal_id", null);
    if (filters.search) {
      const escaped = filters.search.replace(/[%(),]/g, " ");
      const searchTerms = [`service_description.ilike.%${escaped}%`, `payment_method.ilike.%${escaped}%`];
      if (matchingClientIds.length) searchTerms.push(`client_id.in.(${matchingClientIds.join(",")})`);
      query = query.or(searchTerms.join(","));
    }
    return query;
  };
  const { count } = await buildQuery().range(0, 0);
  const totalCount = count ?? 0;

  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // Fetch paginated contracts
  const { data, error } = await buildQuery().order(sortColumn, { ascending: direction }).range(from, to);

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
    updated_at: string;
    responsible_member_id: string | null;
    archived_at: string | null;
    source_proposal_id: string | null;
  }>;

  const clientIds = Array.from(new Set(contractRows.map((contract) => contract.client_id)));
  const legalCaseIds = Array.from(new Set(contractRows.map((contract) => contract.legal_case_id).filter(Boolean))) as string[];
  const contractIds = contractRows.map((contract) => contract.id);

  const sourceProposalIds = contractRows.map((contract) => contract.source_proposal_id).filter(Boolean) as string[];
  const responsibleIds = contractRows.map((contract) => contract.responsible_member_id).filter(Boolean) as string[];
  const [clientsResult, casesResult, installmentsResult, proposalsResult, membersResult, versionsResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").eq("law_firm_id", lawFirmId).in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    sourceProposalIds.length ? supabase.from("commercial_proposals").select("id, title").eq("law_firm_id", lawFirmId).in("id", sourceProposalIds) : Promise.resolve({ data: [], error: null }),
    responsibleIds.length ? supabase.from("law_firm_members").select("id, name").eq("law_firm_id", lawFirmId).in("id", responsibleIds) : Promise.resolve({ data: [], error: null }),
    contractIds.length ? supabase.from("contract_conversion_versions").select("contract_id, version_number, is_active").eq("law_firm_id", lawFirmId).in("contract_id", contractIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
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
  if (proposalsResult.error || membersResult.error || versionsResult.error) throw proposalsResult.error ?? membersResult.error ?? versionsResult.error;

  const clientNames = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((client) => [client.id, client.name]));
  const caseTitles = new Map(((casesResult.data ?? []) as Array<{ id: string; title: string }>).map((legalCase) => [legalCase.id, legalCase.title]));
  const proposalTitles = new Map(((proposalsResult.data ?? []) as Array<{ id: string; title: string }>).map((proposal) => [proposal.id, proposal.title]));
  const memberNames = new Map(((membersResult.data ?? []) as Array<{ id: string; name: string }>).map((member) => [member.id, member.name]));
  const activeVersions = new Map(((versionsResult.data ?? []) as Array<{ contract_id: string; version_number: number }>).map((version) => [version.contract_id, version.version_number]));
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
      sourceProposalId: contract.source_proposal_id,
      sourceProposalTitle: contract.source_proposal_id ? proposalTitles.get(contract.source_proposal_id) ?? null : null,
      responsibleMemberId: contract.responsible_member_id,
      responsibleMemberName: contract.responsible_member_id ? memberNames.get(contract.responsible_member_id) ?? null : null,
      archivedAt: contract.archived_at,
      activeVersionNumber: activeVersions.get(contract.id) ?? null,
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
    sourceProposalId: null,
    sourceProposalTitle: null,
    responsibleMemberName: null,
    archivedAt: null,
    activeVersionNumber: null,
  };
}
