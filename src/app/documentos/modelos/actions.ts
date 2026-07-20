"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { extractPlaceholders, renderTemplate } from "@/lib/documents/template-engine";
import { withoutDuplicateSystemTemplates } from "@/lib/documents/template-catalog";
import { systemDocumentTemplates } from "@/lib/documents/system-templates";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type DocumentTemplate = { id: string; name: string; description: string | null; category: string; content: string; variables: string[]; isSystem: boolean; createdAt: string };

const templateSchema = z.object({ name: z.string().min(3).max(120), description: z.string().max(400).optional(), category: z.string().min(2).max(40), content: z.string().min(20).max(50_000) });
const updateTemplateSchema = templateSchema.extend({ id: z.string().uuid() });

type DocumentTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  created_at: string;
};

type TemplateSelectBuilder<T> = {
  eq(column: string, value: string): TemplateSelectBuilder<T>;
  is(column: string, value: null): TemplateSelectBuilder<T>;
  order(column: string): Promise<{ data: T[] | null; error: Error | null }>;
  maybeSingle(): Promise<{ data: T | null; error: Error | null }>;
};

type TemplateMutationBuilder = PromiseLike<{ error: Error | null }> & {
  eq(column: string, value: string): TemplateMutationBuilder;
  is(column: string, value: null): TemplateMutationBuilder;
};

type TemplateTableClient = {
  select(columns: string): TemplateSelectBuilder<DocumentTemplateRow>;
  insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  update(values: Record<string, unknown>): TemplateMutationBuilder;
};

function documentTemplatesTable(supabase: unknown): TemplateTableClient {
  return (supabase as { from(table: "document_templates"): TemplateTableClient }).from("document_templates");
}

async function readyContext(): Promise<{ member: NonNullable<Awaited<ReturnType<typeof getAppContext>>["member"]>; lawFirm: NonNullable<Awaited<ReturnType<typeof getAppContext>>["lawFirm"]> }> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Sessão inválida");
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão para gerenciar modelos");
  return { member: context.member, lawFirm: context.lawFirm };
}

export async function getTemplatesAction(): Promise<{ success: boolean; templates?: DocumentTemplate[]; error?: string }> {
  try {
    const context = await readyContext();
    const supabase = await getSupabaseServerClient();
    if (!supabase) throw new Error("Supabase indisponível");
    const { data, error } = await documentTemplatesTable(supabase).select("id, name, description, category, content, created_at").eq("law_firm_id", context.lawFirm.id).is("archived_at", null).order("name");
    if (error) throw error;
    const officeTemplates = (data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description, category: item.category, content: item.content, variables: extractPlaceholders(item.content), isSystem: false, createdAt: item.created_at }));
    const systemTemplates = systemDocumentTemplates.map((item) => ({ ...item, description: item.description, variables: extractPlaceholders(item.content), isSystem: true, createdAt: "" }));
    return { success: true, templates: withoutDuplicateSystemTemplates([...systemTemplates, ...officeTemplates]) };
  } catch (error) { return { success: false, error: String(error) }; }
}

export async function createTemplateAction(input: z.infer<typeof templateSchema>) {
  const context = await readyContext();
  const parsed = templateSchema.parse(input);
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase indisponível");
  const { error } = await documentTemplatesTable(supabase).insert({ law_firm_id: context.lawFirm.id, name: parsed.name, description: parsed.description || null, category: parsed.category, content: parsed.content, created_by: context.member.id });
  if (error) throw error;
  revalidatePath("/documentos/modelos");
}

export async function updateTemplateAction(input: z.infer<typeof updateTemplateSchema>) {
  const context = await readyContext();
  const parsed = updateTemplateSchema.parse(input);
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase indisponível");
  const { error } = await documentTemplatesTable(supabase).update({ name: parsed.name, description: parsed.description || null, category: parsed.category, content: parsed.content }).eq("id", parsed.id).eq("law_firm_id", context.lawFirm.id).is("archived_at", null);
  if (error) throw error;
  revalidatePath("/documentos/modelos");
  revalidatePath("/documentos/gerar");
}

export async function copySystemTemplateAction(systemTemplateId: string) {
  const template = systemDocumentTemplates.find((item) => item.id === systemTemplateId);
  if (!template) throw new Error("Modelo do sistema não encontrado");
  await createTemplateAction({ name: `${template.name} - cópia`, description: template.description, category: template.category, content: template.content });
}

export async function previewTemplateAction(templateId: string, values: Record<string, string>) {
  const context = await readyContext();
  let content = systemDocumentTemplates.find((item) => item.id === templateId)?.content;
  if (!content) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await documentTemplatesTable(supabase).select("content").eq("id", templateId).eq("law_firm_id", context.lawFirm.id).maybeSingle();
    if (error || !data) throw new Error("Modelo não encontrado");
    content = data.content;
  }
  return { success: true, preview: renderTemplate(content!, values) };
}

export async function deleteTemplateAction(templateId: string) {
  const context = await readyContext();
  const supabase = await getSupabaseServerClient();
  const { error } = await documentTemplatesTable(supabase).update({ archived_at: new Date().toISOString() }).eq("id", templateId).eq("law_firm_id", context.lawFirm.id);
  if (error) throw error;
  revalidatePath("/documentos/modelos");
  revalidatePath("/documentos/gerar");
}
