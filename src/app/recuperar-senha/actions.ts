"use server";

import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requestPasswordResetAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/recuperar-senha?erro=ambiente");
  }

  const email = String(formData.get("email") ?? "");
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/recuperar-senha?erro=ambiente");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/entrar`,
  });

  // Sempre redireciona com sucesso por segurança (não revelar se o e-mail existe)
  redirect("/recuperar-senha?mensagem=enviado");
}
