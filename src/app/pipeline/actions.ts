"use server";

import { z } from "zod";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const FUNNEL_STAGES = [
  { id: "novo", label: "Novo", color: "bg-slate-100 text-slate-700" },
  { id: "contato", label: "Em Contato", color: "bg-blue-100 text-blue-700" },
  { id: "proposta", label: "Proposta", color: "bg-amber-100 text-amber-700" },
  { id: "negociacao", label: "Negociação", color: "bg-orange-100 text-orange-700" },
  { id: "fechado_ganho", label: "Fechado (Ganho)", color: "bg-emerald-100 text-emerald-700" },
  { id: "fechado_perdido", label: "Fechado (Perdido)", color: "bg-red-100 text-red-700" },
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]["id"];

export type PipelineLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  interest: string | null;
  funnelStage: string;
  probability: number;
  estimatedValueCents: number;
  nextContactAt: string | null;
  responsibleName: string | null;
  createdAt: string;
};

export type PipelineColumn = {
  stage: (typeof FUNNEL_STAGES)[number];
  leads: PipelineLead[];
  totalValue: number;
};

const moveLeadSchema = z.object({
  leadId: z.string().uuid(),
  newStage: z.enum(["novo", "contato", "proposta", "negociacao", "fechado_ganho", "fechado_perdido"]),
});

export async function getPipelineData(): Promise<PipelineColumn[]> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "leads.pipeline")) throw new Error("Sem permissão para acessar o pipeline");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar com o banco");

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id, name, email, phone, interest, funnel_stage, probability,
      estimated_value_cents, next_contact_at, created_at,
      responsible_member:law_firm_members!leads_responsible_member_id_fkey(name)
    `)
    .eq("law_firm_id", context.lawFirm.id)
    .in("status", ["novo", "em_atendimento", "qualificado"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const mapped: PipelineLead[] = (leads ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    interest: l.interest,
    funnelStage: l.funnel_stage,
    probability: l.probability,
    estimatedValueCents: l.estimated_value_cents,
    nextContactAt: l.next_contact_at,
    responsibleName: l.responsible_member?.name ?? null,
    createdAt: l.created_at,
  }));

  return FUNNEL_STAGES.map((stage) => {
    const stageLeads = mapped.filter((l) => l.funnelStage === stage.id);
    return {
      stage,
      leads: stageLeads,
      totalValue: stageLeads.reduce((sum, l) => sum + l.estimatedValueCents, 0),
    };
  });
}

export async function moveLeadToStage(leadId: string, newStage: FunnelStageId) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) throw new Error("Não autenticado");
  if (!can(context.member.role, "leads.editar")) throw new Error("Sem permissão para mover leads");

  moveLeadSchema.parse({ leadId, newStage });

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar com o banco");

  // Verificar que o lead pertence ao tenant
  const { data: lead } = await supabase
    .from("leads")
    .select("id, law_firm_id, name")
    .eq("id", leadId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (!lead) throw new Error("Lead não encontrado");

  const probabilityMap: Record<FunnelStageId, number> = {
    novo: 10,
    contato: 25,
    proposta: 50,
    negociacao: 75,
    fechado_ganho: 100,
    fechado_perdido: 0,
  };

  const { error } = await supabase
    .from("leads")
    .update({
      funnel_stage: newStage,
      probability: probabilityMap[newStage],
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;

  // Log de atividade
  await supabase.from("activity_events").insert({
    law_firm_id: context.lawFirm.id,
    entity_type: "lead",
    entity_id: leadId,
    actor_id: context.member.id,
    action: "stage_changed",
    metadata: { newStage, leadName: lead.name },
  } as any);

  return { success: true };
}
