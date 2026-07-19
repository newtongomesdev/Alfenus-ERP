"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PrivacyRequestClient = { rpc(functionName: "find_law_firm_id_by_slug", args: { target_slug: string }): Promise<{ data: string | null; error: Error | null }>; from(table: "privacy_requests"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> } };

export async function createPrivacyRequestAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const officeSlug = String(formData.get("officeSlug") ?? "").trim().toLowerCase();
  const type = String(formData.get("type") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  if (name.length < 2 || !email.includes("@") || officeSlug.length < 3 || !["informacao", "acesso", "correcao", "portabilidade", "anonimizacao", "eliminacao", "revogacao"].includes(type)) redirect("/privacidade/solicitar?erro=validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/privacidade/solicitar?erro=ambiente");
  const client = supabase as unknown as PrivacyRequestClient;
  const { data: lawFirmId, error: firmError } = await client.rpc("find_law_firm_id_by_slug", { target_slug: officeSlug });
  if (firmError || !lawFirmId) redirect("/privacidade/solicitar?erro=escritorio");
  const { error } = await client.from("privacy_requests").insert({ law_firm_id: lawFirmId, requester_name: name, requester_email: email, request_type: type, details: details || null });
  if (error) redirect("/privacidade/solicitar?erro=salvar");
  redirect("/privacidade/solicitar?enviado=1");
}
