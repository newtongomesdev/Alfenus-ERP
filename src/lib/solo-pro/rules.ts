/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Solo Pro Rules Engine
 * Rule-based recommendation system for operational intelligence
 */

import type { RuleEvaluationResult } from "./types";

// Helper to access new columns before migration is applied and types are regenerated.
function tbl(supabase: any, table: string) {
  return supabase.from(table) as any;
}

// ── Rule Evaluation Functions ──────────────────────────────────────

// Check: leads without return for 2+ days
async function evaluateLeadsWithoutReturn(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data, error } = await tbl(supabase, "leads")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .in("status", ["novo", "aguardando_retorno"])
    .lt("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "leads_without_return",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Você possui ${count} lead(s) sem resposta há mais de dois dias.` : undefined,
  };
}

// Check: proposals expiring soon
async function evaluateProposalsExpiringSoon(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data, error } = await tbl(supabase, "fee_proposals")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .eq("status", "enviada")
    .lt("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .gt("created_at", new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString());

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "proposals_expiring_soon",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Você possui ${count} proposta(s) com vencimento próximo.` : undefined,
  };
}

// Check: cases without next action
async function evaluateCasesWithoutNextAction(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  // Try to use next_action_date if column exists, otherwise check for missing status updates
  const { data, error } = await tbl(supabase, "legal_cases")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .in("status", ["em_andamento", "ativo"]);

  let count = 0;
  if (!error && data) {
    // For simplicity, we'll use a heuristic: if we can't filter by next_action_date, check for cases without recent updates
    const { data: cases } = await tbl(supabase, "legal_cases")
      .select("id, updated_at")
      .eq("law_firm_id", lawFirmId)
      .in("status", ["em_andamento", "ativo"]);

    if (cases && Array.isArray(cases)) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      count = cases.filter((c: any) => !c.updated_at || new Date(c.updated_at) < thirtyDaysAgo).length;
    }
  }

  return {
    ruleKey: "cases_without_next_action",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Você possui ${count} processo(s) sem próxima ação definida.` : undefined,
  };
}

// Check: overdue installments without charge
async function evaluateOverdueInstallmentsNoCharge(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data, error } = await tbl(supabase, "installments")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .in("status", ["pendente", "atrasada", "parcialmente_paga"])
    .lt("due_date", new Date().toISOString().split("T")[0])
    .or("paid_amount_cents.eq.0,paid_amount_cents.is.null");

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "overdue_installments_no_charge",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Existem ${count} parcela(s) atrasada(s) sem registro de cobrança.` : undefined,
  };
}

// Check: clients without contact in 30 days
async function evaluateClientNoUpdate30Days(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await tbl(supabase, "clients")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo")
    .lt("updated_at", thirtyDaysAgo.toISOString());

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "client_no_update_30days",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Você possui ${count} cliente(s) sem atualização há 30 dias.` : undefined,
  };
}

// Check: tasks over daily capacity
async function evaluateTasksOverCapacity(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data, error } = await tbl(supabase, "tasks")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .in("status", ["pendente", "em_andamento"]);

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "tasks_over_capacity",
    conditionMet: count > 15,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 15 ? `Você está com ${count} tarefas pendentes, acima da capacidade diária.` : undefined,
  };
}

// Check: referral clients this quarter
async function evaluateReferralClients(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const quarterStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
  const { data, error } = await tbl(supabase, "clients")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .eq("source", "indicacao")
    .gte("created_at", quarterStart.toISOString());

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "referral_clients_this_quarter",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Você recebeu ${count} cliente(s) por indicação neste trimestre.` : undefined,
  };
}

// Check: pending documents for audience
async function evaluatePendingDocumentsAudience(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data, error } = await tbl(supabase, "deadlines")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .ilike("title", "%audiência%")
    .gte("due_date", new Date().toISOString().split("T")[0])
    .lte("due_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .in("status", ["pendente", "em_andamento"]);

  const count = !error ? ((data as any)?.count ?? 0) : 0;
  return {
    ruleKey: "pending_documents_audience",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Existem ${count} documentos pendentes para audiência da próxima semana.` : undefined,
  };
}

