"use server";

import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
      .select("id")
      .eq("user_id", sessionData.user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      redirect("/entrar?erro=acesso");
    }

    if (!activeMembership) {
      redirect("/onboarding");
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
