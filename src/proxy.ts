import { type NextRequest, NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";

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

export function proxy(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return addSecurityHeaders(NextResponse.next());
  }

  const { pathname } = request.nextUrl;

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
