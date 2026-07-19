"use server";

import { z } from "zod";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
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

// Buscar templates disponíveis para geração
export async function getTemplatesForGeneration() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("documents")
    .select("id, name, mime_type, size_bytes, entity_type, entity_id, created_at, uploaded_by")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("entity_type", "modelo")
    .order("name");

  if (error) throw error;

  return (data ?? []).map((d: any) => {
    // Buscar metadata do template
    const meta = d as any;
    return {
      id: d.id,
      name: d.name,
      description: meta.description ?? null,
      category: meta.category ?? "geral",
      variables: [] as string[],
      createdAt: d.created_at,
    };
  });
}

// Buscar entidade para preenchimento automático
export async function getEntityData(entityType: string, entityId: string): Promise<Record<string, string>> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");

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
      const c = caseData as any;
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
  templateId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export async function generateDocument(data: z.infer<typeof generateSchema>): Promise<GeneratedDocument> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const parsed = generateSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Salvar documento gerado
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: parsed.name,
      mime_type: "text/plain",
      size_bytes: new TextEncoder().encode(parsed.content).length,
      storage_path: `generated/${crypto.randomUUID()}.txt`,
      entity_type: parsed.entityType ?? "documento_gerado",
      entity_id: parsed.entityId ?? null,
      uploaded_by: context.member.id,
    } as any)
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

  return {
    id: doc.id,
    name: doc.name,
    content: parsed.content,
    entityType: parsed.entityType ?? null,
    entityId: parsed.entityId ?? null,
    createdAt: doc.created_at,
  };
}
