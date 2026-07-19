import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  email: string;
  phone: string | null;
  document: string | null;
  createdAt: string;
  memberCount: number;
  clientCount: number;
  contractCount: number;
  paymentCount: number;
};

export type AdminTenantDetail = AdminTenant & {
  address: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  legalCaseCount: number;
  installmentCount: number;
  totalPaidCents: number;
  totalPendingCents: number;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastAccessAt: string | null;
  }>;
  recentLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actorName: string | null;
  }>;
};

export type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  membershipCount: number;
  memberships: Array<{
    lawFirmId: string;
    lawFirmName: string;
    role: string;
    status: string;
  }>;
};

export type AdminAuditLog = {
  id: string;
  lawFirmId: string;
  lawFirmName: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminPlatformMetrics = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  tenantsThisMonth: number;
  totalDocuments: number;
  tenantsByMonth: Array<{ month: string; count: number }>;
};

export type AdminSystemHealth = {
  tableCounts: Record<string, number>;
  totalMembers: number;
  activeMembers: number;
  membersByRole: Record<string, number>;
};

// ── Queries ────────────────────────────────────────────────────────────────

export async function getAdminTenants(
  adminClient: AdminClient,
  page: number,
  limit: number,
  search?: string,
  status?: string
): Promise<{ tenants: AdminTenant[]; totalCount: number }> {
  let query = adminClient.from("law_firms").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { count } = await query;
  const totalCount = count ?? 0;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let dataQuery = adminClient.from("law_firms").select("*").order("created_at", { ascending: false }).range(from, to);
  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  if (status && status !== "all") {
    dataQuery = dataQuery.eq("status", status);
  }

  const { data: firms } = await dataQuery;
  const firmIds = (firms ?? []).map((f) => f.id);

  // Get member counts per tenant
  const { data: memberCounts } = firmIds.length > 0
    ? await adminClient.from("law_firm_members").select("law_firm_id").in("law_firm_id", firmIds)
    : { data: [] };

  const countsMap = new Map<string, number>();
  for (const m of memberCounts ?? []) {
    countsMap.set(m.law_firm_id, (countsMap.get(m.law_firm_id) ?? 0) + 1);
  }

  // Get client counts per tenant
  const { data: clientCounts } = firmIds.length > 0
    ? await adminClient.from("clients").select("law_firm_id").in("law_firm_id", firmIds)
    : { data: [] };

  const clientCountsMap = new Map<string, number>();
  for (const c of clientCounts ?? []) {
    clientCountsMap.set(c.law_firm_id, (clientCountsMap.get(c.law_firm_id) ?? 0) + 1);
  }

  // Get contract counts per tenant
  const { data: contractCounts } = firmIds.length > 0
    ? await adminClient.from("contracts").select("law_firm_id").in("law_firm_id", firmIds)
    : { data: [] };

  const contractCountsMap = new Map<string, number>();
  for (const c of contractCounts ?? []) {
    contractCountsMap.set(c.law_firm_id, (contractCountsMap.get(c.law_firm_id) ?? 0) + 1);
  }

  const tenants: AdminTenant[] = (firms ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    plan: f.plan,
    status: f.status,
    email: f.email,
    phone: f.phone,
    document: f.document,
    createdAt: f.created_at,
    memberCount: countsMap.get(f.id) ?? 0,
    clientCount: clientCountsMap.get(f.id) ?? 0,
    contractCount: contractCountsMap.get(f.id) ?? 0,
    paymentCount: 0,
  }));

  return { tenants, totalCount };
}

