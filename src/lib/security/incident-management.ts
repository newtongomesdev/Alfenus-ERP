import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

export type IncidentSeverity = "baixa" | "media" | "alta" | "critica";

export type IncidentStatus = "aberto" | "investigando" | "resolvido" | "fechado";

const VALID_SEVERITIES: IncidentSeverity[] = ["baixa", "media", "alta", "critica"];
const VALID_STATUSES: IncidentStatus[] = ["aberto", "investigando", "resolvido", "fechado"];

/** Transições de status válidas para um incidente. */
export const VALID_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  aberto: ["investigando", "resolvido", "fechado"],
  investigando: ["resolvido", "fechado", "aberto"],
  resolvido: ["fechado", "investigando"],
  fechado: [],
};

export type SecurityIncident = {
  id: string;
  lawFirmId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SecurityIncidentEvent = {
  id: string;
  incidentId: string;
  lawFirmId: string;
  userId: string;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  note: string | null;
  createdAt: string;
};

export type IncidentFilters = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  page?: number;
  pageSize?: number;
};

export type PaginatedIncidents = {
  items: SecurityIncident[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Verifica se uma transição de status é válida.
 */
export function isValidStatusTransition(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Cria um novo incidente de segurança.
 */
export async function createIncident(
  lawFirmId: string,
  reportedBy: string,
  title: string,
  description: string,
  severity: IncidentSeverity,
): Promise<SecurityIncident | null> {
  if (!VALID_SEVERITIES.includes(severity)) {
    throw new Error(`Severidade inválida: ${severity}`);
  }

  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) return null;

  const { data, error } = await adminClient
    .from("security_incidents")
    .insert({
      law_firm_id: lawFirmId,
      title,
      description,
      severity,
      status: "aberto",
      reported_by: reportedBy,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  // Registra o evento inicial na trilha de auditoria
  await adminClient.from("security_incident_events").insert({
    incident_id: data.id,
    law_firm_id: lawFirmId,
    user_id: reportedBy,
    from_status: null,
    to_status: "aberto",
    note: "Incidente criado",
  });

  return {
    id: data.id,
    lawFirmId: data.law_firm_id,
    title: data.title,
    description: data.description,
    severity: data.severity as IncidentSeverity,
    status: data.status as IncidentStatus,
    reportedBy: data.reported_by,
    assignedTo: data.assigned_to,
    resolutionNotes: data.resolution_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Atualiza o status de um incidente com trilha de auditoria.
 * Lança erro se a transição não for válida.
 */
export async function updateIncidentStatus(
  incidentId: string,
  newStatus: IncidentStatus,
  userId: string,
  note?: string,
): Promise<void> {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Status inválido: ${newStatus}`);
  }

  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) return;

  // Busca o status atual
  const { data: incident, error: fetchError } = await adminClient
    .from("security_incidents")
    .select("status, law_firm_id")
    .eq("id", incidentId)
    .single();

  if (fetchError || !incident) {
    throw new Error("Incidente não encontrado.");
  }

  const currentStatus = incident.status as IncidentStatus;

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(
      `Transição inválida: ${currentStatus} → ${newStatus}. Transições permitidas: ${VALID_STATUS_TRANSITIONS[currentStatus].join(", ")}`,
    );
  }

  // Atualiza o incidente
  const { error: updateError } = await adminClient
    .from("security_incidents")
    .update({ status: newStatus })
    .eq("id", incidentId);

  if (updateError) throw updateError;

  // Registra evento na trilha de auditoria
  await adminClient.from("security_incident_events").insert({
    incident_id: incidentId,
    law_firm_id: incident.law_firm_id,
    user_id: userId,
    from_status: currentStatus,
    to_status: newStatus,
    note: note ?? null,
  });
}

/**
 * Lista incidentes de segurança com filtros e paginação.
 */
export async function getIncidents(
  lawFirmId: string,
  filters?: IncidentFilters,
): Promise<PaginatedIncidents> {
  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("security_incidents")
    .select("*", { count: "exact" })
    .eq("law_firm_id", lawFirmId);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.severity) {
    query = query.eq("severity", filters.severity);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: (data ?? []).map((row: any) => ({
      id: row.id,
      lawFirmId: row.law_firm_id,
      title: row.title,
      description: row.description,
      severity: row.severity as IncidentSeverity,
      status: row.status as IncidentStatus,
      reportedBy: row.reported_by,
      assignedTo: row.assigned_to,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}
