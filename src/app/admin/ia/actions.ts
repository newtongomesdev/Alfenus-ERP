"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { getOpenRouterModels } from "@/lib/ai/openrouter";

export async function saveAiSettings(formData: FormData) {
  const { adminClient, userId } = await getAdminContext();
  const activeModel = String(formData.get("activeModel") ?? "").trim();
  const embeddingModel = String(formData.get("embeddingModel") ?? "").trim();
  const enabled = formData.get("enabled") === "on";
  if (!activeModel || !embeddingModel) throw new Error("Selecione os modelos");
  const { error } = await (adminClient as any).from("ai_platform_settings").upsert({ id: "default", active_model: activeModel, embedding_model: embeddingModel, enabled, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw error;
  revalidatePath("/admin/ia");
}

export async function loadAiModels() {
  await getAdminContext();
  return getOpenRouterModels();
}
