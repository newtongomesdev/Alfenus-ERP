"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import { getAppContext } from "@/lib/auth/context";

export async function signOutAction() {
  const context = await getAppContext();
  const supabase = await getSupabaseServerClient();

  // 1. Registrar auditoria antes de invalidar a sessão
  if (context.status === "ready" && context.member && supabase) {
    try {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        const headerStore = await headers();
        const ip = headerStore.get("x-forwarded-for")?.split(",")[0] ?? headerStore.get("x-real-ip") ?? "unknown";
        const ua = headerStore.get("user-agent") ?? "unknown";

        await (adminClient as any).from("audit_logs").insert({
          law_firm_id: context.member.lawFirmId,
          actor_id: context.member.userId,
          action: "sign_out",
          entity_type: "auth_session",
          entity_id: context.member.id,
          metadata: { ip, user_agent: ua, timestamp: new Date().toISOString() },
        });
      }
    } catch {
      // Auditoria é best-effort — não bloquear sign-out
    }

    // 2. Remover registro de sessão ativa
    try {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        await (adminClient as any)
          .from("active_sessions")
          .delete()
          .eq("user_id", context.member.userId)
          .eq("law_firm_id", context.member.lawFirmId);
      }
    } catch {
      // Limpeza de sessão é best-effort
    }
  }

  // 3. Invalidar sessão Supabase Auth (limpa cookies + revoga refresh token)
  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/entrar");
}

export async function getLawFirmLogoAction() {
  const context = await getAppContext();
  if (context.status === "ready" && context.lawFirm?.logoPath) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.storage
        .from("branding")
        .createSignedUrl(context.lawFirm.logoPath, 3600);
      return data?.signedUrl ?? null;
    }
  }
  return null;
}