// Check: contract active without installment
async function evaluateContractActiveNoInstallment(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult> {
  const { data: contracts, error } = await tbl(supabase, "contracts")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", lawFirmId)
    .eq("status", "ativo");

  const contractCount = !error ? ((contracts as any)?.count ?? 0) : 0;

  // Check for contracts without installments
  const { data: contractsWithInstallments } = await tbl(supabase, "installments")
    .select("contract_id", { count: "distinct", head: true })
    .eq("law_firm_id", lawFirmId);

  const contractsWithInstallmentsCount = contractsWithInstallments?.count ?? 0;
  const count = contractCount - contractsWithInstallmentsCount;

  return {
    ruleKey: "contract_active_no_installment",
    conditionMet: count > 0,
    entityCount: count,
    recommendationGenerated: false,
    message: count > 0 ? `Existem ${count} contrato(s) ativo(s) sem parcela gerada.` : undefined,
  };
}

// ── Main Evaluation Engine ─────────────────────────────────────────

export type RuleEvaluator = (lawFirmId: string, supabase: any) => Promise<RuleEvaluationResult>;

const RULE_EVALUATORS: Record<string, RuleEvaluator> = {
  leads_without_return: evaluateLeadsWithoutReturn,
  proposals_expiring_soon: evaluateProposalsExpiringSoon,
  cases_without_next_action: evaluateCasesWithoutNextAction,
  overdue_installments_no_charge: evaluateOverdueInstallmentsNoCharge,
  client_no_update_30days: evaluateClientNoUpdate30Days,
  tasks_over_capacity: evaluateTasksOverCapacity,
  referral_clients_this_quarter: evaluateReferralClients,
  pending_documents_audience: evaluatePendingDocumentsAudience,
  contract_active_no_installment: evaluateContractActiveNoInstallment,
};

// Evaluate all rules and return results
export async function evaluateAllRules(lawFirmId: string, supabase: any): Promise<RuleEvaluationResult[]> {
  const results: RuleEvaluationResult[] = [];

  for (const [ruleKey, evaluator] of Object.entries(RULE_EVALUATORS)) {
    try {
      const result = await evaluator(lawFirmId, supabase);
      results.push(result);
    } catch (err) {
      console.error(`Error evaluating rule ${ruleKey}:`, err);
      results.push({
        ruleKey,
        conditionMet: false,
        entityCount: 0,
        recommendationGenerated: false,
        message: `Erro ao avaliar regra ${ruleKey}`,
      });
    }
  }

  return results;
}

// Check if a rule is muted for a firm
export async function isRuleMuted(lawFirmId: string, ruleKey: string, supabase: any): Promise<boolean> {
  const { data } = await tbl(supabase, "recommendation_preferences")
    .select("muted")
    .eq("law_firm_id", lawFirmId)
    .eq("rule_key", ruleKey)
    .single();

  return (data as any)?.muted === true;
}

// Get health status from score
export function getHealthStatus(score: number): "organizado" | "atencao" | "pendente" | "critico" {
  if (score >= 80) return "organizado";
  if (score >= 60) return "atencao";
  if (score >= 40) return "pendente";
  return "critico";
}

// Get health status label
export function getHealthStatusLabel(status: "organizado" | "atencao" | "pendente" | "critico"): string {
  const labels = {
    organizado: "Organizado",
    atencao: "Atenção",
    pendente: "Pendente",
    critico: "Crítico",
  };
  return labels[status];
}

// Get health status color
export function getHealthStatusColor(status: "organizado" | "atencao" | "pendente" | "critico"): string {
  const colors = {
    organizado: "green",
    atencao: "yellow",
    pendente: "orange",
    critico: "red",
  };
  return colors[status];
}