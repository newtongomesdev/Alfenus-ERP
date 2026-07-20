"use server";

import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type LawFirmUpdateClient = {
  from(table: "law_firms"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): PromiseLike<{ error: Error | null }>;
    };
    select(columns: string): {
      eq(column: string, value: unknown): {
        neq(column: string, value: unknown): PromiseLike<{ data: any[] | null, error: Error | null }>;
      };
    };
  };
};

export async function updateBioLinkAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/configuracoes/link-da-bio?erro=autenticacao");
  }

  if (!can(context.member.role, "configuracoes.administrar")) {
    redirect("/configuracoes/link-da-bio?erro=permissao");
  }

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  
  if (!slug || slug.length < 3) {
    redirect("/configuracoes/link-da-bio?erro=validacao");
  }

  const regex = /^[a-z0-9\-]+$/;
  if (!regex.test(slug)) {
    redirect("/configuracoes/link-da-bio?erro=slug_invalido");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/configuracoes/link-da-bio?erro=ambiente");
  }

  const client = supabase as unknown as LawFirmUpdateClient;

  // Check if slug is taken by another firm
  if (slug !== context.lawFirm.slug) {
    const { data: existing, error: searchError } = await client
      .from("law_firms")
      .select("id")
      .eq("slug", slug)
      .neq("id", context.lawFirm.id);

    if (searchError) {
      redirect("/configuracoes/link-da-bio?erro=salvar");
    }

    if (existing && existing.length > 0) {
      redirect("/configuracoes/link-da-bio?erro=slug_em_uso");
    }
  }

  const showWhatsapp = formData.get("showWhatsapp") === "on";
  const showEmail = formData.get("showEmail") === "on";
  const showPhone = formData.get("showPhone") === "on";
  const showAddress = formData.get("showAddress") === "on";
  const showTeam = formData.get("showTeam") === "on";
  
  const customLinksStr = String(formData.get("customLinks") ?? "[]");
  let customLinks = [];
  try {
    customLinks = JSON.parse(customLinksStr);
  } catch (e) {
    // Ignore invalid JSON
  }

  const currentSettings = ((context.lawFirm as any).settings as Record<string, any>) || {};

  const { error } = await client
    .from("law_firms")
    .update({
      slug,
      settings: {
        ...currentSettings,
        bio_link: {
          show_whatsapp: showWhatsapp,
          show_email: showEmail,
          show_phone: showPhone,
          show_address: showAddress,
          show_team: showTeam,
          custom_links: customLinks
        }
      }
    } as Record<string, unknown>)
    .eq("id", context.lawFirm.id);

  if (error) {
    redirect("/configuracoes/link-da-bio?erro=salvar");
  }

  redirect("/configuracoes/link-da-bio?mensagem=salvo");
}
