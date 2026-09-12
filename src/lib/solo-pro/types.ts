/**
 * Solo Pro Types
 * Types for the Solo Pro operational intelligence system
 */

// ── Recommendation Types ──────────────────────────────────────────

export type RecommendationPriority = "informativa" | "atencao" | "importante" | "critica";

export type RecommendationStatus =
  | "ativa"
  | "visualizada"
  | "adiada"
  | "concluida"
  | "dispensada"
  | "expirada";

export type RecommendationType =
  | "clientes"
  | "propostas"
  | "juridico"
  | "financeiro"
  | "produtividade"
  | "configuracao";

// ── Operational Rule ───────────────────────────────────────────────

export interface OperationalRule {
  id: string;
  law_firm_id: string | null;
  rule_key: string;
  rule_type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  action_label: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Operational Recommendation ─────────────────────────────────────

export interface OperationalRecommendation {
  id: string;
  law_firm_id: string;
  rule_id: string | null;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  entity_type: string | null;
  entity_id: string | null;
  related_entity_name: string | null;
  reason: string | null;
  action_label: string | null;
  action_url: string | null;
  status: RecommendationStatus;
  generated_at: string;
  expires_at: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  dismissed_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Recommendation Dismissal ───────────────────────────────────────

export interface RecommendationDismissal {
  id: string;
  law_firm_id: string;
  recommendation_id: string;
  dismissed_by: string | null;
  dismissed_at: string;
  reason: string | null;
  created_at: string;
}

// ── Recommendation Action ──────────────────────────────────────────

export interface RecommendationAction {
  id: string;
  law_firm_id: string;
  recommendation_id: string;
  action_type: string;
  action_label: string | null;
  action_url: string | null;
  executed_at: string;
  executed_by: string | null;
  result: string | null;
  created_at: string;
}

// ── Recommendation Preference ──────────────────────────────────────

export interface RecommendationPreference {
  id: string;
  law_firm_id: string;
  rule_key: string;
  muted: boolean;
  muted_at: string | null;
  muted_until: string | null;
  created_at: string;
  updated_at: string;
}

// ── Office Health Snapshot ──────────────────────────────────────────

export interface OfficeHealthSnapshot {
  id: string;
  law_firm_id: string;
  snapshot_type: string;
  snapshot_date: string;
  clients_total: number;
  clients_active: number;
  clients_inactive: number;
  cases_active: number;
  cases_pending_action: number;
  cases_overdue: number;
  proposals_pending: number;
  proposals_expired: number;
  follow_ups_pending: number;
  follow_ups_overdue: number;
  tasks_pending: number;
  tasks_overdue: number;
  deadlines_upcoming: number;
  deadlines_overdue: number;
  revenue_month_cents: number;
  received_month_cents: number;
  overdue_amount_cents: number;
  expenses_month_cents: number;
  recommendations_active: number;
  recommendations_critical: number;
  score_number: number;
  created_at: string;
  updated_at: string;
}

// ── Setup Diagnostic ───────────────────────────────────────────────

export interface SetupDiagnosticQuestion {
  id: string;
  law_firm_id: string | null;
  question_key: string;
  question_text: string;
  answer_value: string | null;
  answer_options: string[];
  order_index: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// ── Client Update Schedule ─────────────────────────────────────────

export interface ClientUpdateSchedule {
  id: string;
  law_firm_id: string;
  client_id: string;
  legal_case_id: string | null;
  frequency: "semanal" | "quinzenal" | "mensal" | "trimestral";
  preferred_channel: "email" | "whatsapp" | "telefone" | "outro";
  responsible_member_id: string | null;
  last_update_date: string | null;
  next_update_date: string | null;
  message_template: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Office Health Overview ─────────────────────────────────────────

export interface OfficeHealthOverview {
  score: number;
  status: "organizado" | "atencao" | "pendente" | "critico";
  statusLabel: string;
  clientsActive: number;
  clientsInactive: number;
  casesActive: number;
  casesPendingAction: number;
  casesOverdue: number;
  proposalsPending: number;
  proposalsExpired: number;
  followUpsPending: number;
  followUpsOverdue: number;
  tasksPending: number;
  tasksOverdue: number;
  deadlinesUpcoming: number;
  deadlinesOverdue: number;
  revenueMonth: number;
  receivedMonth: number;
  overdueAmount: number;
  expensesMonth: number;
  recommendationsActive: number;
  recommendationsCritical: number;
}

// ── Meu Escritório Overview ────────────────────────────────────────

export interface MeuEscritorioOverview {
  health: OfficeHealthOverview;
  today: {
    tasks: number;
    deadlines: number;
    followUps: number;
    appointments: number;
  };
  clients: {
    total: number;
    withoutContact: number;
    pendingReturn: number;
    inactiveDays: number;
  };
  legal: {
    activeCases: number;
    pendingAction: number;
    overdueDeadlines: number;
    pendingProposals: number;
  };
  financial: {
    receivedMonth: number;
    expectedMonth: number;
    overdueAmount: number;
    expensesMonth: number;
    cashflowBalance: number;
  };
  growth: {
    referralClients: number;
    conversionRate: number;
    capacityUsedPercent: number;
    hireReadiness: number;
  };
  recommendations: OperationalRecommendation[];
  quickActions: QuickAction[];
}

// ── Quick Action ────────────────────────────────────────────────────

export interface QuickAction {
  label: string;
  href: string;
  icon: string;
  description?: string;
  priority?: "normal" | "high";
}

// ── Setup Diagnostic Answers ────────────────────────────────────────

export interface SetupDiagnosticAnswers {
  practice_areas: string[];
  has_clients: "sim" | "nao";
  has_cases: "sim" | "nao";
  practice_type: "sim" | "nao" | "parcialmente";
  charging_model: "fixo" | "parcelas" | "exito" | "mensalidade" | "misto";
  has_recurring_expenses: "sim" | "nao";
  uses_spreadsheet: "sim" | "nao" | "pretendo usar";
  uses_external_calendar: "sim" | "nao" | "pretendo usar";
  has_website: "sim" | "nao" | "pretendo criar";
  receives_referrals: "sim" | "nao" | "parcialmente";
  work_location: "casa" | "coworking" | "escritorio";
  intends_hire: "sim" | "nao" | "futuramente";
  hours_per_week: "20" | "30" | "40" | "50" | "60";
  monthly_revenue_goal: "ate_5000" | "5000_10000" | "10000_20000" | "20000_30000" | "acima_30000";
  new_clients_goal: "ate_2" | "3_5" | "6_10" | "acima_10";
  biggest_problem: "falta_clientes" | "perda_prazos" | "falta_cobranca" | "desorganizacao" | "falta_tempo" | "falta_documento";
}

// ── Rule Evaluation Result ──────────────────────────────────────────

export interface RuleEvaluationResult {
  ruleKey: string;
  conditionMet: boolean;
  entityCount: number;
  recommendationGenerated: boolean;
  message?: string;
}

// ── Health Status ──────────────────────────────────────────────────

export type HealthStatus = "organizado" | "atencao" | "pendente" | "critico";

export interface HealthStatusConfig {
  status: HealthStatus;
  label: string;
  color: string;
  description: string;
}