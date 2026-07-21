"use server";

import { redirect } from "next/navigation";

import { lawFirmSchema } from "@/lib/validations/foundation";
import { recordErrorEvent } from "@/lib/observability/error-events";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/slug";

type CreateLawFirmRpcClient = {
  rpc(
    functionName: "create_law_firm_with_owner",
    args: {
      firm_name: string;
      firm_slug: string;
      firm_document: string | null;
      firm_email: string | null;
      firm_phone: string | null;
    },
  ): Promise<{ data: string | null; error: Error | null }>;
  from(table: "privacy_consents"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};

export async function createLawFirmAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const slug = slugInput ? toSlug(slugInput) : toSlug(name);

  const parsed = lawFirmSchema.safeParse({
    name,
    slug,
    document,
    email,
    phone,
    plan: "starter",
  });

  if (!parsed.success) {
    redirect("/onboarding?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/onboarding?erro=ambiente");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const client = supabase as unknown as CreateLawFirmRpcClient;
  const { data: lawFirmId, error } = await client.rpc("create_law_firm_with_owner", {
    firm_name: parsed.data.name,
    firm_slug: parsed.data.slug,
    firm_document: parsed.data.document ?? null,
    firm_email: parsed.data.email || null,
    firm_phone: parsed.data.phone ?? null,
  });

  if (error) {
    await recordErrorEvent({
      source: "server",
      message: error.message || "Falha ao criar escritório no onboarding",
      path: "/onboarding",
      method: "POST",
      routePath: "/onboarding",
      metadata: { kind: "onboarding-create-law-firm", code: (error as { code?: string }).code ?? null },
    });
    redirect("/onboarding?erro=criacao");
  }

  const acceptedAt = typeof user.user_metadata?.privacy_accepted_at === "string" ? user.user_metadata.privacy_accepted_at : null;
  if (lawFirmId && acceptedAt) {
    await client.from("privacy_consents").insert({ law_firm_id: lawFirmId, user_id: user.id, subject_email: user.email ?? null, purpose: "criação e uso da conta Alfenus", legal_basis: "consentimento", policy_version: String(user.user_metadata?.privacy_policy_version ?? "1.0"), source: "cadastro", consented_at: acceptedAt, metadata: {} });
  }

  redirect("/dashboard");
}