export async function getAdminTenantDetail(
  adminClient: AdminClient,
  tenantId: string
): Promise<AdminTenantDetail | null> {
  const { data: firm } = await adminClient
    .from("law_firms")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (!firm) return null;

  const [membersResult, clientsResult, casesResult, contractsResult, installmentsResult, paymentsResult, docsResult, logsResult] = await Promise.all([
    adminClient.from("law_firm_members").select("id, name, email, role, status, last_access_at").eq("law_firm_id", tenantId).order("created_at"),
    adminClient.from("clients").select("id", { count: "exact", head: true }).eq("law_firm_id", tenantId),
    adminClient.from("legal_cases").select("id", { count: "exact", head: true }).eq("law_firm_id", tenantId),
    adminClient.from("contracts").select("id, total_amount_cents", { count: "exact" }).eq("law_firm_id", tenantId),
    adminClient.from("installments").select("final_amount_cents, paid_amount_cents, status").eq("law_firm_id", tenantId),
    adminClient.from("payments").select("id", { count: "exact", head: true }).eq("law_firm_id", tenantId),
    adminClient.from("documents").select("id", { count: "exact", head: true }).eq("law_firm_id", tenantId),
    adminClient.from("audit_logs").select("id, action, entity_type, entity_id, created_at, actor_id").eq("law_firm_id", tenantId).order("created_at", { ascending: false }).limit(50),
  ]);

  const totalPaid = (installmentsResult.data ?? []).reduce((sum, i) => sum + (i.paid_amount_cents ?? 0), 0);
  const totalPending = (installmentsResult.data ?? []).reduce((sum, i) => sum + Math.max((i.final_amount_cents ?? 0) - (i.paid_amount_cents ?? 0), 0), 0);

  // Get actor names for logs
  const actorIds = [...new Set((logsResult.data ?? []).map((l) => l.actor_id).filter(Boolean))];
  const { data: actorMembers } = actorIds.length > 0
    ? await adminClient.from("law_firm_members").select("id, name").in("id", actorIds)
    : { data: [] };
  const actorNames = new Map((actorMembers ?? []).map((m) => [m.id, m.name]));

  return {
    id: firm.id,
    name: firm.name,
    slug: firm.slug,
    plan: firm.plan,
    status: firm.status,
    email: firm.email,
    phone: firm.phone,
    document: firm.document,
    createdAt: firm.created_at,
    address: firm.address,
    settings: firm.settings,
    memberCount: (membersResult.data ?? []).length,
    clientCount: clientsResult.count ?? 0,
    contractCount: contractsResult.count ?? 0,
    legalCaseCount: casesResult.count ?? 0,
    installmentCount: installmentsResult.data?.length ?? 0,
    paymentCount: paymentsResult.count ?? 0,
    totalPaidCents: totalPaid,
    totalPendingCents: totalPending,
    members: (membersResult.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status,
      lastAccessAt: m.last_access_at,
    })),
    recentLogs: (logsResult.data ?? []).map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      createdAt: l.created_at,
      actorName: actorNames.get(l.actor_id) ?? null,
    })),
  };
}

export async function getAdminUsers(
  adminClient: AdminClient,
  page: number,
  limit: number,
  search?: string
): Promise<{ users: AdminUser[]; totalCount: number }> {
  // Get all distinct user_ids from law_firm_members
  const { data: allMembers } = await adminClient
    .from("law_firm_members")
    .select("user_id, law_firm_id, name, email, role, status");

  // Group by user_id
  const userMap = new Map<string, AdminUser>();
  for (const m of allMembers ?? []) {
    if (!userMap.has(m.user_id)) {
      userMap.set(m.user_id, {
        id: m.user_id,
        email: m.email,
        createdAt: "",
        lastSignInAt: null,
        emailConfirmedAt: null,
        membershipCount: 0,
        memberships: [],
      });
    }
    const user = userMap.get(m.user_id)!;
    user.membershipCount++;
    user.memberships.push({
      lawFirmId: m.law_firm_id,
      lawFirmName: "", // will be filled below
      role: m.role,
      status: m.status,
    });
  }

  // Fill law firm names
  const firmIds = [...new Set((allMembers ?? []).map((m) => m.law_firm_id))];
  const { data: firms } = firmIds.length > 0
    ? await adminClient.from("law_firms").select("id, name").in("id", firmIds)
    : { data: [] };
  const firmNames = new Map((firms ?? []).map((f) => [f.id, f.name]));

  for (const user of userMap.values()) {
    for (const mem of user.memberships) {
      mem.lawFirmName = firmNames.get(mem.lawFirmId) ?? "Escritório";
    }
  }

  // Filter by search
  let users = [...userMap.values()];
  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u) => u.email.toLowerCase().includes(q) || u.memberships.some((m) => m.lawFirmName.toLowerCase().includes(q)));
  }

  const totalCount = users.length;
  const from = (page - 1) * limit;
  const paginatedUsers = users.slice(from, from + limit);

  return { users: paginatedUsers, totalCount };
}

export async function getAdminUserDetail(
  adminClient: AdminClient,
  userId: string
): Promise<AdminUser | null> {
  const { data: memberships } = await adminClient
    .from("law_firm_members")
    .select("user_id, law_firm_id, name, email, role, status, last_access_at, created_at")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return null;

  const first = memberships[0];
  const firmIds = [...new Set(memberships.map((m) => m.law_firm_id))];
  const { data: firms } = await adminClient.from("law_firms").select("id, name").in("id", firmIds);
  const firmNames = new Map((firms ?? []).map((f) => [f.id, f.name]));

  return {
    id: userId,
    email: first.email,
    createdAt: first.created_at,
    lastSignInAt: null,
    emailConfirmedAt: null,
    membershipCount: memberships.length,
    memberships: memberships.map((m) => ({
      lawFirmId: m.law_firm_id,
      lawFirmName: firmNames.get(m.law_firm_id) ?? "Escritório",
      role: m.role,
      status: m.status,
    })),
  };
}

