/**
 * Solo Mode Types
 * Types for the simplified interface mode for independent lawyers
 */

export type OperationProfile =
  | "advogado_independente"
  | "escritorio_pequeno"
  | "escritorio_com_equipe"
  | "departamento_juridico"
  | "personalizado";

export type InterfaceMode = "simples" | "completa" | "personalizada";

export type ModuleKey =
  // Core modules
  | "dashboard"
  | "meu_dia"
  | "clientes"
  | "processos"
  | "contratos"
  | "financeiro"
  | "prazos"
  | "agenda"
  | "tarefas"
  | "documentos"
  // Solo-specific
  | "propostas"
  | "recibos"
  | "retornos"
  | "fichas_atendimento"
  | "perfil_profissional"
  // Enterprise features
  | "relatorios"
  | "modelos"
  | "checklists"
  | "custos_processuais"
  | "procuracoes"
  | "correspondentes"
  | "equipe"
  | "despesas"
  | "horas"
  | "portal_cliente"
  | "automacoes"
  | "notificacoes"
  | "configuracoes"
  | "admin";

export interface LegalAreaTemplate {
  id: string;
  law_firm_id: string | null;
  area_key: string;
  area_name: string;
  description: string | null;
  document_templates: DocumentTemplate[];
  contract_clauses: ContractClause[];
  default_checklist: ChecklistItem[];
  sample_documents: SampleDocument[];
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  name: string;
  type: string;
}

export interface ContractClause {
  title: string;
  text: string;
}

export interface ChecklistItem {
  task: string;
  done: boolean;
}

export interface SampleDocument {
  title: string;
  type: string;
}

export interface FeeProposalRow {
  id: string;
  law_firm_id: string;
  client_id: string;
  legal_case_id: string | null;
  service_description: string;
  scope: string | null;
  total_amount_cents: number;
  upfront_amount_cents: number;
  balance_cents: number;
  installments_count: number;
  installment_value_cents: number | null;
  success_fee_percentage: number | null;
  included_expenses: string | null;
  excluded_expenses: string | null;
  validity_days: number;
  charging_model: string;
  observations: string | null;
  responsible_member_id: string | null;
  status: "rascunho" | "enviada" | "aceita" | "rejeitada" | "vencida";
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptRow {
  id: string;
  law_firm_id: string;
  client_id: string;
  contract_id: string | null;
  legal_case_id: string | null;
  payment_id: string | null;
  receipt_number: string | null;
  lawyer_name: string;
  oab_number: string | null;
  oab_state: string | null;
  client_name: string;
  client_document: string | null;
  service_description: string;
  amount_cents: number;
  payment_method: string;
  payment_date: string;
  observations: string | null;
  status: "emitido" | "cancelado";
  cancellation_reason: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRow {
  id: string;
  law_firm_id: string;
  client_id: string;
  legal_case_id: string | null;
  follow_up_type: "ligacao" | "whatsapp" | "email" | "reuniao" | "visita" | "outro";
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  responsible_member_id: string | null;
  priority: "baixa" | "normal" | "alta" | "urgente";
  status: "pendente" | "realizado" | "cancelado" | "adiado";
  result: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeFormRow {
  id: string;
  law_firm_id: string;
  client_id: string | null;
  consultation_reason: string;
  practice_area: string | null;
  problem_summary: string | null;
  urgency: "baixa" | "normal" | "alta" | "urgente";
  has_active_process: boolean;
  process_number: string | null;
  client_objective: string | null;
  perceived_risks: string | null;
  private_notes: string | null;
  responsible_member_id: string | null;
  status: "rascunho" | "em_analise" | "convertido" | "arquivado";
  converted_to_client_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalProfileRow {
  id: string;
  law_firm_id: string;
  professional_name: string;
  oab_number: string | null;
  oab_state: string | null;
  cnpj: string | null;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  signature_url: string | null;
  primary_color: string;
  secondary_color: string;
  bio: string | null;
  specializations: string[];
  created_at: string;
  updated_at: string;
}

export interface DemoDataRecordRow {
  id: string;
  law_firm_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface SoloOverview {
  todayTasks: number;
  todayDeadlines: number;
  todayAppointments: number;
  overdueInstallments: number;
  pendingFollowUps: number;
  receivedThisMonth: number;
  expectedThisMonth: number;
  overdueAmount: number;
  clientsNeedingAttention: number;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    due_at: string | null;
    priority: string;
  }>;
  deadlines: Array<{
    id: string;
    title: string;
    due_date: string;
    due_time: string | null;
    priority: string;
  }>;
  appointments: Array<{
    id: string;
    title: string;
    starts_at: string;
    type: string;
  }>;
  overdueInstallmentList: Array<{
    id: string;
    client_name: string;
    amount_cents: number;
    due_date: string;
    status: string;
  }>;
  clientsNeedingAttentionList: Array<{
    id: string;
    name: string;
    reason: string;
    last_contact: string | null;
    days_since_contact?: number;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }>;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  description?: string;
}

export interface NavigationSection {
  name: string;
  items: NavigationItem[];
}
