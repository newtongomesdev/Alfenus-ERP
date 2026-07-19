"use server";

import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PowerOfAttorney = {
  id: string;
  grantorName: string;
  grantorDocument: string | null;
  attorneyName: string;
  attorneyDocument: string | null;
  attorneyOab: string | null;
  powers: string[];
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  status: string;
  documentId: string | null;
  notes: string | null;
  caseName: string | null;
  clientName: string | null;
  createdAt: string;
};

const powerSchema = z.object({
  legalCaseId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  grantorName: z.string().min(2, "Nome do outorgante é obrigatório"),
  grantorDocument: z.string().optional(),
  attorneyName: z.string().min(2, "Nome do outorgado é obrigatório"),
  attorneyDocument: z.string().optional(),
  attorneyOab: z.string().optional(),
  powers: z.array(z.string()).default([]),
  grantedAt: z.string().min(1, "Data é obrigatória"),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

// Listar procurações
export async function getPowersOfAttorney(filters?: { caseId?: string; status?: string }): Promise<PowerOfAttorney[]> {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.visualizar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  let query = supabase
    .from("powers_of_attorney" as any)
    .select(`
      id, grantor_name, grantor_document, attorney_name, attorney_document,
      attorney_oab, powers, granted_at, expires_at, revoked_at, status,
      document_id, notes, created_at,
      legal_case:legal_cases(title),
      client:clients(name)
    `)
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: false });

  if (filters?.caseId) {
    query = query.eq("legal_case_id", filters.caseId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    grantorName: r.grantor_name,
    grantorDocument: r.grantor_document,
    attorneyName: r.attorney_name,
    attorneyDocument: r.attorney_document,
    attorneyOab: r.attorney_oab,
    powers: r.powers ?? [],
    grantedAt: r.granted_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    status: r.status,
    documentId: r.document_id,
    notes: r.notes,
    caseName: r.legal_case?.title ?? null,
    clientName: r.client?.name ?? null,
    createdAt: r.created_at,
  }));
}

// Criar procuração
export async function createPowerOfAttorney(data: z.infer<typeof powerSchema>) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.criar")) throw new Error("Sem permissão");

  const parsed = powerSchema.parse(data);

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  // Auto-determinar status baseado nas datas
  let status = "ativa";
  if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
    status = "expirada";
  }

  const { error } = await supabase.from("powers_of_attorney" as any).insert({
    law_firm_id: context.lawFirm.id,
    legal_case_id: parsed.legalCaseId ?? null,
    client_id: parsed.clientId ?? null,
    grantor_name: parsed.grantorName,
    grantor_document: parsed.grantorDocument ?? null,
    attorney_name: parsed.attorneyName,
    attorney_document: parsed.attorneyDocument ?? null,
    attorney_oab: parsed.attorneyOab ?? null,
    powers: parsed.powers,
    granted_at: parsed.grantedAt,
    expires_at: parsed.expiresAt ?? null,
    notes: parsed.notes ?? null,
    status,
  });

  if (error) throw error;
  return { success: true };
}

// Atualizar status da procuração
export async function updatePowerOfAttorneyStatus(id: string, status: string) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "revogada") {
    updateData.revoked_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("powers_of_attorney" as any)
    .update(updateData)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}

// Excluir procuração
export async function deletePowerOfAttorney(id: string) {
  const context = await requireAppContext();
  if (!can(context.member.role, "processos.editar")) throw new Error("Sem permissão");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar");

  const { error } = await supabase
    .from("powers_of_attorney" as any)
    .delete()
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;
  return { success: true };
}
