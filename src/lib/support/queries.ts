import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TicketStatus, TicketPriority } from "./constants";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type SupportTicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignedTo?: string;
  search?: string;
};

export type SupportTicket = {
  id: string;
  law_firm_id: string;
  protocol: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category_id: string | null;
  created_by_member_id: string;
  assigned_to_member_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  creator?: { id: string; name: string; email: string } | null;
  assignee?: { id: string; name: string; email: string } | null;
  message_count?: number;
};

export type SupportMessage = {
  id: string;
  law_firm_id: string;
  ticket_id: string;
  author_member_id: string;
  content: string;
  message_type: string;
  visibility: string;
  attachment_url: string | null;
  created_at: string;
  author?: { id: string; name: string; email: string } | null;
};

export type SupportCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type SupportTicketStats = {
  open: number;
  waiting: number;
  resolved: number;
  total: number;
};

export type PlatformTicketStats = {
  total: number;
  open: number;
  waiting: number;
  resolved: number;
  cancelled: number;
  by_plan: Record<string, number>;
};

export type PaginatedResult<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getSupportTickets(
  lawFirmId: string,
  filters: SupportTicketFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<SupportTicket>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from("support_tickets")
    .select(
      "*, category:support_categories(id, name), creator:law_firm_members!support_tickets_created_by_member_id_fkey(id, name, email), assignee:law_firm_members!support_tickets_assigned_to_member_id_fkey(id, name, email)",
      { count: "exact" },
    )
    .eq("law_firm_id", lawFirmId);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.assignedTo) query = query.eq("assigned_to_member_id", filters.assignedTo);
  if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,protocol.ilike.%${filters.search}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[support/queries] getSupportTickets", error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []) as SupportTicket[],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getSupportTicketById(
  ticketId: string,
  lawFirmId: string,
): Promise<SupportTicket | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "*, category:support_categories(id, name), creator:law_firm_members!support_tickets_created_by_member_id_fkey(id, name, email), assignee:law_firm_members!support_tickets_assigned_to_member_id_fkey(id, name, email)",
    )
    .eq("id", ticketId)
    .eq("law_firm_id", lawFirmId)
    .single();

  if (error || !data) return null;
  return data as SupportTicket;
}

export async function getSupportTicketMessages(
  ticketId: string,
  lawFirmId: string,
  excludeInternal = false,
): Promise<SupportMessage[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("support_messages")
    .select("*, author:law_firm_members(id, name, email)")
    .eq("ticket_id", ticketId)
    .eq("law_firm_id", lawFirmId);

  if (excludeInternal) {
    query = query.neq("visibility", "interna");
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("[support/queries] getSupportTicketMessages", error);
    return [];
  }

  return (data ?? []) as SupportMessage[];
}

export async function getSupportCategories(): Promise<SupportCategory[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("[support/queries] getSupportCategories", error);
    return [];
  }

  return (data ?? []) as SupportCategory[];
}

export async function getSupportTicketStats(lawFirmId: string): Promise<SupportTicketStats> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { open: 0, waiting: 0, resolved: 0, total: 0 };

  const [open, waiting, resolved, total] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .eq("status", "aberto"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .in("status", ["aguardando_cliente", "aguardando_suporte"]),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId)
      .eq("status", "resolvido"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("law_firm_id", lawFirmId),
  ]);

  return {
    open: open.count ?? 0,
    waiting: waiting.count ?? 0,
    resolved: resolved.count ?? 0,
    total: total.count ?? 0,
  };
}

export async function getPlatformTicketStats(): Promise<PlatformTicketStats> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return { total: 0, open: 0, waiting: 0, resolved: 0, cancelled: 0, by_plan: {} };

  const [total, open, waiting, resolved, cancelled, byPlan] = await Promise.all([
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true }),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "aberto"),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["aguardando_cliente", "aguardando_suporte"]),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolvido"),
    adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelado"),
    adminClient
      .from("support_tickets")
      .select("law_firm_id, law_firms!inner(plan)"),
  ]);

  const planCounts: Record<string, number> = {};
  if (byPlan.data) {
    for (const row of byPlan.data) {
      const plan = (row as any).law_firms?.plan ?? "unknown";
      planCounts[plan] = (planCounts[plan] ?? 0) + 1;
    }
  }

  return {
    total: total.count ?? 0,
    open: open.count ?? 0,
    waiting: waiting.count ?? 0,
    resolved: resolved.count ?? 0,
    cancelled: cancelled.count ?? 0,
    by_plan: planCounts,
  };
}

export async function getPlatformTickets(
  filters: SupportTicketFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PaginatedResult<SupportTicket>> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  let query = adminClient
    .from("support_tickets")
    .select(
      "*, category:support_categories(id, name), creator:law_firm_members!support_tickets_created_by_member_id_fkey(id, name, email), assignee:law_firm_members!support_tickets_assigned_to_member_id_fkey(id, name, email), law_firms!inner(id, name, plan)",
      { count: "exact" },
    );

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.assignedTo) query = query.eq("assigned_to_member_id", filters.assignedTo);
  if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,protocol.ilike.%${filters.search}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[support/queries] getPlatformTickets", error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []) as SupportTicket[],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function generateProtocol(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  let seq = 1;

  if (supabase) {
    // Buscar o último protocolo do dia
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("support_tickets")
      .select("protocol")
      .like("protocol", `SUP-${datePart}-%`)
      .order("protocol", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastProtocol = data[0].protocol as string;
      const lastSeq = parseInt(lastProtocol.split("-")[2] ?? "0", 10);
      seq = lastSeq + 1;
    }
  }

  const seqStr = String(seq).padStart(4, "0");
  return `SUP-${datePart}-${seqStr}`;
}
