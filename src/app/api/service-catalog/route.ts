import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponível" }, { status: 500 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const practice_area = url.searchParams.get("practice_area");
  const search = url.searchParams.get("search");
  const platform = url.searchParams.get("platform");

  let query = supabase
    .from("service_catalog")
    .select("id, name, slug, practice_area, short_description, reference_value_cents, charging_model, status, is_favorite, is_platform_library, created_at, updated_at, archived_at", { count: "exact" })
    .order("is_favorite", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (status && status !== "todos") query = query.eq("status", status);
  if (practice_area && practice_area !== "todas") query = query.eq("practice_area", practice_area);
  if (search) query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,practice_area.ilike.%${search}%`);
  if (platform === "true") query = query.eq("is_platform_library", true);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    services: data || [],
    total: count || 0,
  });
}