export async function getAdminAuditLogs(
  adminClient: AdminClient,
  page: number,
  limit: number,
  filters?: { lawFirmId?: string; action?: string; dateFrom?: string; dateTo?: string }
): Promise<{ logs: AdminAuditLog[]; totalCount: number }> {
  let countQuery = adminClient.from("audit_logs").select("id", { count: "exact", head: true });
  let query = adminClient.from("audit_logs").select("id, law_firm_id, action, entity_type, entity_id, metadata, created_at, actor_id").order("created_at", { ascending: false });

  if (filters?.lawFirmId) {
    countQuery = countQuery.eq("law_firm_id", filters.lawFirmId);
    query = query.eq("law_firm_id", filters.lawFirmId);
  }
  if (filters?.action) {
    countQuery = countQuery.eq("action", filters.action);
    query = query.eq("action", filters.action);
  }
  if (filters?.dateFrom) {
    countQuery = countQuery.gte("created_at", `${filters.dateFrom}T00:00:00`);
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters?.dateTo) {
    countQuery = countQuery.lte("created_at", `${filters.dateTo}T23:59:59`);
    query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
  }

  const { count } = await countQuery;
  const totalCount = count ?? 0;

  const from = (page - 1) * limit;
  const { data: logs } = await query.range(from, from + limit - 1);

  // Get firm names and actor names
  const firmIds = [...new Set((logs ?? []).map((l) => l.law_firm_id))];
  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))];

  const [firmsResult, actorsResult] = await Promise.all([
    firmIds.length > 0 ? adminClient.from("law_firms").select("id, name").in("id", firmIds) : { data: [] },
    actorIds.length > 0 ? adminClient.from("law_firm_members").select("id, name").in("id", actorIds) : { data: [] },
  ]);

  const firmNames = new Map((firmsResult.data ?? []).map((f) => [f.id, f.name]));
  const actorNames = new Map((actorsResult.data ?? []).map((a) => [a.id, a.name]));

  const result: AdminAuditLog[] = (logs ?? []).map((l) => ({
    id: l.id,
    lawFirmId: l.law_firm_id,
    lawFirmName: firmNames.get(l.law_firm_id) ?? null,
    actorName: actorNames.get(l.actor_id) ?? null,
    action: l.action,
    entityType: l.entity_type,
    entityId: l.entity_id,
    metadata: l.metadata,
    createdAt: l.created_at,
  }));

  return { logs: result, totalCount };
}

export async function getAdminPlatformMetrics(
  adminClient: AdminClient
): Promise<AdminPlatformMetrics> {
  const [firmsResult, membersResult, docsResult] = await Promise.all([
    adminClient.from("law_firms").select("id, status, created_at"),
    adminClient.from("law_firm_members").select("id"),
    adminClient.from("documents").select("id", { count: "exact", head: true }),
  ]);

  const firms = firmsResult.data ?? [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const tenantsByMonth: Array<{ month: string; count: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = firms.filter((f) => f.created_at?.startsWith(monthKey)).length;
    tenantsByMonth.push({ month: monthKey, count });
  }

  return {
    totalTenants: firms.length,
    activeTenants: firms.filter((f) => f.status === "ativo").length,
    suspendedTenants: firms.filter((f) => f.status === "suspenso").length,
    totalUsers: (membersResult.data ?? []).length,
    tenantsThisMonth: firms.filter((f) => f.created_at?.startsWith(thisMonth)).length,
    totalDocuments: docsResult.count ?? 0,
    tenantsByMonth,
  };
}

export async function getAdminSystemHealth(
  adminClient: AdminClient
): Promise<AdminSystemHealth> {
  const tables = [
    "clients", "leads", "legal_cases", "contracts", "installments",
    "payments", "expenses", "deadlines", "tasks", "appointments",
    "documents", "notifications", "audit_logs", "law_firms", "law_firm_members",
  ];

  const counts: Record<string, number> = {};
  const queries = tables.map(async (table) => {
    const { count } = await adminClient.from(table).select("id", { count: "exact", head: true });
    counts[table] = count ?? 0;
  });
  await Promise.all(queries);

  const { data: members } = await adminClient.from("law_firm_members").select("role, status");
  const membersList = members ?? [];
  const membersByRole: Record<string, number> = {};
  for (const m of membersList) {
    membersByRole[m.role] = (membersByRole[m.role] ?? 0) + 1;
  }

  return {
    tableCounts: counts,
    totalMembers: membersList.length,
    activeMembers: membersList.filter((m) => m.status === "ativo").length,
    membersByRole,
  };
}
