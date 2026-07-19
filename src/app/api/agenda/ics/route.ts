import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line: string) {
  const chunks = [];
  let remaining = line;
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

export async function GET() {
  const context = await getAppContext();
  if (context.status === "signed-out") return new Response("Unauthorized", { status: 401 });
  if (context.status !== "ready" || !context.member || !context.lawFirm) return new Response("Tenant not found", { status: 403 });

  const supabase = await getSupabaseServerClient();
  if (!supabase) return new Response("Supabase not configured", { status: 500 });

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 12);

  const [appointmentsResult, deadlinesResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, title, type, starts_at, ends_at, status")
      .eq("law_firm_id", context.lawFirm.id)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", end.toISOString())
      .neq("status", "cancelado")
      .order("starts_at"),
    supabase
      .from("deadlines")
      .select("id, title, type, due_date, due_time, status, description")
      .eq("law_firm_id", context.lawFirm.id)
      .gte("due_date", now.toISOString().slice(0, 10))
      .lte("due_date", end.toISOString().slice(0, 10))
      .neq("status", "cancelado")
      .order("due_date"),
  ]);

  if (appointmentsResult.error || deadlinesResult.error) return new Response("Calendar query failed", { status: 500 });

  const stamp = toIcsDate(new Date().toISOString());
  const events = [
    ...(appointmentsResult.data ?? []).map((item) => {
      const row = item as { id: string; title: string; type: string; starts_at: string; ends_at: string | null; status: string };
      return [
        "BEGIN:VEVENT",
        `UID:appointment-${row.id}@alfenus`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${toIcsDate(row.starts_at)}`,
        `DTEND:${toIcsDate(row.ends_at ?? new Date(new Date(row.starts_at).getTime() + 60 * 60_000).toISOString())}`,
        `SUMMARY:${escapeIcs(row.title)}`,
        `DESCRIPTION:${escapeIcs(`${row.type} · ${row.status}`)}`,
        "END:VEVENT",
      ].join("\r\n");
    }),
    ...(deadlinesResult.data ?? []).map((item) => {
      const row = item as { id: string; title: string; type: string; due_date: string; due_time: string | null; status: string; description: string | null };
      const start = row.due_time ? `${row.due_date}T${row.due_time}` : `${row.due_date}T09:00:00`;
      return [
        "BEGIN:VEVENT",
        `UID:deadline-${row.id}@alfenus`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(new Date(new Date(start).getTime() + 30 * 60_000).toISOString())}`,
        `SUMMARY:${escapeIcs(`Prazo: ${row.title}`)}`,
        `DESCRIPTION:${escapeIcs(`${row.type} · ${row.status}${row.description ? `\\n${row.description}` : ""}`)}`,
        "END:VEVENT",
      ].join("\r\n");
    }),
  ];

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Alfenus//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].map(foldLine).join("\r\n");

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="alfenus-agenda.ics"',
      "cache-control": "no-store",
    },
  });
}
