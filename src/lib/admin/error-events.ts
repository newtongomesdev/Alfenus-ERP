import type { SupabaseClient } from "@supabase/supabase-js";

type ErrorEventsQueryResult = {
  data: Record<string, unknown>[] | null;
  count: number | null;
  error: { message: string } | null;
};

type ErrorEventsQuery = {
  select: (columns: string, options?: { count?: "exact" }) => ErrorEventsQuery;
  not: (column: string, operator: string, value: string) => ErrorEventsQuery;
  order: (column: string, options: { ascending: boolean }) => ErrorEventsQuery;
  range: (from: number, to: number) => Promise<ErrorEventsQueryResult>;
};

export type AdminErrorEvent = {
  id: string;
  source: string;
  message: string;
  digest: string | null;
  path: string;
  method: string | null;
  routePath: string | null;
  routeType: string | null;
  createdAt: string;
};

export async function getAdminErrorEvents(adminClient: SupabaseClient, page: number, limit: number) {
  const from = (page - 1) * limit;
  const { data, count, error } = await (adminClient as unknown as { from(table: string): ErrorEventsQuery })
    .from("error_events")
    .select("id, source, message, digest, path, method, route_path, route_type, created_at", { count: "exact" })
    .not("message", "like", "Fetch HTTP 3%")
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(`Falha ao carregar logs de erro: ${error.message}`);

  return {
    events: (data ?? []).map((event: Record<string, unknown>): AdminErrorEvent => ({
      id: String(event.id),
      source: String(event.source),
      message: String(event.message),
      digest: event.digest ? String(event.digest) : null,
      path: String(event.path),
      method: event.method ? String(event.method) : null,
      routePath: event.route_path ? String(event.route_path) : null,
      routeType: event.route_type ? String(event.route_type) : null,
      createdAt: String(event.created_at),
    })),
    totalCount: count ?? 0,
  };
}
