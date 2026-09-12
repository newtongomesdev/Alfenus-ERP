import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env, hasSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

const protectedRoutes = [
  "/dashboard",
  "/clientes",
  "/processos",
  "/prazos",
  "/tarefas",
  "/contratos",
  "/recebimentos",
  "/agenda",
  "/despesas",
  "/documentos",
  "/pipeline",
  "/solicitacoes",
  "/correspondentes",
  "/conflitos",
  "/horas",
  "/auditoria",
  "/backup",
  "/importar",
  "/exportar",
  "/deduplicacao",
  "/portal-cliente",
  "/equipe",
  "/configuracoes",
  "/notificacoes",
  "/relatorios",
  "/leads",
  "/onboarding",
];

const proposalWriteRoles = new Set(["proprietario", "administrador", "advogado"]);

function isProposalWriteRoute(pathname: string) {
  return pathname === "/propostas/nova" || /^\/propostas\/[^/]+\/editar$/.test(pathname);
}

async function guardProposalWriteRoute(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));
  const { data: member } = await supabase.from("law_firm_members").select("role").eq("user_id", user.id).eq("status", "ativo").limit(1).maybeSingle();
  const role = String(member?.role ?? "").trim().toLowerCase();
  if (!proposalWriteRoles.has(role)) return NextResponse.redirect(new URL("/propostas", request.url));
  return response;
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return addSecurityHeaders(NextResponse.next());
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/p" || pathname.startsWith("/p/")) {
    const response = addSecurityHeaders(NextResponse.next());
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  if (isProposalWriteRoute(pathname)) {
    return addSecurityHeaders(await guardProposalWriteRoute(request));
  }

  // Ignorar rotas internas do Next.js e API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const hasSession = request.cookies.getAll().some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );

    if (!hasSession) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/entrar", request.url)));
    }

    // The server-side admin guard calls auth.getUser(). Do not inspect a
    // possibly chunked or stale JWT here, especially after role changes.
    return addSecurityHeaders(NextResponse.next());
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  // O @supabase/ssr grava a sessão em sb-<project-ref>-auth-token.
  // O valor pode ser dividido em vários cookies, por isso verificamos o prefixo.
  const hasSession = request.cookies.getAll().some(
    ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
  );

  // Redirecionar para login se tentar acessar rota protegida sem sessão
  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
