import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/notifications/queries";

// ---------------------------------------------------------------------------
// All available notification types in the system
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPES = [
  { type: "deadline_approaching", label: "Prazos próximos do vencimento" },
  { type: "deadline_overdue", label: "Prazos vencidos" },
  { type: "payment_received", label: "Pagamentos recebidos" },
  { type: "payment_overdue", label: "Pagamentos em atraso" },
  { type: "task_assigned", label: "Tarefas atribuídas" },
  { type: "task_completed", label: "Tarefas concluídas" },
  { type: "case_status_changed", label: "Alteração de status de processo" },
  { type: "mention", label: "Menções em comentários" },
  { type: "document_uploaded", label: "Novos documentos" },
  { type: "client_update", label: "Atualizações de cliente" },
];

// ---------------------------------------------------------------------------
// GET /api/notification-preferences
// Returns all notification types with enabled/disabled status
// ---------------------------------------------------------------------------

export async function GET() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 },
    );
  }

  try {
    const preferences = await getNotificationPreferences(
      context.lawFirm.id,
      context.member.id,
    );

    // Build a map of existing preferences
    const prefMap = new Map(
      preferences.map((p) => [p.notificationType, p.enabled]),
    );

    // Return all types with their enabled status (default: true)
    const result = NOTIFICATION_TYPES.map((nt) => ({
      type: nt.type,
      label: nt.label,
      enabled: prefMap.has(nt.type) ? prefMap.get(nt.type)! : true,
    }));

    return NextResponse.json({ preferences: result });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notification-preferences
// Body: { notificationType, enabled }
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 },
    );
  }

  let body: { notificationType?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const notificationType = body.notificationType?.trim() ?? "";
  const enabled = body.enabled ?? true;

  if (!notificationType) {
    return NextResponse.json(
      { error: "notificationType é obrigatório" },
      { status: 400 },
    );
  }

  // Validate type exists
  const validType = NOTIFICATION_TYPES.find(
    (nt) => nt.type === notificationType,
  );
  if (!validType) {
    return NextResponse.json(
      { error: "Tipo de notificação inválido" },
      { status: 400 },
    );
  }

  try {
    await updateNotificationPreference(
      context.lawFirm.id,
      context.member.id,
      notificationType,
      enabled,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification preference:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 },
    );
  }
}
