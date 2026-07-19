"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import {
  archiveNotification,
  archiveAllNotifications,
  updateNotificationPreference,
} from "@/lib/notifications/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type NotificationClient = {
  from(table: "notifications"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
      };
    };
  };
};

export async function markNotificationReadAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) redirect("/notificacoes?erro=notificacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/notificacoes?erro=ambiente");
  const client = supabase as unknown as NotificationClient;
  const { error } = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", notificationId);
  if (error) redirect("/notificacoes?erro=atualizacao");
  revalidatePath("/notificacoes");
  redirect("/notificacoes?lida=1");
}

export async function archiveNotificationAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");

  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) redirect("/notificacoes?erro=notificacao");

  try {
    await archiveNotification(notificationId);
  } catch {
    redirect("/notificacoes?erro=arquivar");
  }

  revalidatePath("/notificacoes");
  redirect("/notificacoes?arquivada=1");
}

export async function archiveAllNotificationsAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");

  try {
    await archiveAllNotifications(context.lawFirm.id, context.member.id);
  } catch {
    redirect("/notificacoes?erro=arquivar");
  }

  revalidatePath("/notificacoes");
  redirect("/notificacoes?arquivadas=1");
}

export async function updateNotificationPreferenceAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");

  const notificationType = String(formData.get("notificationType") ?? "").trim();
  const enabled = formData.get("enabled") !== "false";

  if (!notificationType) redirect("/notificacoes?erro=validacao");

  try {
    await updateNotificationPreference(
      context.lawFirm.id,
      context.member.id,
      notificationType,
      enabled,
    );
  } catch {
    redirect("/notificacoes?erro=preferencia");
  }

  revalidatePath("/notificacoes");
  revalidatePath("/configuracoes");
  redirect("/notificacoes?preferencia=1");
}
