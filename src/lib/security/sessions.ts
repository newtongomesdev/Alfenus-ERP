import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";

export type ActiveSession = {
  id: string;
  userId: string;
  memberId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
};

export async function getActiveSessions(context: AppContext): Promise<ActiveSession[]> {
  if (!context.lawFirm) return [];
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("active_sessions")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .order("last_active_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
  }));
}

export async function getSessionStats(context: AppContext): Promise<{
  totalSessions: number;
  uniqueUsers: number;
  recentSessions: number;
}> {
  if (!context.lawFirm) return { totalSessions: 0, uniqueUsers: 0, recentSessions: 0 };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { totalSessions: 0, uniqueUsers: 0, recentSessions: 0 };
  const { data } = await supabase
    .from("active_sessions")
    .select("user_id, created_at")
    .eq("law_firm_id", context.lawFirm.id);

  const sessions = data ?? [];
  const uniqueUsers = new Set(sessions.map((s) => s.user_id)).size;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentSessions = sessions.filter((s) => s.created_at > oneDayAgo).length;

  return {
    totalSessions: sessions.length,
    uniqueUsers,
    recentSessions,
  };
}

export async function terminateSession(
  context: AppContext,
  sessionId: string
): Promise<void> {
  if (!context.lawFirm) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("active_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("law_firm_id", context.lawFirm.id);
}

export async function terminateAllSessions(
  context: AppContext,
  excludeUserId?: string
): Promise<void> {
  if (!context.lawFirm) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  let query = supabase
    .from("active_sessions")
    .delete()
    .eq("law_firm_id", context.lawFirm.id);

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  await query;
}
