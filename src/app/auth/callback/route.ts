import { NextRequest, NextResponse } from "next/server";

import { recordErrorEvent } from "@/lib/observability/error-events";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await getSupabaseServerClient();

  if (!code || !supabase) {
    await recordErrorEvent({ source: "server", message: "Callback de autenticação sem código ou ambiente Supabase", path: "/auth/callback", method: "GET", routePath: "/auth/callback", metadata: { kind: "auth-callback", reason: !code ? "missing-code" : "missing-supabase" } });
    return redirectTo(request, "/entrar?erro=confirmacao");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    await recordErrorEvent({ source: "server", message: error?.message || "Falha ao trocar código de autenticação por sessão", path: "/auth/callback", method: "GET", routePath: "/auth/callback", metadata: { kind: "auth-callback-exchange", code: error?.code ?? null, status: error?.status ?? null } });
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
    await recordErrorEvent({ source: "server", message: membershipError.message || "Falha ao consultar escritório após autenticação", path: "/auth/callback", method: "GET", routePath: "/auth/callback", metadata: { kind: "auth-callback-membership", code: membershipError.code ?? null } });
    return redirectTo(request, "/entrar?erro=acesso");
  }

  return redirectTo(request, activeMembership ? "/dashboard" : "/onboarding");
}
