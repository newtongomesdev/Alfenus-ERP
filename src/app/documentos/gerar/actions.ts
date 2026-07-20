"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { extractPlaceholders, renderTemplate } from "@/lib/documents/template-engine";
import { systemDocumentTemplates } from "@/lib/documents/system-templates";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logActivityEvent } from "@/lib/timeline/queries";

export type GeneratedDocument = {
  id: string;
  name: string;
  content: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

type DocumentTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  created_at: string;
};

type LegalCaseRow = {
  title: string | null;
  case_number: string | null;
  case_kind: string | null;
  court: string | null;
  district: string | null;
  state: string | null;
  opposing_party: string | null;
  opposing_lawyer: string | null;
};

type TemplateSelectBuilder<T> = {
  eq(column: string, value: string): TemplateSelectBuilder<T>;
  is(column: string, value: null): TemplateSelectBuilder<T>;
  order(column: string): Promise<{ data: T[] | null; error: Error | null }>;
  maybeSingle(): Promise<{ data: T | null; error: Error | null }>;
};

type TemplateTableClient = {
  select(columns: string): TemplateSelectBuilder<DocumentTemplateRow>;
};

function documentTemplatesTable(supabase: unknown): TemplateTableClient {
  return (supabase as { from(table: "document_templates"): TemplateTableClient }).from("document_templates");
}

// Buscar templates disponíveis para geração
export async function getTemplatesForGeneration() {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await documentTemplatesTable(supabase)
    .select("id, name, description, category, content, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .is("archived_at", null)
    .order("name");

  if (error) throw error;

  const systemTemplates = systemDocumentTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    content: template.content,
    variables: extractPlaceholders(template.content),
    isSystem: true,
    createdAt: "",
  }));

  const officeTemplates = (data ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    category: template.category ?? "geral",
    content: template.content,
    variables: extractPlaceholders(template.content),
    isSystem: false,
    createdAt: template.created_at,
  }));

  return [...systemTemplates, ...officeTemplates];
}

// Buscar entidade para preenchimento automático
export async function getEntityData(entityType: string, entityId: string): Promise<Record<string, string>> {
  const context = await requireAppContext();

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const contextData: Record<string, string> = {};

  if (entityType === "client" || entityType === "cliente") {
    const { data } = await supabase
      .from("clients")
      .select("id, name, email, phone, document, person_type")
      .eq("id", entityId)
      .eq("law_firm_id", context.lawFirm.id)
      .single();

    if (data) {
      contextData["client.name"] = data.name ?? "";
      contextData["client.email"] = data.email ?? "";
      contextData["client.phone"] = data.phone ?? "";
      contextData["client.document"] = data.document ?? "";
      contextData["client.person_type"] = data.person_type ?? "";
    }
  } else if (entityType === "case" || entityType === "processo" || entityType === "legal_case") {
    const { data: caseData } = await supabase
      .from("legal_cases")
      .select("id, title, case_number, case_kind, court, district, state, opposing_party, opposing_lawyer")
      .eq("id", entityId)
      .eq("law_firm_id", context.lawFirm.id)
      .single();

    if (caseData) {
      const c = caseData as LegalCaseRow;
      contextData["case.title"] = c.title ?? "";
      contextData["case.number"] = c.case_number ?? "";
      contextData["case.kind"] = c.case_kind ?? "";
      contextData["case.court"] = c.court ?? "";
      contextData["case.district"] = c.district ?? "";
      contextData["case.state"] = c.state ?? "";
      contextData["case.opposing_party"] = c.opposing_party ?? "";
      contextData["case.opposing_lawyer"] = c.opposing_lawyer ?? "";
    }
  } else if (entityType === "contract" || entityType === "contrato") {
    const { data } = await supabase
      .from("contracts")
      .select("id, service_description, total_amount_cents, status")
      .eq("id", entityId)
      .eq("law_firm_id", context.lawFirm.id)
      .single();

    if (data) {
      contextData["contract.description"] = data.service_description ?? "";
      contextData["contract.value"] = (data.total_amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      contextData["contract.status"] = data.status ?? "";
    }
  }

  // Contexto do escritório
  contextData["firm.name"] = context.lawFirm.name;
  contextData["firm.slug"] = context.lawFirm.slug;
  contextData["today"] = new Date().toLocaleDateString("pt-BR");

  return contextData;
}

// Gerar documento a partir de template
const generateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1, "Nome é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export async function generateDocument(data: z.infer<typeof generateSchema>): Promise<GeneratedDocument> {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const parsed = generateSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const fileName = `${parsed.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "documento"}.txt`;
  const storagePath = `${context.lawFirm.id}/generated/${randomUUID()}-${fileName}`;
  const file = new Blob([parsed.content], { type: "text/plain;charset=utf-8" });
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: "text/plain;charset=utf-8",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Salvar documento gerado
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: parsed.name,
      mime_type: "text/plain;charset=utf-8",
      size_bytes: new TextEncoder().encode(parsed.content).length,
      storage_path: storagePath,
      entity_type: parsed.entityType ?? "documento_gerado",
      entity_id: parsed.entityId ?? null,
      uploaded_by: context.member.id,
    })
    .select("id, name, created_at")
    .single();

  if (error) throw error;

  try {
    await logActivityEvent(supabase, {
      lawFirmId: context.lawFirm.id,
      actorId: context.member.id,
      actorName: context.member.name,
      eventType: "document_generated",
      entityType: parsed.entityType ?? "documento_gerado",
      entityId: parsed.entityId ?? doc.id,
      entityTitle: parsed.name,
      description: "Documento gerado a partir de template",
      metadata: { documentName: parsed.name, templateId: parsed.templateId },
    });
  } catch (err) {
    console.error("[documentos/gerar] falha ao registrar activity_events:", err);
  }

  revalidatePath("/documentos");
  revalidatePath("/documentos/gerar");

  return {
    id: doc.id,
    name: doc.name,
    content: parsed.content,
    entityType: parsed.entityType ?? null,
    entityId: parsed.entityId ?? null,
    createdAt: doc.created_at,
  };
}

export async function renderDocumentTemplate(templateId: string, values: Record<string, string>) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  let content = systemDocumentTemplates.find((template) => template.id === templateId)?.content;
  if (!content) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) throw new Error("Erro ao conectar");
    const { data, error } = await documentTemplatesTable(supabase)
      .select("content")
      .eq("id", templateId)
      .eq("law_firm_id", context.lawFirm.id)
      .is("archived_at", null)
      .maybeSingle();
    if (error || !data) throw new Error("Modelo não encontrado");
    content = data.content;
  }

  return renderTemplate(content ?? "", values);
}
