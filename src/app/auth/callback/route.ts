import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await getSupabaseServerClient();

  if (!code || !supabase) {
    return redirectTo(request, "/entrar?erro=confirmacao");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return redirectTo(request, "/entrar?erro=confirmacao");
  }

  const { data: activeMembership, error: membershipError } = await supabase
    .from("law_firm_members")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return redirectTo(request, "/entrar?erro=acesso");
  }

  return redirectTo(request, activeMembership ? "/dashboard" : "/onboarding");
}
