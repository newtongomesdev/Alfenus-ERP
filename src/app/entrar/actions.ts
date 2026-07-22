"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { recordErrorEvent } from "@/lib/observability/error-events";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function signInAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/entrar?erro=ambiente");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/entrar?erro=ambiente");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordErrorEvent({
      source: "server",
      message: error.message || "Falha de autenticação no login",
      path: "/entrar",
      method: "POST",
      routePath: "/entrar",
      metadata: {
        kind: "auth-sign-in",
        code: error.code ?? null,
        status: error.status ?? null,
      },
    });
    redirect("/entrar?erro=credenciais");
  }

  // Atualizar last_access_at do membro
  const { data: sessionData } = await supabase.auth.getUser();
  if (sessionData?.user?.id) {
    await (supabase as unknown as { from(table: string): { update(values: Record<string, unknown>): { eq(column: string, value: unknown): PromiseLike<{ error: Error | null }> } } })
      .from("law_firm_members")
      .update({ last_access_at: new Date().toISOString() })
      .eq("user_id", sessionData.user.id);

    const { data: activeMembership, error: membershipError } = await supabase
      .from("law_firm_members")
      .select("id, law_firm_id")
      .eq("user_id", sessionData.user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      await recordErrorEvent({
        source: "server",
        message: "Falha ao verificar o escritório do usuário após o login",
        path: "/entrar",
        method: "POST",
        routePath: "/entrar",
        metadata: { kind: "auth-membership-check", code: membershipError.code ?? null },
      });
      redirect("/entrar?erro=acesso");
    }

    if (!activeMembership) {
      redirect("/onboarding");
    }

    // 3. Criar registro de sessão ativa
    try {
      const adminClient = getSupabaseAdminClient();
      if (adminClient && activeMembership?.id && activeMembership?.law_firm_id) {
        const headerStore = await headers();
        const ip = headerStore.get("x-forwarded-for")?.split(",")[0] ?? headerStore.get("x-real-ip") ?? "unknown";
        const ua = headerStore.get("user-agent") ?? "unknown";

        await (adminClient as any).from("active_sessions").insert({
          law_firm_id: activeMembership.law_firm_id,
          user_id: sessionData.user.id,
          member_id: activeMembership.id,
          session_token: crypto.randomUUID(),
          ip_address: ip,
          user_agent: ua,
        });

        // Registrar auditoria de login
        await (adminClient as any).from("audit_logs").insert({
          law_firm_id: activeMembership.law_firm_id,
          actor_id: sessionData.user.id,
          action: "sign_in",
          entity_type: "auth_session",
          entity_id: activeMembership.id,
          metadata: { ip, user_agent: ua, timestamp: new Date().toISOString() },
        });
      }
    } catch {
      // Criação de sessão é best-effort — não bloquear login
    }
  } else {
    redirect("/entrar?erro=acesso");
  }

  redirect("/dashboard");
}

export async function sendMagicLinkAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/entrar?erro=ambiente");
  }

  const email = String(formData.get("magicEmail") ?? "").trim();
  if (!email) {
    redirect("/entrar?erro=magic_email");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/entrar?erro=ambiente");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    redirect("/entrar?erro=ambiente");
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback`, shouldCreateUser: false },
  });

  if (error) {
    redirect("/entrar?erro=magic_link");
  }

  redirect("/entrar?mensagem=magic_link");
}
