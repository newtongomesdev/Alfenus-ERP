"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { renderTemplate, validateTemplate, extractPlaceholders } from "@/lib/documents/template-engine";

export type TemplateActionError = "ambiente" | "permissao" | "validacao" | "salvamento";

export interface DocumentTemplate {
  id: string;
  lawFirmId: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getTemplatesAction(): Promise<{
  success: boolean;
  error?: TemplateActionError;
  templates?: DocumentTemplate[];
}> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return { success: false, error: "ambiente" };
  }

  if (!can(context.member.role, "documentos.visualizar" as any)) {
    return { success: false, error: "permissao" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "ambiente" };

  // Use a metadata approach - templates stored in documents table with a special tag
  const { data } = await supabase
    .from("documents")
    .select("id, name, metadata, created_at, updated_at, uploaded_by")
    .eq("law_firm_id", context.member.lawFirmId)
    .contains("tags", ["modelo"]);

  const rawDocs = (data ?? []) as any[];
  const templates: DocumentTemplate[] = rawDocs.map((doc) => ({
    id: doc.id,
    lawFirmId: context.member!.lawFirmId,
    name: doc.name,
    description: (doc.metadata as Record<string, string>)?.description ?? null,
    category: (doc.metadata as Record<string, string>)?.category ?? "geral",
    content: (doc.metadata as Record<string, string>)?.content ?? "",
    variables: extractPlaceholders((doc.metadata as Record<string, string>)?.content ?? ""),
    createdBy: doc.uploaded_by ?? "",
    createdAt: doc.created_at,
    updatedAt: doc.updated_at ?? doc.created_at,
  }));

  return { success: true, templates };
}

export async function previewTemplateAction(
  templateId: string,
  context: Record<string, string>,
): Promise<{
  success: boolean;
  error?: TemplateActionError;
  preview?: string;
  validation?: { valid: boolean; missingRequired: string[]; available: string[] };
}> {
  const appContext = await getAppContext();
  if (appContext.status !== "ready" || !appContext.member) {
    return { success: false, error: "ambiente" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "ambiente" };

  const { data: doc } = await supabase
    .from("documents")
    .select("metadata")
    .eq("id", templateId)
    .single();

  if (!doc) return { success: false, error: "validacao" };

  const rawDoc = doc as any;
  const content = (rawDoc.metadata as Record<string, string>)?.content ?? "";
  const validation = validateTemplate(content, extractPlaceholders(content), context);
  const preview = renderTemplate(content, context);

  return { success: true, preview, validation };
}

export async function deleteTemplateAction(
  templateId: string,
): Promise<{ success: boolean; error?: TemplateActionError }> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member) {
    return { success: false, error: "ambiente" };
  }

  if (!can(context.member.role, "documentos.administrar" as any)) {
    return { success: false, error: "permissao" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "ambiente" };

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", templateId)
    .eq("law_firm_id", context.member.lawFirmId);

  if (error) return { success: false, error: "salvamento" };

  revalidatePath("/documentos/modelos");
  return { success: true };
}
