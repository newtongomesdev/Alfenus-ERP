import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  ClientFundsAccount,
  ClientFundsTransaction,
  ClientFundsAllocation,
  ClientFundsReconciliation,
  ClientFundsStatement,
} from "./types";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapAccountRow(row: Record<string, unknown>): ClientFundsAccount {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    clientId: row.client_id as string,
    legalCaseId: row.legal_case_id as string | null,
    accountName: row.account_name as string,
    balance: row.balance as number,
    currency: row.currency as string,
    status: row.status as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapTransactionRow(
  row: Record<string, unknown>
): ClientFundsTransaction {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    accountId: row.account_id as string,
    clientId: row.client_id as string,
    legalCaseId: row.legal_case_id as string | null,
    transactionType: row.transaction_type as string,
    amount: row.amount as number,
    description: row.description as string,
    origin: row.origin as string | null,
    beneficiary: row.beneficiary as string | null,
    receiptNumber: row.receipt_number as string | null,
    receiptUrl: row.receipt_url as string | null,
    authorizedByMemberId: row.authorized_by_member_id as string | null,
    approvalRequired: row.approval_required as boolean,
    approved: row.approved as boolean,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

function mapAllocationRow(
  row: Record<string, unknown>
): ClientFundsAllocation {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    accountId: row.account_id as string,
    transactionId: row.transaction_id as string | null,
    allocationType: row.allocation_type as string,
    amount: row.amount as number,
    description: row.description as string | null,
    createdAt: row.created_at as string,
  };
}

function mapReconciliationRow(
  row: Record<string, unknown>
): ClientFundsReconciliation {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    accountId: row.account_id as string,
    reconciledBy: row.reconciled_by as string,
    reconciledAt: row.reconciled_at as string,
    openingBalance: row.opening_balance as number,
    closingBalance: row.closing_balance as number,
    totalEntries: row.total_entries as number,
    totalExits: row.total_exits as number,
    transactionCount: row.transaction_count as number,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

function mapStatementRow(
  row: Record<string, unknown>
): ClientFundsStatement {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    accountId: row.account_id as string,
    clientId: row.client_id as string,
    legalCaseId: row.legal_case_id as string | null,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    openingBalance: row.opening_balance as number,
    closingBalance: row.closing_balance as number,
    totalEntries: row.total_entries as number,
    totalExits: row.total_exits as number,
    totalWithheld: row.total_withheld as number,
    totalRepasse: row.total_repasse as number,
    statementData: (row.statement_data as unknown[]) ?? [],
    generatedBy: row.generated_by as string | null,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export type AccountFilters = {
  status?: string;
  clientId?: string;
};

export type TransactionFilters = {
  transactionType?: string;
  accountId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function getClientAccounts(
  context: AppContext,
  filters?: AccountFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ accounts: ClientFundsAccount[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { accounts: [], total: 0 };

  let query = supabase
    .from("client_funds_accounts")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    accounts: (data ?? []).map(mapAccountRow),
    total: count ?? 0,
  };
}

export async function getClientAccountById(
  context: AppContext,
  id: string
): Promise<ClientFundsAccount | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("client_funds_accounts")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapAccountRow(data) : null;
}

export async function getClientAccountStats(context: AppContext): Promise<{
  total: number;
  totalBalance: number;
  byStatus: Record<string, number>;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, totalBalance: 0, byStatus: {} };
  }

  const { data: all } = await supabase
    .from("client_funds_accounts")
    .select("status, balance")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  let totalBalance = 0;
  const byStatus: Record<string, number> = {};

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    totalBalance += (r.balance as number) ?? 0;
  }

  return { total, totalBalance, byStatus };
}

