import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ErrorEventInput = {
  source: "server" | "client";
  message: string;
  digest?: string | null;
  path: string;
  method?: string | null;
  routePath?: string | null;
  routerKind?: string | null;
  routeType?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

function bounded(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

export async function recordErrorEvent(input: ErrorEventInput) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const { error } = await admin.from("error_events" as never).insert({
    source: input.source,
    message: bounded(input.message, 2000),
    digest: input.digest ? bounded(input.digest, 200) : null,
    path: bounded(input.path, 500),
    method: input.method ? bounded(input.method, 16) : null,
    route_path: input.routePath ? bounded(input.routePath, 500) : null,
    router_kind: input.routerKind ? bounded(input.routerKind, 80) : null,
    route_type: input.routeType ? bounded(input.routeType, 80) : null,
    user_agent: input.userAgent ? bounded(input.userAgent, 500) : null,
    metadata: input.metadata ?? {},
  } as never);

  if (error) console.error("[observability] erro ao registrar error_event:", error.message);
}
