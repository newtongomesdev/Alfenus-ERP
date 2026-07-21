/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient } from "@/lib/supabase/server";

// ── Tipos ───────────────────────────────────────────────────────────────────

type SupportNotificationInsert = {
  law_firm_id: string;
  user_id: string;
  ticket_id?: string | null;
  type: string;
  title: string;
  message: string;
  is_read?: boolean;
};

// ── Helper interno ──────────────────────────────────────────────────────────

async function insertNotification(
  client: any,
  data: SupportNotificationInsert,
): Promise<void> {
  await client.from("support_notifications").insert({
    ...data,
    is_read: data.is_read ?? false,
    created_at: new Date().toISOString(),
  });
}

/**
 * Retorna todos os IDs dos administradores (proprietário + administrador) do tenant.
 */
async function getTenantAdminIds(
  client: any,
  lawFirmId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("law_firm_members")
    .select("user_id")
    .eq("law_firm_id", lawFirmId)
    .in("role", ["proprietario", "administrador"])
    .eq("status", "ativo");

  if (error || !data) return [];
  return data.map((row: { user_id: string }) => row.user_id);
}

// ── Funções públicas ────────────────────────────────────────────────────────

/**
 * Notifica administradores do tenant quando uma nova solicitação de acesso é criada.
 */
export async function notifyAccessRequested(
  lawFirmId: string,
  requestId: string,
  operatorName: string,
  ticketProtocol: string,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const adminIds = await getTenantAdminIds(supabase, lawFirmId);
  if (adminIds.length === 0) return;

  for (const userId of adminIds) {
    await insertNotification(supabase, {
      law_firm_id: lawFirmId,
      user_id: userId,
      ticket_id: null,
      type: "acesso_assistido_solicitado",
      title: "Nova solicitação de acesso assistido",
      message: `${operatorName} solicitou acesso assistido para o ticket ${ticketProtocol}.`,
    });
  }
}

/**
 * Notifica o operador quando sua solicitação de acesso é aprovada.
 */
export async function notifyAccessApproved(
  lawFirmId: string,
  operatorId: string,
  requestId: string,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await insertNotification(supabase, {
    law_firm_id: lawFirmId,
    user_id: operatorId,
    ticket_id: null,
    type: "acesso_assistido_aprovado",
    title: "Solicitação de acesso aprovada",
    message: "Sua solicitação de acesso assistido foi aprovada. Você pode iniciar a sessão.",
  });
}

/**
 * Notifica o operador quando sua solicitação de acesso é recusada.
 */
export async function notifyAccessRejected(
  lawFirmId: string,
  operatorId: string,
  requestId: string,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await insertNotification(supabase, {
    law_firm_id: lawFirmId,
    user_id: operatorId,
    ticket_id: null,
    type: "acesso_assistido_recusado",
    title: "Solicitação de acesso recusada",
    message: "Sua solicitação de acesso assistido foi recusada.",
  });
}

/**
 * Notifica o operador quando sua sessão de acesso é revogada pelo tenant.
 */
export async function notifyAccessRevoked(
  lawFirmId: string,
  operatorId: string,
  sessionId: string,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await insertNotification(supabase, {
    law_firm_id: lawFirmId,
    user_id: operatorId,
    ticket_id: null,
    type: "acesso_assistido_revogado",
    title: "Sessão de acesso revogada",
    message: "Sua sessão de acesso assistido foi revogada pelo administrador.",
  });
}

/**
 * Notifica operador e administradores quando uma sessão está prestes a expirar.
 */
export async function notifyAccessExpiring(
  lawFirmId: string,
  operatorId: string,
  sessionId: string,
  minutesLeft: number,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const timeLabel = minutesLeft <= 1 ? "1 minuto" : `${minutesLeft} minutos`;

  // Notificar o operador
  await insertNotification(supabase, {
    law_firm_id: lawFirmId,
    user_id: operatorId,
    ticket_id: null,
    type: "acesso_assistido_expirando",
    title: "Sessão de acesso expirando",
    message: `Sua sessão de acesso assistido expira em ${timeLabel}.`,
  });

  // Notificar administradores
  const adminIds = await getTenantAdminIds(supabase, lawFirmId);
  for (const userId of adminIds) {
    await insertNotification(supabase, {
      law_firm_id: lawFirmId,
      user_id: userId,
      ticket_id: null,
      type: "acesso_assistido_expirando",
      title: "Sessão de acesso expirando",
      message: `Uma sessão de acesso assistido expira em ${timeLabel}.`,
    });
  }
}
