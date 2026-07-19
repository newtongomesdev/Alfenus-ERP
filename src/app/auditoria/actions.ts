"use server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuditLogEntry = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  description: string | null;
  actorName: string | null;
  metadata: Record<string, any>;
  createdAt: string;
};

export type AuditFilters = {
  eventType?: string;
  entityType?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

// Listar logs de auditoria do tenant
export async function getAuditLogs(filters: AuditFilters = {}, page = 1, pageSize = 50): Promise<{ items: AuditLogEntry[]; total: number }> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Somente administradores podem ver auditoria");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("activity_events")
    .select("id, event_type, entity_type, entity_id, entity_title, description, actor_name, metadata, created_at, law_firm_id")
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false });

  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59");
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(`entity_title.ilike.%${term}%,description.ilike.%${term}%,actor_name.ilike.%${term}%`);
  }

  // Contar total
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm.id);

  // Paginar
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;

  return {
    items: ((data as any[]) ?? []).map((r) => ({
      id: r.id,
      eventType: r.event_type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityTitle: r.entity_title,
      description: r.description,
      actorName: r.actor_name,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}

// Estatísticas de auditoria
export async function getAuditStats(): Promise<{
  totalEvents: number;
  todayEvents: number;
  topActions: { action: string; count: number }[];
  topEntities: { entity: string; count: number }[];
}> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const firmId = context.lawFirm.id;
  const today = new Date().toISOString().split("T")[0];

  const [totalRes, todayRes, eventsRes] = await Promise.all([
    supabase.from("activity_events").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId),
    supabase.from("activity_events").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId).gte("created_at", today),
    supabase.from("activity_events").select("event_type, entity_type").eq("law_firm_id", firmId).order("created_at", { ascending: false }).limit(200),
  ]);

  const events = ((eventsRes.data as any[]) ?? []);
  const actionCounts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};

  events.forEach((e) => {
    actionCounts[e.event_type] = (actionCounts[e.event_type] ?? 0) + 1;
    entityCounts[e.entity_type] = (entityCounts[e.entity_type] ?? 0) + 1;
  });

  return {
    totalEvents: totalRes.count ?? 0,
    todayEvents: todayRes.count ?? 0,
    topActions: Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topEntities: Object.entries(entityCounts)
      .map(([entity, count]) => ({ entity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