export async function createClientAccount(
  context: AppContext,
  data: {
    clientId: string;
    legalCaseId?: string;
    accountName: string;
    currency?: string;
    notes?: string;
  }
): Promise<ClientFundsAccount | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("client_funds_accounts")
    .insert({
      law_firm_id: context.lawFirm.id,
      client_id: data.clientId,
      legal_case_id: data.legalCaseId ?? null,
      account_name: data.accountName,
      balance: 0,
      currency: data.currency ?? "BRL",
      status: "ativa",
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapAccountRow(pub) : null;
}

export async function updateClientAccount(
  context: AppContext,
  id: string,
  data: Partial<{
    accountName: string;
    legalCaseId: string;
    currency: string;
    status: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: Database["public"]["Tables"]["client_funds_accounts"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (data.accountName !== undefined) update.account_name = data.accountName;
  if (data.legalCaseId !== undefined) update.legal_case_id = data.legalCaseId;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("client_funds_accounts")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function getTransactions(
  context: AppContext,
  filters?: TransactionFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ transactions: ClientFundsTransaction[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { transactions: [], total: 0 };

  let query = supabase
    .from("client_funds_transactions")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.transactionType)
    query = query.eq("transaction_type", filters.transactionType);
  if (filters?.accountId)
    query = query.eq("account_id", filters.accountId);
  if (filters?.clientId)
    query = query.eq("client_id", filters.clientId);
  if (filters?.dateFrom)
    query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo)
    query = query.lte("created_at", filters.dateTo);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    transactions: (data ?? []).map(mapTransactionRow),
    total: count ?? 0,
  };
}

export async function createTransaction(
  context: AppContext,
  data: {
    accountId: string;
    clientId: string;
    legalCaseId?: string;
    transactionType: string;
    amount: number;
    description: string;
    origin?: string;
    beneficiary?: string;
    receiptNumber?: string;
    receiptUrl?: string;
    authorizedByMemberId?: string;
    approvalRequired?: boolean;
  }
): Promise<ClientFundsTransaction | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm || !context.member) return null;

  const approvalRequired = data.approvalRequired ?? false;

  const { data: pub } = await supabase
    .from("client_funds_transactions")
    .insert({
      law_firm_id: context.lawFirm.id,
      account_id: data.accountId,
      client_id: data.clientId,
      legal_case_id: data.legalCaseId ?? null,
      transaction_type: data.transactionType,
      amount: data.amount,
      description: data.description,
      origin: data.origin ?? null,
      beneficiary: data.beneficiary ?? null,
      receipt_number: data.receiptNumber ?? null,
      receipt_url: data.receiptUrl ?? null,
      authorized_by_member_id: data.authorizedByMemberId ?? null,
      approval_required: approvalRequired,
      approved: !approvalRequired,
      created_by: context.member.userId,
    })
    .select()
    .maybeSingle();

  if (!pub) return null;

  // Update account balance if auto-approved
  if (!approvalRequired) {
    const balanceDelta = computeBalanceDelta(
      data.transactionType,
      data.amount
    );

    // Fetch current balance
    const { data: account } = await supabase
      .from("client_funds_accounts")
      .select("balance")
      .eq("id", data.accountId)
      .eq("law_firm_id", context.lawFirm.id)
      .maybeSingle();

    if (account) {
      const currentBalance = (account.balance as number) ?? 0;
      await supabase
        .from("client_funds_accounts")
        .update({
          balance: currentBalance + balanceDelta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.accountId)
        .eq("law_firm_id", context.lawFirm.id);
    }
  }

  return mapTransactionRow(pub);
}

function computeBalanceDelta(transactionType: string, amount: number): number {
  switch (transactionType) {
    case "entrada":
      return amount;
    case "retensao":
      return -amount;
    case "repasse":
      return -amount;
    case "devolucao":
      return -amount;
    case "ajuste":
    case "estorno":
      return -amount;
    default:
      return 0;
  }
}

export async function approveTransaction(
  context: AppContext,
  id: string,
  approvedBy: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return;

  // Fetch the transaction first
  const { data: tx } = await supabase
    .from("client_funds_transactions")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!tx) return;

  const now = new Date().toISOString();

  await supabase
    .from("client_funds_transactions")
    .update({
      approved: true,
      approved_by: approvedBy,
      approved_at: now,
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  // Update account balance for newly approved transaction
  const transactionType = tx.transaction_type as string;
  const amount = tx.amount as number;
  const accountId = tx.account_id as string;

  const balanceDelta = computeBalanceDelta(transactionType, amount);

  const { data: account } = await supabase
    .from("client_funds_accounts")
    .select("balance")
    .eq("id", accountId)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (account) {
    const currentBalance = (account.balance as number) ?? 0;
    await supabase
      .from("client_funds_accounts")
      .update({
        balance: currentBalance + balanceDelta,
        updated_at: now,
      })
      .eq("id", accountId)
      .eq("law_firm_id", context.lawFirm.id);
  }
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export async function getAllocations(
  context: AppContext,
  accountId?: string
): Promise<ClientFundsAllocation[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("client_funds_allocations")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (accountId) query = query.eq("account_id", accountId);

  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map(mapAllocationRow);
}

export async function createAllocation(
  context: AppContext,
  data: {
    accountId: string;
    transactionId?: string;
    allocationType: string;
    amount: number;
    description?: string;
  }
): Promise<ClientFundsAllocation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("client_funds_allocations")
    .insert({
      law_firm_id: context.lawFirm.id,
      account_id: data.accountId,
      transaction_id: data.transactionId ?? null,
      allocation_type: data.allocationType,
      amount: data.amount,
      description: data.description ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapAllocationRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Reconciliations
// ---------------------------------------------------------------------------

export async function getReconciliations(
  context: AppContext,
  accountId?: string
): Promise<ClientFundsReconciliation[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("client_funds_reconciliations")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (accountId) query = query.eq("account_id", accountId);

  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map(mapReconciliationRow);
}

export async function createReconciliation(
  context: AppContext,
  data: {
    accountId: string;
    reconciledAt: string;
    openingBalance: number;
    closingBalance: number;
    totalEntries: number;
    totalExits: number;
    transactionCount: number;
    notes?: string;
  }
): Promise<ClientFundsReconciliation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm || !context.member) return null;

  const { data: pub } = await supabase
    .from("client_funds_reconciliations")
    .insert({
      law_firm_id: context.lawFirm.id,
      account_id: data.accountId,
      reconciled_by: context.member.userId,
      reconciled_at: data.reconciledAt,
      opening_balance: data.openingBalance,
      closing_balance: data.closingBalance,
      total_entries: data.totalEntries,
      total_exits: data.totalExits,
      transaction_count: data.transactionCount,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapReconciliationRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export async function getStatements(
  context: AppContext,
  accountId?: string
): Promise<ClientFundsStatement[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("client_funds_statements")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (accountId) query = query.eq("account_id", accountId);

  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map(mapStatementRow);
}

export async function generateStatement(
  context: AppContext,
  data: {
    accountId: string;
    clientId: string;
    legalCaseId?: string;
    periodStart: string;
    periodEnd: string;
  }
): Promise<ClientFundsStatement | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const firmId = context.lawFirm.id;

  // Fetch all transactions in the period
  const { data: txRows } = await supabase
    .from("client_funds_transactions")
    .select("*")
    .eq("law_firm_id", firmId)
    .eq("account_id", data.accountId)
    .gte("created_at", data.periodStart)
    .lte("created_at", data.periodEnd)
    .order("created_at", { ascending: true });

  const transactions = (txRows ?? []).map(mapTransactionRow);

  // Compute opening balance: sum of all transactions before periodStart
  const { data: priorRows } = await supabase
    .from("client_funds_transactions")
    .select("transaction_type, amount")
    .eq("law_firm_id", firmId)
    .eq("account_id", data.accountId)
    .lt("created_at", data.periodStart);

  let openingBalance = 0;
  for (const r of priorRows ?? []) {
    openingBalance += computeBalanceDelta(
      r.transaction_type as string,
      r.amount as number
    );
  }

  let totalEntries = 0;
  let totalExits = 0;
  let totalWithheld = 0;
  let totalRepasse = 0;

  for (const tx of transactions) {
    const delta = computeBalanceDelta(tx.transactionType, tx.amount);
    if (delta > 0) {
      totalEntries += tx.amount;
    } else {
      totalExits += tx.amount;
    }

    if (tx.transactionType === "retensao") {
      totalWithheld += tx.amount;
    }
    if (tx.transactionType === "repasse") {
      totalRepasse += tx.amount;
    }
  }

  const closingBalance = openingBalance + totalEntries - totalExits;

  const now = new Date().toISOString();

  const { data: pub } = await supabase
    .from("client_funds_statements")
    .insert({
      law_firm_id: firmId,
      account_id: data.accountId,
      client_id: data.clientId,
      legal_case_id: data.legalCaseId ?? null,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_entries: totalEntries,
      total_exits: totalExits,
      total_withheld: totalWithheld,
      total_repasse: totalRepasse,
      statement_data: transactions,
      generated_by: context.member?.userId ?? null,
      generated_at: now,
    })
    .select()
    .maybeSingle();

  return pub ? mapStatementRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getClientFundsDashboardStats(context: AppContext) {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalAccounts: 0,
      totalBalance: 0,
      byStatus: {} as Record<string, number>,
      totalTransactions: 0,
      totalEntries: 0,
      totalExits: 0,
      pendingApprovals: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [accountsRes, transactionsRes] = await Promise.all([
    supabase
      .from("client_funds_accounts")
      .select("status, balance")
      .eq("law_firm_id", firmId),
    supabase
      .from("client_funds_transactions")
      .select("transaction_type, amount, approved")
      .eq("law_firm_id", firmId),
  ]);

  const accounts = accountsRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  const byStatus: Record<string, number> = {};
  let totalBalance = 0;
  for (const a of accounts) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    totalBalance += (a.balance as number) ?? 0;
  }

  let totalEntries = 0;
  let totalExits = 0;
  let pendingApprovals = 0;
  for (const t of transactions) {
    const delta = computeBalanceDelta(
      t.transaction_type as string,
      t.amount as number
    );
    if (delta > 0) {
      totalEntries += (t.amount as number) ?? 0;
    } else {
      totalExits += (t.amount as number) ?? 0;
    }
    if (!t.approved) {
      pendingApprovals += 1;
    }
  }

  return {
    totalAccounts: accounts.length,
    totalBalance,
    byStatus,
    totalTransactions: transactions.length,
    totalEntries,
    totalExits,
    pendingApprovals,
  };
}
