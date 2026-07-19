import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type ActivityEvent = {
  id: string;
  lawFirmId: string;
  actorId: string | null;
  actorName: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type ActivityEventRow = {
  id: string;
  law_firm_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type GetActivityEventsOptions = {
  entityType?: string;
  entityId?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
};

function mapRowToEvent(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    lawFirmId: row.law_firm_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function getActivityEvents(
  lawFirmId: string,
  options: GetActivityEventsOptions,
): Promise<{ events: ActivityEvent[]; totalCount: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { events: [], totalCount: 0 };

  const selectColumns = "id, law_firm_id, actor_id, actor_name, event_type, entity_type, entity_id, entity_title, description, metadata, created_at";
  const safeLimit = options.limit;
  const safePage = options.page;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countQuery: any = supabase
    .from("activity_events")
    .select(selectColumns, { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataQuery: any = supabase
    .from("activity_events")
    .select(selectColumns)
    .eq("law_firm_id", lawFirmId);

  if (options.entityType) {
    countQuery = countQuery.eq("entity_type", options.entityType);
    dataQuery = dataQuery.eq("entity_type", options.entityType);
  }
  if (options.entityId) {
    countQuery = countQuery.eq("entity_id", options.entityId);
    dataQuery = dataQuery.eq("entity_id", options.entityId);
  }
  if (options.eventType) {
    countQuery = countQuery.eq("event_type", options.eventType);
    dataQuery = dataQuery.eq("event_type", options.eventType);
  }
  if (options.dateFrom) {
    countQuery = countQuery.gte("created_at", options.dateFrom);
    dataQuery = dataQuery.gte("created_at", options.dateFrom);
  }
  if (options.dateTo) {
    countQuery = countQuery.lte("created_at", options.dateTo);
    dataQuery = dataQuery.lte("created_at", options.dateTo);
  }

  const [{ count }, { data, error }] = await Promise.all([
    countQuery as Promise<{ count: number | null; error: Error | null }>,
    dataQuery.order("created_at", { ascending: false }).range(from, to) as Promise<{ data: ActivityEventRow[] | null; error: Error | null }>,
  ]);

  if (error) throw error;

  const rows = data ?? [];
  const events = rows.map(mapRowToEvent);

  return { events, totalCount: count ?? 0 };
}

type LogActivityEventParams = {
  lawFirmId: string;
  actorId: string | null;
  actorName: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export async function logActivityEvent(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  params: LogActivityEventParams,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("activity_events").insert({
    law_firm_id: params.lawFirmId,
    actor_id: params.actorId,
    actor_name: params.actorName,
    event_type: params.eventType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_title: params.entityTitle ?? null,
    description: params.description ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });

  if (error) throw error;
}
