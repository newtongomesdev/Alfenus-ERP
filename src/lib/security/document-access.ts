import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

export type DocumentAccessAction = "view" | "download" | "edit" | "share";

export type DocumentAccessLog = {
  id: string;
  lawFirmId: string;
  userId: string;
  documentId: string;
  action: DocumentAccessAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DocumentAccessStats = {
  mostAccessedDocs: { documentId: string; accessCount: number }[];
  activeUsers: { userId: string; accessCount: number }[];
  totalAccesses: number;
  accessesByAction: Record<DocumentAccessAction, number>;
};

/**
 * Registra um acesso a um documento (visualização, download, edição ou compartilhamento).
 * Usa o admin client para bypassar RLS e garantir inserção consistente.
 */
export async function logDocumentAccess(
  lawFirmId: string,
  userId: string,
  documentId: string,
  action: DocumentAccessAction,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) return;

  await adminClient.from("document_access_logs").insert({
    law_firm_id: lawFirmId,
    user_id: userId,
    document_id: documentId,
    action,
    ip_address: metadata?.ipAddress ?? null,
    user_agent: metadata?.userAgent ?? null,
    metadata: metadata?.details ?? {},
  });
}

/**
 * Recupera logs de acesso a documentos de um escritório.
 * Opcionalmente filtra por documentId e limita a quantidade.
 */
export async function getDocumentAccessLogs(
  lawFirmId: string,
  documentId?: string,
  limit: number = 100,
): Promise<DocumentAccessLog[]> {
  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) return [];

  let query = adminClient
    .from("document_access_logs")
    .select("*")
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data } = await query;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    documentId: row.document_id,
    action: row.action as DocumentAccessAction,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

/**
 * Retorna estatísticas de acesso a documentos para um escritório.
 * Inclui documentos mais acessados, usuários mais ativos e contagem por ação.
 */
export async function getDocumentAccessStats(
  lawFirmId: string,
): Promise<DocumentAccessStats> {
  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!adminClient) {
    return {
      mostAccessedDocs: [],
      activeUsers: [],
      totalAccesses: 0,
      accessesByAction: { view: 0, download: 0, edit: 0, share: 0 },
    };
  }

  const { data } = await adminClient
    .from("document_access_logs")
    .select("document_id, user_id, action")
    .eq("law_firm_id", lawFirmId);

  const logs = (data ?? []) as { document_id: string; user_id: string; action: string }[];

  // Documentos mais acessados
  const docCounts = new Map<string, number>();
  for (const log of logs) {
    docCounts.set(log.document_id, (docCounts.get(log.document_id) ?? 0) + 1);
  }
  const mostAccessedDocs = [...docCounts.entries()]
    .map(([documentId, accessCount]) => ({ documentId, accessCount }))
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10);

  // Usuários mais ativos
  const userCounts = new Map<string, number>();
  for (const log of logs) {
    userCounts.set(log.user_id, (userCounts.get(log.user_id) ?? 0) + 1);
  }
  const activeUsers = [...userCounts.entries()]
    .map(([userId, accessCount]) => ({ userId, accessCount }))
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10);

  // Contagem por ação
  const accessesByAction: Record<DocumentAccessAction, number> = {
    view: 0,
    download: 0,
    edit: 0,
    share: 0,
  };
  for (const log of logs) {
    if (log.action in accessesByAction) {
      accessesByAction[log.action as DocumentAccessAction]++;
    }
  }

  return {
    mostAccessedDocs,
    activeUsers,
    totalAccesses: logs.length,
    accessesByAction,
  };
}
