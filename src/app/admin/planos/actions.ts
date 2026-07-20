"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";

export async function savePlanSettings(formData: FormData) {
  const { adminClient, userId } = await getAdminContext();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceCents = Math.round(Number(formData.get("priceCents") ?? 0) * 100);
  const stripePriceId = String(formData.get("stripePriceId") ?? "").trim() || null;
  if (!/^(starter|professional|business)$/.test(id) || !name || !Number.isFinite(priceCents) || priceCents < 0) {
    throw new Error("Dados de plano inválidos");
  }
  const { error } = await (adminClient as any).from("plan_settings").upsert({
    id, name, description, price_cents: priceCents, stripe_price_id: stripePriceId,
    updated_by: userId, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidatePath("/admin/planos");
  revalidatePath("/planos");
}

export async function changeTenantPlan(formData: FormData) {
  const { adminClient } = await getAdminContext();
  const lawFirmId = String(formData.get("lawFirmId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  if (!lawFirmId || !/^(starter|professional|business)$/.test(plan)) throw new Error("Plano inválido");
  const { error } = await (adminClient as any).from("law_firms").update({ plan, updated_at: new Date().toISOString() }).eq("id", lawFirmId);
  if (error) throw error;
  revalidatePath(`/admin/usuarios`);
  revalidatePath(`/admin/usuarios/${formData.get("userId")}`);
  revalidatePath(`/admin/escritorios/${lawFirmId}`);
}
