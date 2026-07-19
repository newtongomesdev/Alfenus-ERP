"use server";

import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/cadastrar?erro=ambiente");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const privacyAccepted = formData.get("privacyAccepted") === "on";

  if (name.length < 2 || !email || password.length < 8 || password !== passwordConfirmation || !privacyAccepted) {
    redirect("/cadastrar?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/cadastrar?erro=ambiente");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, privacy_policy_version: "1.0", privacy_accepted_at: new Date().toISOString() },
      emailRedirectTo: `${appUrl}/onboarding`,
    },
  });

  if (error) {
    redirect("/cadastrar?erro=cadastro");
  }

  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/entrar?mensagem=confirmacao");
}
