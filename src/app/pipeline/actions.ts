"use server";

import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { FUNNEL_STAGES, PROBABILITY_MAP, type FunnelStageId } from "@/lib/pipeline/pipeline-utils";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logActivityEvent } from "@/lib/timeline/queries";

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
  const context = await requireAppContext();
  if (!can(context.member.role, "leads.pipeline")) throw new Error("Sem permissão para acessar o pipeline");

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Erro ao conectar com o banco");

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id, name, email, phone, interest, funnel_stage, probability,
      estimated_value_cents, next_contact_at, created_at, responsible_member_id
    `)
    .eq("law_firm_id", context.lawFirm.id)
    .in("status", ["novo", "em_atendimento", "qualificado"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const responsibleMemberIds = [...new Set((leads ?? []).map((lead) => lead.responsible_member_id).filter(Boolean))] as string[];
  const responsibleNames = new Map<string, string>();

  if (responsibleMemberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("law_firm_members")
      .select("id, name")
      .in("id", responsibleMemberIds)
      .eq("law_firm_id", context.lawFirm.id);

    if (membersError) throw membersError;
    for (const member of members ?? []) {
      responsibleNames.set(member.id, member.name);
    }
  }

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
    responsibleName: l.responsible_member_id ? responsibleNames.get(l.responsible_member_id) ?? null : null,
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
  const context = await requireAppContext();
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

  const { error } = await supabase
    .from("leads")
    .update({
      funnel_stage: newStage,
      probability: PROBABILITY_MAP[newStage],
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("law_firm_id", context.lawFirm.id);

  if (error) throw error;

  // Log de atividade
  try {
    await logActivityEvent(supabase, {
      lawFirmId: context.lawFirm.id,
      actorId: context.member.id,
      actorName: context.member.name,
      eventType: "updated",
      entityType: "lead",
      entityId: leadId,
      entityTitle: lead.name,
      description: `Lead movido para ${newStage}`,
      metadata: { newStage, leadName: lead.name },
    });
  } catch (err) {
    console.error("[pipeline] falha ao registrar activity_events:", err);
  }

  return { success: true };
}
