"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";

export async function createAnnouncementAction(formData: FormData) {
  const { adminClient, email } = await getAdminContext();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const severity = String(formData.get("severity") ?? "info");

  if (!title || !body) throw new Error("Titulo e mensagem sao obrigatorios");
  if (!["info", "warning", "critical"].includes(severity)) throw new Error("Severidade invalida");

  const { error } = await adminClient
    .from("system_announcements")
    .insert({
      title,
      body,
      severity,
      is_active: true,
      created_by: email,
    });

  if (error) throw error;
  revalidatePath("/admin/anuncios");
}

export async function toggleAnnouncementAction(formData: FormData) {
  const { adminClient } = await getAdminContext();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  if (!id) return;

  const { error } = await adminClient
    .from("system_announcements")
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/admin/anuncios");
}
