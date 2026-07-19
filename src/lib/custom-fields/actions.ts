"use server";

import { z } from "zod";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CustomField = {
  id: string;
  entityType: string;
  label: string;
  fieldType: string;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
};

export type CustomFieldValue = {
  id: string;
  customFieldId: string;
  entityType: string;
  entityId: string;
  value: string | null;
};

const fieldSchema = z.object({
  entityType: z.enum(["client", "lead", "legal_case"]),
  label: z.string().min(1, "Label é obrigatório"),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]).default("text"),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// Listar campos personalizados
export async function getCustomFields(entityType: string): Promise<CustomField[]> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("custom_fields" as any)
    .select("id, entity_type, label, field_type, options, required, sort_order")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("entity_type", entityType)
    .order("sort_order");

  if (error) throw error;

  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    label: r.label,
    fieldType: r.field_type,
    options: r.options as string[] | null,
    required: r.required,
    sortOrder: r.sort_order,
  }));
}

// Criar campo personalizado
export async function createCustomField(data: z.infer<typeof fieldSchema>) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Sem permissão");

  const parsed = fieldSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase.from("custom_fields" as any).insert({
    law_firm_id: context.lawFirm.id,
    entity_type: parsed.entityType,
    label: parsed.label,
    field_type: parsed.fieldType,
    options: parsed.options ?? null,
    required: parsed.required,
    sort_order: parsed.sortOrder,
  });

  if (error) throw error;
  return { success: true };
}

// Excluir campo personalizado
export async function deleteCustomField(id: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "configuracoes.administrar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase
    .from("custom_fields" as any)
    .delete()
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}

// Buscar valores de campos personalizados para uma entidade
export async function getCustomFieldValues(entityType: string, entityId: string): Promise<CustomFieldValue[]> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("custom_field_values" as any)
    .select("id, custom_field_id, entity_type, entity_id, value")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) throw error;

  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    customFieldId: r.custom_field_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    value: r.value,
  }));
}

// Salvar valores de campos personalizados
export async function saveCustomFieldValues(entityType: string, entityId: string, values: Record<string, string | null>) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "clientes.editar") && !can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Upsert cada valor
  for (const [fieldId, value] of Object.entries(values)) {
    await supabase
      .from("custom_field_values" as any)
      .upsert({
        law_firm_id: context.lawFirm.id,
        custom_field_id: fieldId,
        entity_type: entityType,
        entity_id: entityId,
        value: value || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "law_firm_id,custom_field_id,entity_id" } as any);
  }

  return { success: true };
}
