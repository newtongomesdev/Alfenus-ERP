-- Safe migration: create missing types, tables, and functions
-- Uses IF NOT EXISTS / EXCEPTION blocks to avoid errors on existing objects

-- ══════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('proprietario','administrador','advogado','assistente','financeiro','colaborador','visualizador');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.record_status AS ENUM ('ativo','inativo','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('novo','em_atendimento','qualificado','convertido','perdido');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('lead','ativo','inativo','inadimplente','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.case_status AS ENUM ('em_analise','documentacao_pendente','ajuizamento','em_andamento','aguardando_decisao','audiencia_marcada','suspenso','encerrado','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('baixa','normal','alta','urgente');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('rascunho','aguardando_assinatura','ativo','quitado','inadimplente','cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.installment_status AS ENUM ('pendente','vencendo','atrasada','paga','parcialmente_paga','cancelada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.deadline_status AS ENUM ('pendente','em_andamento','concluido','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- TABLES (core - from 0001)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  document text,
  email text,
  phone text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan text NOT NULL DEFAULT 'starter',
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.law_firm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'assistente',
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (law_firm_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  document text,
  status public.client_status NOT NULL DEFAULT 'lead',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  title text NOT NULL,
  description text,
  status public.case_status NOT NULL DEFAULT 'em_analise',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  court text,
  case_number text,
  opposing_party text,
  opposing_lawyer text,
  value_cents bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  legal_case_id uuid REFERENCES public.legal_cases(id),
  service_description text NOT NULL,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  upfront_amount_cents bigint NOT NULL DEFAULT 0,
  balance_cents bigint NOT NULL DEFAULT 0,
  has_installments boolean NOT NULL DEFAULT false,
  installments_count integer NOT NULL DEFAULT 1,
  first_due_date date,
  frequency text DEFAULT 'unica',
  payment_method text,
  responsible_member_id uuid REFERENCES public.law_firm_members(id),
  status public.contract_status NOT NULL DEFAULT 'rascunho',
  success_fee boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  number integer NOT NULL CHECK (number >= 1),
  original_amount_cents bigint NOT NULL CHECK (original_amount_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  fine_cents bigint NOT NULL DEFAULT 0 CHECK (fine_cents >= 0),
  interest_cents bigint NOT NULL DEFAULT 0 CHECK (interest_cents >= 0),
  final_amount_cents bigint NOT NULL CHECK (final_amount_cents >= 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  paid_amount_cents bigint NOT NULL DEFAULT 0 CHECK (paid_amount_cents >= 0),
  payment_method text,
  status public.installment_status NOT NULL DEFAULT 'pendente',
  receipt_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, number)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  installment_id uuid REFERENCES public.installments(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  payment_method text NOT NULL,
  paid_at timestamptz NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  fine_cents bigint NOT NULL DEFAULT 0,
  interest_cents bigint NOT NULL DEFAULT 0,
  receipt_path text,
  notes text,
  registered_by uuid REFERENCES public.law_firm_members(id),
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLES (Fase 2 - from 0022-0032)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled_by_default boolean NOT NULL DEFAULT false,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_id, law_firm_id)
);

CREATE TABLE IF NOT EXISTS public.deadline_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  deadline_id uuid,
  publication_id uuid,
  tribunal text NOT NULL,
  jurisdition text,
  procedure_type text,
  rule_description text,
  disponibilized_at date,
  published_at date,
  knowledge_at date,
  start_date date NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'dias',
  business_days boolean NOT NULL DEFAULT true,
  include_start_date boolean NOT NULL DEFAULT false,
  include_end_date boolean NOT NULL DEFAULT false,
  calculated_date date,
  adjusted_date date,
  adjustment_reason text,
  calendar_id uuid,
  holidays_considered text[] DEFAULT '{}',
  suspensions_considered text[] DEFAULT '{}',
  calculated_by uuid,
  calculated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'rascunho',
  version integer NOT NULL DEFAULT 1,
  previous_version_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  calendar_name text NOT NULL,
  jurisdiction text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.legal_calendars(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.process_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  legal_case_id uuid,
  client_id uuid,
  description text NOT NULL,
  category text NOT NULL,
  original_value bigint,
  updated_value bigint,
  base_date date,
  status text NOT NULL DEFAULT 'aberto',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  legal_case_id uuid,
  classification text NOT NULL,
  score integer,
  factors jsonb DEFAULT '[]',
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  legal_case_id uuid,
  provision_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judicial_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  guarantee_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  entity text,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judicial_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  deposit_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  entity text,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seizures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  seizure_type text NOT NULL,
  target text,
  value_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.court_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  release_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  released_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  balance_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  transaction_type text NOT NULL,
  amount_cents bigint NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  legal_case_id uuid,
  amount_cents bigint NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  reconciled_by uuid,
  balance_before_cents bigint NOT NULL,
  balance_after_cents bigint NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  opening_balance_cents bigint NOT NULL DEFAULT 0,
  closing_balance_cents bigint NOT NULL DEFAULT 0,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  type_name text NOT NULL,
  description text,
  sla_hours integer,
  requires_approval boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_type_id uuid REFERENCES public.legal_request_types(id),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id),
  legal_case_id uuid,
  requester_member_id uuid,
  assigned_member_id uuid,
  status text NOT NULL DEFAULT 'aberto',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  sla_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  assigned_member_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  approver_member_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  sender_member_id uuid,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  requester_member_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  legal_case_id uuid,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'outro',
  status text NOT NULL DEFAULT 'rascunho',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  category text,
  content text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id),
  clause_name text NOT NULL,
  clause_text text NOT NULL,
  category text,
  is_mandatory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  version_number integer NOT NULL DEFAULT 1,
  content text,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.contract_versions(id),
  approver_member_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  obligation_text text NOT NULL,
  responsible_member_id uuid,
  due_date date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  amendment_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  party_name text NOT NULL,
  party_document text,
  contact_name text,
  contact_email text,
  contact_phone text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.form_builders(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  options jsonb DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.form_builders(id),
  submitted_by uuid,
  submission_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'recebido',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid,
  professional_name text NOT NULL,
  specialty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents bigint DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.scheduling_professionals(id),
  service_id uuid REFERENCES public.scheduling_services(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.scheduling_slots(id),
  client_id uuid REFERENCES public.clients(id),
  booking_status text NOT NULL DEFAULT 'confirmado',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  sender_member_id uuid,
  recipient_member_id uuid,
  client_id uuid REFERENCES public.clients(id),
  subject text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'interno',
  status text NOT NULL DEFAULT 'enviado',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  communication_id uuid NOT NULL REFERENCES public.communications(id),
  parent_id uuid,
  sender_member_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  communication_id uuid NOT NULL REFERENCES public.communications(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  consent_type text NOT NULL,
  purpose text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  request_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'recebido',
  deadline date,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  data_category text NOT NULL,
  retention_days integer NOT NULL,
  action_after_expiry text NOT NULL DEFAULT 'arquivar',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_data_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  classification_name text NOT NULL,
  description text,
  sensitivity_level text NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- RPC FUNCTIONS
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_payment(
  p_law_firm_id uuid,
  p_installment_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_discount_cents bigint DEFAULT 0,
  p_fine_cents bigint DEFAULT 0,
  p_interest_cents bigint DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_registered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_contract_id uuid;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
  v_remaining bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode registrar pagamentos', v_member.role;
  END IF;

  IF p_registered_by IS NOT NULL AND p_registered_by != v_caller_id THEN
    RAISE EXCEPTION 'registered_by deve corresponder ao usuário autenticado';
  END IF;

  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = p_installment_id AND law_firm_id = p_law_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE installment_id = p_installment_id
      AND amount_cents = p_amount_cents
      AND paid_at::date = p_paid_at::date
      AND reversed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pagamento duplicado detectado';
  END IF;

  v_remaining := v_installment.final_amount_cents - v_installment.paid_amount_cents;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF p_amount_cents > v_remaining THEN
    RAISE EXCEPTION 'Valor excede o saldo da parcela (R$ %)', (v_remaining / 100.0)::text;
  END IF;

  v_new_paid := v_installment.paid_amount_cents + p_amount_cents;
  v_contract_id := v_installment.contract_id;

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      paid_at = p_paid_at,
      payment_method = p_payment_method,
      status = v_new_status::installment_status,
      discount_cents = installments.discount_cents + p_discount_cents,
      fine_cents = installments.fine_cents + p_fine_cents,
      interest_cents = installments.interest_cents + p_interest_cents,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_installment_id;

  INSERT INTO public.payments (
    law_firm_id, installment_id, client_id, contract_id,
    amount_cents, payment_method, paid_at,
    discount_cents, fine_cents, interest_cents,
    notes, registered_by
  ) VALUES (
    p_law_firm_id, p_installment_id, v_installment.client_id, v_contract_id,
    p_amount_cents, p_payment_method, p_paid_at,
    p_discount_cents, p_fine_cents, p_interest_cents,
    p_notes, p_registered_by
  ) RETURNING id INTO v_payment_id;

  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text, timestamptz, bigint, bigint, bigint, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_law_firm_id uuid,
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode estornar pagamentos', v_member.role;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND law_firm_id = p_law_firm_id AND reversed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  UPDATE public.payments
  SET reversed_at = now(),
      reversal_reason = p_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = v_payment.installment_id
  FOR UPDATE;

  v_new_paid := GREATEST(v_installment.paid_amount_cents - v_payment.amount_cents, 0);

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      status = v_new_status::installment_status,
      updated_at = now()
  WHERE id = v_payment.installment_id;

  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_payment.contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_payment.contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_payment(uuid, uuid, text) TO authenticated;

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tenant select law_firms" ON public.law_firms FOR SELECT USING (id IN (SELECT law_firm_id FROM public.law_firm_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select law_firm_members" ON public.law_firm_members FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select clients" ON public.clients FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select legal_cases" ON public.legal_cases FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select contracts" ON public.contracts FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select installments" ON public.installments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select payments" ON public.payments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "financial roles write payments" ON public.payments FOR ALL USING (public.has_law_firm_role(law_firm_id, ARRAY['proprietario','administrador','financeiro']::public.member_role[])) WITH CHECK (public.has_law_firm_role(law_firm_id, ARRAY['proprietario','administrador','financeiro']::public.member_role[]));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
