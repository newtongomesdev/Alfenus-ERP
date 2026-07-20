"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import { getAppContext } from "@/lib/auth/context";

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();

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
