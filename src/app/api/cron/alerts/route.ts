import { NextResponse } from "next/server";

import { runAllAlertChecks } from "@/lib/alerts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/alerts
// Called by Vercel Cron — authenticated via Authorization: Bearer <CRON_SECRET>
// Uses service-role Supabase client to bypass RLS (no user session in cron context).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  try {
    await runAllAlertChecks(adminClient as never);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Alert check failed" }, { status: 500 });
  }
}
