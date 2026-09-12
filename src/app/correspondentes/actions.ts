"use server";

import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Correspondent = {
  id: string;
  name: string;
  oab: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  specialty: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

const correspondentSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  oab: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});

// Listar correspondentes
export async function getCorrespondents(filters?: { status?: string; search?: string }): Promise<Correspondent[]> {
  const context = await requireAppContext();
  if (!can(context.member.role, "clientes.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("correspondents" as any)
    .select("id, name, oab, email, phone, city, state, specialty, notes, status, created_at")
    .eq("law_firm_id", context.lawFirm.id)
    .order("name");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,oab.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    oab: r.oab,
    email: r.email,
    phone: r.phone,
    city: r.city,
    state: r.state,
    specialty: r.specialty,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// Criar correspondente
export async function createCorrespondent(data: z.infer<typeof correspondentSchema>) {
  const context = await requireAppContext();
  if (!can(context.member.role, "clientes.criar")) throw new Error("Sem permissão");

  const parsed = correspondentSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase.from("correspondents" as any).insert({
    law_firm_id: context.lawFirm.id,
    name: parsed.name,
    oab: parsed.oab || null,
    email: parsed.email || null,
    phone: parsed.phone || null,
    city: parsed.city || null,
    state: parsed.state || null,
    specialty: parsed.specialty || null,
    notes: parsed.notes || null,
  } as any);

  if (error) throw error;
  return { success: true };
}

// Atualizar correspondente
export async function updateCorrespondent(id: string, data: Partial<z.infer<typeof correspondentSchema>> & { status?: string }) {
  const context = await requireAppContext();
  if (!can(context.member.role, "clientes.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.oab !== undefined) updateData.oab = data.oab || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.city !== undefined) updateData.city = data.city || null;
  if (data.state !== undefined) updateData.state = data.state || null;
  if (data.specialty !== undefined) updateData.specialty = data.specialty || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.status !== undefined) updateData.status = data.status;

  const { error } = await supabase
    .from("correspondents" as any)
    .update(updateData)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}

// Excluir correspondente
export async function deleteCorrespondent(id: string) {
  const context = await requireAppContext();
  if (!can(context.member.role, "clientes.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase
    .from("correspondents" as any)
    .delete()
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}
