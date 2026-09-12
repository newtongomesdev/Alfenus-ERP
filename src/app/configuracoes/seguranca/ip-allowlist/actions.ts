"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import {
  addIpAllowlistEntry,
  removeIpAllowlistEntry,
} from "@/lib/security/policies";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function addIpEntryAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Não autenticado");

  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const cidrRange = String(formData.get("cidrRange") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (!ipAddress) throw new Error("Endereço IP é obrigatório");

  await addIpAllowlistEntry(context, { ipAddress, cidrRange, description });
  revalidatePath("/configuracoes/seguranca/ip-allowlist");
}

export async function removeIpEntryAction(entryId: string) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Não autenticado");

  await removeIpAllowlistEntry(context, entryId);
  revalidatePath("/configuracoes/seguranca/ip-allowlist");
}

export async function toggleIpEntryAction(entryId: string, isActive: boolean) {
  const context = await getAppContext();
  if (context.status !== "ready") throw new Error("Não autenticado");
  if (!context.lawFirm) throw new Error("Escritório não encontrado");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar ao banco de dados");

  const { error } = await supabase
    .from("ip_allowlists")
    .update({ is_active: isActive })
    .eq("id", entryId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  revalidatePath("/configuracoes/seguranca/ip-allowlist");
}
