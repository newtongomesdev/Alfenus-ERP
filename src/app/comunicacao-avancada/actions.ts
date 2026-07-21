"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can, type Role } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirectForError(basePath: string, error: string): never {
  redirect(`${basePath}?erro=${error}`);
}

async function getDb(basePath: string) {
  const client = await getSupabaseServerClient();
  if (!client) redirectForError(basePath, "servidor");
  return client!;
}

function hasPermission(role: Role): boolean {
  return can(role, "prazos.criar");
}

async function requireContext(basePath: string) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");
  if (!hasPermission(context.member.role))
    redirectForError(basePath, "permissao");
  return context;
}

export async function createMessageAction(
  basePath: string,
  formData: FormData,
) {
  const context = await requireContext(basePath);
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const commType = String(formData.get("type") ?? "mensagem_interna").trim();
  const visibility = String(formData.get("visibility") ?? "equipe").trim();

  if (!subject || !content) redirectForError(basePath, "validacao");

  const supabase = await getDb(basePath);
  const { error } = await supabase.from("communications").insert({
    law_firm_id: context.lawFirm!.id,
    sender_member_id: context.member!.id,
    subject,
    content,
    communication_type: commType,
    visibility,
    status: "enviada",
  });

  if (error) redirectForError(basePath, "criacao");

  revalidatePath("/comunicacao-avancada");
  redirect(`${basePath}?criado=1`);
}

export async function createThreadAction(
  basePath: string,
  formData: FormData,
) {
  const context = await requireContext(basePath);
  const title = String(formData.get("title") ?? "").trim();
  const initialMessage = String(formData.get("initialMessage") ?? "").trim();

  if (!title || !initialMessage) redirectForError(basePath, "validacao");

  const supabase = await getDb(basePath);
  const { data: thread, error: threadError } = await supabase
    .from("communication_threads")
    .insert({
      law_firm_id: context.lawFirm!.id,
      created_by: context.member!.id,
      title,
    })
    .select("id")
    .single();

  if (threadError || !thread) redirectForError(basePath, "criacao");

  const { error: msgError } = await supabase.from("communications").insert({
    law_firm_id: context.lawFirm!.id,
    sender_member_id: context.member!.id,
    thread_id: thread!.id,
    subject: title,
    content: initialMessage,
    communication_type: "mensagem_interna",
    visibility: "equipe",
    status: "enviada",
  });

  if (msgError) redirectForError(basePath, "criacao");

  revalidatePath("/comunicacao-avancada");
  redirect(`${basePath}?criado=1`);
}

export async function markAsReadAction(messageId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/entrar");

  const supabase = (await getSupabaseServerClient())!;
  await supabase
    .from("communications")
    .update({ status: "lida" })
    .eq("id", messageId)
    .eq("law_firm_id", context.lawFirm.id);

  revalidatePath("/comunicacao-avancada");
}

export async function pinMessageAction(messageId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/entrar");
  if (!hasPermission(context.member.role)) redirect("/entrar");

  const supabase = (await getSupabaseServerClient())!;
  const { data: existing } = await supabase
    .from("communications")
    .select("is_pinned")
    .eq("id", messageId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (existing) {
    await supabase
      .from("communications")
      .update({ is_pinned: !existing.is_pinned })
      .eq("id", messageId)
      .eq("law_firm_id", context.lawFirm.id);
  }

  revalidatePath("/comunicacao-avancada");
}
