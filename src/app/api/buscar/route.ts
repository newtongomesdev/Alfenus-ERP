import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "cliente" | "processo" | "prazo" | "tarefa" | "contrato" | "lead";
};

type DbResult = {
  id: string;
  title: string;
  subtitle: string;
  entity_type: string;
  result_rank: number;
};

const hrefMap: Record<SearchResult["type"], (id: string) => string> = {
  cliente: (id) => `/clientes/${id}`,
  processo: (id) => `/processos/${id}`,
  prazo: () => "/prazos",
  tarefa: (id) => `/tarefas/${id}`,
  contrato: () => "/contratos",
  lead: () => "/leads",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ results: [] });
  }

  const lawFirmId = context.lawFirm.id;

  const { data, error } = await supabase.rpc("global_search", {
    p_query: query,
    p_law_firm_id: lawFirmId,
  });

  if (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = (data ?? []).map((row: DbResult) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    href: hrefMap[row.entity_type as SearchResult["type"]]?.(row.id) ?? "#",
    type: row.entity_type as SearchResult["type"],
  }));

  return NextResponse.json({ results });
}
