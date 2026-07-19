import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AppointmentItem = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
};

type RawAppointment = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export async function getAppointments(lawFirmId: string): Promise<AppointmentItem[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select("id, title, type, starts_at, ends_at, status")
    .eq("law_firm_id", lawFirmId)
    .order("starts_at", { ascending: true })
    .range(0, 9999);

  if (error) throw error;

  return ((data ?? []) as RawAppointment[]).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  }));
}
