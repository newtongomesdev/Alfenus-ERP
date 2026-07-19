"use server";

import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { lawFirmSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type LawFirmUpdateClient = {
  from(table: "law_firms"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): PromiseLike<{ error: Error | null }>;
    };
  };
};

type AccountDeletionClient = {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
  rpc(functionName: "delete_my_account_data"): Promise<{ data: { storage_paths?: string[] } | null; error: Error | null }>;
};

export async function updateLawFirmAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/configuracoes?erro=autenticacao");
  }

  if (!can(context.member.role, "configuracoes.administrar")) {
    redirect("/configuracoes?erro=permissao");
  }

  const parsed = lawFirmSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: context.lawFirm.slug,
    document: String(formData.get("document") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
  });

  if (!parsed.success) {
    redirect("/configuracoes?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/configuracoes?erro=ambiente");
  }

  const mutationClient = supabase as unknown as LawFirmUpdateClient;
  const { error } = await mutationClient
    .from("law_firms")
    .update({
      name: parsed.data.name,
      document: parsed.data.document || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    } as Record<string, unknown>)
    .eq("id", context.lawFirm.id);

  if (error) {
    redirect("/configuracoes?erro=salvar");
  }

  redirect("/configuracoes?mensagem=salvo");
}

export async function deleteOwnAccountAction(formData: FormData) {
  if (String(formData.get("confirmation") ?? "").trim() !== "EXCLUIR MINHA CONTA") {
    redirect("/configuracoes?erro=confirmacao");
  }

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) redirect("/configuracoes?erro=ambiente");

  const client = supabase as unknown as AccountDeletionClient;
  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) redirect("/configuracoes?erro=autenticacao");

  const { data, error } = await client.rpc("delete_my_account_data");
  if (error) redirect("/configuracoes?erro=exclusao");

  const storagePaths = data?.storage_paths ?? [];
  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.storage.from("documents").remove(storagePaths);
    if (storageError) redirect("/configuracoes?erro=arquivos");
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) redirect("/configuracoes?erro=exclusao");

  await supabase.auth.signOut();
  redirect("/entrar?conta_excluida=1");
}
