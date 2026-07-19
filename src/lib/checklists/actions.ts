"use server";

import { z } from "zod";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  items: Array<{ title: string; required?: boolean }>;
};

const addItemSchema = z.object({
  processId: z.string().uuid(),
  title: z.string().min(1, "Título é obrigatório"),
});

const toggleItemSchema = z.object({
  processId: z.string().uuid(),
  itemId: z.string(),
});

// Buscar checklist de um processo
export async function getProcessChecklist(processId: string): Promise<ChecklistItem[]> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Verificar que o processo pertence ao tenant
  const { data, error } = await supabase
    .from("legal_cases")
    .select("id, law_firm_id")
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (error || !data) throw new Error("Processo não encontrado");

  // Buscar checklist via query direta (coluna existe na DB mas pode não estar nos types gerados)
  const result = await supabase.from("legal_cases" as any).select("checklist").eq("id", processId).single();
  return (result.data as any)?.checklist ?? [];
}

// Adicionar item ao checklist
export async function addChecklistItem(processId: string, title: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  addItemSchema.parse({ processId, title });

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Buscar checklist atual via cast (coluna existe na DB mas não nos types gerados)
  const { data: existing } = await supabase
    .from("legal_cases" as any)
    .select("checklist, law_firm_id")
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!existing) throw new Error("Processo não encontrado");

  const current = ((existing as any).checklist as ChecklistItem[]) ?? [];
  const newItem: ChecklistItem = {
    id: crypto.randomUUID(),
    title,
    done: false,
  };

  const { error } = await supabase
    .from("legal_cases" as any)
    .update({ checklist: [...current, newItem] })
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return newItem;
}

// Toggle (marcar/desmarcar) item
export async function toggleChecklistItem(processId: string, itemId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  toggleItemSchema.parse({ processId, itemId });

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data: existing } = await supabase
    .from("legal_cases" as any)
    .select("checklist, law_firm_id")
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!existing) throw new Error("Processo não encontrado");

  const current = ((existing as any).checklist as ChecklistItem[]) ?? [];
  const updated = current.map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item
  );

  const { error } = await supabase
    .from("legal_cases" as any)
    .update({ checklist: updated })
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return updated;
}

// Remover item do checklist
export async function removeChecklistItem(processId: string, itemId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data: existing } = await supabase
    .from("legal_cases" as any)
    .select("checklist, law_firm_id")
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!existing) throw new Error("Processo não encontrado");

  const current = ((existing as any).checklist as ChecklistItem[]) ?? [];
  const updated = current.filter((item) => item.id !== itemId);

  const { error } = await supabase
    .from("legal_cases" as any)
    .update({ checklist: updated })
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return updated;
}

// Listar templates de checklist
export async function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { data, error } = await supabase
    .from("checklist_templates" as any)
    .select("id, name, description, category, items")
    .eq("law_firm_id", context.lawFirm.id)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    items: t.items as Array<{ title: string; required?: boolean }>,
  }));
}

// Aplicar template ao checklist do processo
export async function applyChecklistTemplate(processId: string, templateId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Buscar template
  const { data: template } = await supabase
    .from("checklist_templates" as any)
    .select("id, items, law_firm_id")
    .eq("id", templateId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!template) throw new Error("Template não encontrado");

  // Buscar checklist atual
  const { data: existing } = await supabase
    .from("legal_cases" as any)
    .select("checklist, law_firm_id")
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!existing) throw new Error("Processo não encontrado");

  const current = ((existing as any).checklist as ChecklistItem[]) ?? [];
  const templateItems = ((template as any).items as Array<{ title: string; required?: boolean }>) ?? [];

  const newItems: ChecklistItem[] = templateItems.map((ti) => ({
    id: crypto.randomUUID(),
    title: ti.title,
    done: false,
  }));

  const { error } = await supabase
    .from("legal_cases" as any)
    .update({ checklist: [...current, ...newItems] })
    .eq("id", processId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return [...current, ...newItems];
}

// Criar template de checklist
export async function createChecklistTemplate(data: { name: string; description?: string; category: string; items: Array<{ title: string; required?: boolean }> }) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase.from("checklist_templates" as any).insert({
    law_firm_id: context.lawFirm.id,
    name: data.name,
    description: data.description ?? null,
    category: data.category,
    items: data.items,
  });

  if (error) throw error;
  return { success: true };
}
