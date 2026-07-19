import { type NextRequest, NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";

function getCookie(request: NextRequest, name: string): string | undefined {
  const cookie = request.cookies.get(name);
  return cookie?.value;
}

function getCookieByPrefix(request: NextRequest, prefix: string): string | undefined {
  for (const [name, cookie] of request.cookies) {
    if (name.startsWith(prefix)) {
      return cookie.value;
    }
  }
  return undefined;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

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
    const sessionToken =
      getCookieByPrefix(request, "sb-") || getCookie(request, "sb-access-token");
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }

    const payload = decodeJwtPayload(sessionToken);
    if (!payload || (payload.app_metadata as Record<string, unknown>)?.role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

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
