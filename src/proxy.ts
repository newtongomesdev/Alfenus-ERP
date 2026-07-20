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

const publicRoutes = ["/entrar", "/cadastrar", "/recuperar-senha", "/convite", "/"];

export function proxy(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Ignorar rotas internas do Next.js e API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const hasSession = request.cookies.getAll().some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );

    if (!hasSession) {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }

    // The server-side admin guard calls auth.getUser(). Do not inspect a
    // possibly chunked or stale JWT here, especially after role changes.
    return NextResponse.next();
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isPublicRoute = publicRoutes.some(
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
    return NextResponse.redirect(url);
  }

  // Redirecionar para dashboard se logado e tentando acessar login/cadastro
  if (isPublicRoute && hasSession && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
