/**
 * Serviço de notificações de segurança.
 * Cria, lista e gerencia notificações de eventos de segurança
 * para os usuários da escritoria.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "mfa_ativado"
  | "mfa_desativado"
  | "nova_sessao"
  | "sessao_revogada"
  | "atividade_suspeita"
  | "periodo_carencia_terminando"
  | "senha_alterada"
  | "recuperacao_conta"
  | "dispositivo_confianca"
  | "ip_bloqueado"
  | "incidente_criado";

export type SecurityNotification = {
  id: string;
  userId: string;
  lawFirmId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  read: boolean;
  deletedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Cria uma nova notificação de segurança.
 */
export async function createSecurityNotification(
  userId: string,
  lawFirmId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<SecurityNotification | null> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return null;

  const { data, error } = await client
    .from("security_notifications" as any)
    .insert({
      user_id: userId,
      law_firm_id: lawFirmId,
      type,
      title,
      message,
      metadata: metadata ?? null,
      read: false,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    lawFirmId: data.law_firm_id,
    type: data.type as NotificationType,
    title: data.title,
    message: data.message,
    metadata: data.metadata,
    read: data.read,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
  };
}

/**
 * Lista notificações de segurança com filtros e paginação.
 */
export async function getSecurityNotifications(
  userId: string,
  lawFirmId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<SecurityNotification[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  let query = client
    .from("security_notifications" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .is("deleted_at", null);

  if (options?.unreadOnly) {
    query = query.eq("read", false);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 20) - 1
    );

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    lawFirmId: row.law_firm_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    metadata: row.metadata,
    read: row.read,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  }));
}

/**
 * Marca uma notificação específica como lida.
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const { error } = await client
    .from("security_notifications" as any)
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
}

/**
 * Marca todas as notificações de um usuário como lidas.
 */
export async function markAllAsRead(
  userId: string,
  lawFirmId: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const { error } = await client
    .from("security_notifications" as any)
    .update({ read: true })
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .eq("read", false)
    .is("deleted_at", null);

  if (error) throw error;
}

/**
 * Retorna o número de notificações não lidas de um usuário.
 */
export async function getUnreadCount(
  userId: string,
  lawFirmId: string
): Promise<number> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return 0;

  const { count, error } = await client
    .from("security_notifications" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .eq("read", false)
    .is("deleted_at", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Exclui uma notificação (soft delete).
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  const { error } = await client
    .from("security_notifications" as any)
    .update({ deleted_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Helpers de conveniência — notificações pré-definidas
// ---------------------------------------------------------------------------

/**
 * Notifica o usuário que seu MFA foi ativado.
 */
export async function notifyMfaActivated(
  userId: string,
  lawFirmId: string
): Promise<SecurityNotification | null> {
  return createSecurityNotification(
    userId,
    lawFirmId,
    "mfa_ativado",
    "MFA Ativado",
    "A autenticacao de dois fatores foi ativada na sua conta."
  );
}

/**
 * Notifica o usuário que seu MFA foi desativado.
 */
export async function notifyMfaDeactivated(
  userId: string,
  lawFirmId: string
): Promise<SecurityNotification | null> {
  return createSecurityNotification(
    userId,
    lawFirmId,
    "mfa_desativado",
    "MFA Desativado",
    "A autenticacao de dois fatores foi desativada na sua conta."
  );
}

/**
 * Notifica o usuário sobre uma nova sessão criada.
 */
export async function notifyNewSession(
  userId: string,
  lawFirmId: string,
  metadata?: { ip?: string; userAgent?: string; timestamp?: string }
): Promise<SecurityNotification | null> {
  return createSecurityNotification(
    userId,
    lawFirmId,
    "nova_sessao",
    "Nova Sessao Iniciada",
    "Uma nova sessao foi iniciada na sua conta.",
    metadata
  );
}

/**
 * Notifica o usuário que uma sessão foi revogada.
 */
export async function notifySessionRevoked(
  userId: string,
  lawFirmId: string,
  metadata?: { sessionId?: string; reason?: string }
): Promise<SecurityNotification | null> {
  return createSecurityNotification(
    userId,
    lawFirmId,
    "sessao_revogada",
    "Sessao Encerrada",
    "Uma sessao foi encerrada por motivos de seguranca.",
    metadata
  );
}

/**
 * Notifica o usuário sobre atividade suspeita detectada.
 */
export async function notifyUnusualActivity(
  userId: string,
  lawFirmId: string,
  metadata?: { description?: string; riskLevel?: string }
): Promise<SecurityNotification | null> {
  return createSecurityNotification(
    userId,
    lawFirmId,
    "atividade_suspeita",
    "Atividade Suspeita Detectada",
    "Uma atividade incomum foi detectada na sua conta. Verifique suas sessoes e dispositivos.",
    metadata
  );
}

/**
 * Notifica o usuário que o período de carência do MFA está terminando.
 */
export async function notifyGracePeriodEnding(
  userId: string,
  lawFirmId: string,
  metadata?: { daysRemaining?: number; deadline?: string }
): Promise<SecurityNotification | null> {
  const daysText = metadata?.daysRemaining
    ? `${metadata.daysRemaining} dia(s)`
    : "breve";

  return createSecurityNotification(
    userId,
    lawFirmId,
    "periodo_carencia_terminando",
    "Periodo de Carencia Terminando",
    `O periodo de carencia para configurar MFA termina em ${daysText}. Configure o MFA para evitar o bloqueio da conta.`,
    metadata
  );
}
