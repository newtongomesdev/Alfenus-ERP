import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/entities?type=cliente&search=jo
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search") ?? "";

  const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ items: [] });

  const tableMap: Record<
    string,
    { table: string; labelCol: string; idCol: string }
  > = {
    cliente: { table: "clients", labelCol: "name", idCol: "id" },
    processo: { table: "legal_cases", labelCol: "title", idCol: "id" },
    contrato: {
      table: "contracts",
      labelCol: "service_description",
      idCol: "id",
    },
    prazo: { table: "deadlines", labelCol: "title", idCol: "id" },
    tarefa: { table: "tasks", labelCol: "title", idCol: "id" },
  };

  const config = tableMap[type ?? ""];
  if (!config) return NextResponse.json({ items: [] });

  let query = supabase
    .from(config.table)
    .select(`${config.idCol}, ${config.labelCol}`)
    .eq("law_firm_id", context.lawFirm.id)
    .limit(20);

  if (search) {
    query = query.ilike(config.labelCol, `%${search}%`);
  }

  const { data } = await query;

  return NextResponse.json({
    items: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row[config.idCol],
      label: row[config.labelCol],
    })),
  });
}
