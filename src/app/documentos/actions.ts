"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { documentSchema } from "@/lib/validations/foundation";

const entityTableMap: Record<string, string> = {
  cliente: "clients",
  processo: "legal_cases",
  contrato: "contracts",
  prazo: "deadlines",
  tarefa: "tasks",
};

const entityPathMap: Record<string, string> = {
  cliente: "/clientes",
  processo: "/processos",
  contrato: "/contratos",
  prazo: "/prazos",
  tarefa: "/tarefas",
};

type EqChain = {
  eq(
    column: string,
    value: string,
  ): EqChain;
  maybeSingle(): Promise<{ data: unknown | null; error: Error | null }>;
};

type DocumentClient = {
  storage: {
    from(bucket: "documents"): {
      upload(
        path: string,
        file: File,
        options: { contentType: string; upsert: boolean },
      ): Promise<{ error: Error | null }>;
      remove(paths: string[]): Promise<{ error: Error | null }>;
    };
  };
  from(table: string): {
    select(columns: string): EqChain;
    insert(
      values: Record<string, unknown>,
    ): PromiseLike<{ error: Error | null }>;
    delete(): EqChain;
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

function fail(error: string): never {
  redirect(`/documentos?erro=${error}`);
}

export async function uploadDocumentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const file = formData.get("file");
  const parsed = documentSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    entityType: String(formData.get("entityType") ?? "outro"),
    entityId: String(formData.get("entityId") ?? ""),
  });
  if (!parsed.success || !(file instanceof File) || file.size === 0)
    fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as DocumentClient;

  // Validate entity exists and belongs to current tenant
  if (parsed.data.entityId && parsed.data.entityType !== "outro") {
    const tableName = entityTableMap[parsed.data.entityType];
    if (tableName) {
      const { data: entity } = await client
        .from(tableName)
        .select("id")
        .eq("law_firm_id", context.lawFirm.id)
        .eq("id", parsed.data.entityId)
        .maybeSingle();
      if (!entity) fail("entidade_nao_encontrada");
    }
  }

  const storagePath = `${context.lawFirm.id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await client
    .storage.from("documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) fail("upload");

  const { error: insertError } = await client.from("documents").insert({
    law_firm_id: context.lawFirm.id,
    name: parsed.data.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    storage_path: storagePath,
    entity_type: parsed.data.entityType,
    entity_id: parsed.data.entityId || null,
    uploaded_by: context.member.id,
  });
  if (insertError) fail("criacao");

  revalidatePath("/documentos");
  revalidatePath("/clientes");
  revalidatePath("/processos");

  // Revalidate the relevant module path based on entity type
  if (
    parsed.data.entityId &&
    parsed.data.entityType !== "outro"
  ) {
    const entityPath = entityPathMap[parsed.data.entityType];
    if (entityPath) revalidatePath(entityPath);
  }

  redirect("/documentos?enviado=1");
}

export async function deleteDocumentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) redirect("/documentos?erro=documento");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as DocumentClient;

  // Fetch the document to get storage_path and verify ownership
  const { data: doc } = await client
    .from("documents")
    .select("id, storage_path, name")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", documentId)
    .maybeSingle();

  const document = doc as { id: string; storage_path: string; name: string } | null;
  if (!document) redirect("/documentos?erro=documento_nao_encontrado");

  // Remove from storage
  const { error: storageError } = await client
    .storage.from("documents")
    .remove([document!.storage_path]);
  if (storageError) redirect("/documentos?erro=storage");

  // Delete from documents table
  const { error: deleteError } = await client
    .from("documents")
    .delete()
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", documentId)
    .maybeSingle();
  if (deleteError) redirect("/documentos?erro=exclusao");

  // Audit log
  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "excluiu_documento",
    entity_type: "document",
    entity_id: documentId,
    metadata: { name: document!.name, storage_path: document!.storage_path },
  });

  revalidatePath("/documentos");
  revalidatePath("/clientes");
  revalidatePath("/processos");
  redirect("/documentos?excluido=1");
}
