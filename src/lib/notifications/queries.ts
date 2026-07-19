import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type NotificationPreference = {
  id: string;
  lawFirmId: string;
  memberId: string;
  notificationType: string;
  enabled: boolean;
  createdAt: string;
};

type NotificationPreferenceRow = {
  id: string;
  law_firm_id: string;
  member_id: string;
  notification_type: string;
  enabled: boolean;
  created_at: string;
};

type NotificationRow = {
  id: string;
  law_firm_id: string;
  member_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type NotificationItem = {
  id: string;
  lawFirmId: string;
  memberId: string | null;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  archivedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type GetNotificationsOptions = {
  type?: string;
  unreadOnly?: boolean;
  archived?: boolean;
  page: number;
  limit: number;
};

function mapRowToNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    lawFirmId: row.law_firm_id,
    memberId: row.member_id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function mapRowToPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    id: row.id,
    lawFirmId: row.law_firm_id,
    memberId: row.member_id,
    notificationType: row.notification_type,
    enabled: row.enabled,
    createdAt: row.created_at,
  };
}

export async function getNotifications(
  lawFirmId: string,
  memberId: string,
  options: GetNotificationsOptions,
): Promise<{ notifications: NotificationItem[]; totalCount: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { notifications: [], totalCount: 0 };

  const selectColumns = "id, law_firm_id, member_id, type, title, body, read_at, archived_at, metadata, created_at";
  const safeLimit = options.limit;
  const safePage = options.page;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countQuery: any = supabase
    .from("notifications")
    .select(selectColumns, { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .eq("member_id", memberId)
    .is("archived_at", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataQuery: any = supabase
    .from("notifications")
    .select(selectColumns)
    .eq("law_firm_id", lawFirmId)
    .eq("member_id", memberId)
    .is("archived_at", null);

  if (options.type) {
    countQuery = countQuery.eq("type", options.type);
    dataQuery = dataQuery.eq("type", options.type);
  }
  if (options.unreadOnly) {
    countQuery = countQuery.is("read_at", null);
    dataQuery = dataQuery.is("read_at", null);
  }

  const [{ count }, { data, error }] = await Promise.all([
    countQuery as Promise<{ count: number | null; error: Error | null }>,
    dataQuery.order("created_at", { ascending: false }).range(from, to) as Promise<{ data: NotificationRow[] | null; error: Error | null }>,
  ]);

  if (error) throw error;

  const rows = data ?? [];
  const notifications = rows.map(mapRowToNotification);

  return { notifications, totalCount: count ?? 0 };
}

export async function archiveNotification(notificationId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function archiveAllNotifications(
  lawFirmId: string,
  memberId: string,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("law_firm_id", lawFirmId)
    .eq("member_id", memberId)
    .is("archived_at", null);

  if (error) throw error;
}

export async function getNotificationPreferences(
  lawFirmId: string,
  memberId: string,
): Promise<NotificationPreference[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const selectColumns = "id, law_firm_id, member_id, notification_type, enabled, created_at";

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(selectColumns)
    .eq("law_firm_id", lawFirmId)
    .eq("member_id", memberId)
    .order("notification_type", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as NotificationPreferenceRow[]).map(mapRowToPreference);
}

export async function updateNotificationPreference(
  lawFirmId: string,
  memberId: string,
  type: string,
  enabled: boolean,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        law_firm_id: lawFirmId,
        member_id: memberId,
        notification_type: type,
        enabled,
      },
      { onConflict: "law_firm_id,member_id,notification_type" },
    )
    .select("id")
    .single();

  if (error) throw error;
}

type CreateNotificationParams = {
  lawFirmId: string;
  memberId: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  params: CreateNotificationParams,
): Promise<void> {
  if (!supabase) return;

  const { data: prefData } = await supabase
    .from("notification_preferences")
    .select("id, enabled")
    .eq("law_firm_id", params.lawFirmId)
    .eq("member_id", params.memberId)
    .eq("notification_type", params.type);

  const prefs = prefData as Array<{ id: string; enabled: boolean }> | null;
  if (prefs && prefs.length > 0 && !prefs[0].enabled) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .insert({
      law_firm_id: params.lawFirmId,
      member_id: params.memberId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      metadata: (params.metadata ?? {}) as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
}
