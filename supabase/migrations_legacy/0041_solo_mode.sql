-- Migration: Solo Mode for Independent Lawyers and Small Firms
-- Description: Adds solo mode tables, policies, and seeds for simplified interface

-- =============================================================================
-- PART 1: Add columns to law_firms table for interface mode
-- =============================================================================

ALTER TABLE public.law_firms
ADD COLUMN IF NOT EXISTS operation_profile TEXT,
ADD COLUMN IF NOT EXISTS interface_mode TEXT DEFAULT 'completa',
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hidden_modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recommended_features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- PART 2: Create tables for Solo Mode features
-- =============================================================================

-- Legal area templates for solo practitioners
CREATE TABLE IF NOT EXISTS public.legal_area_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    area_key TEXT NOT NULL,
    area_name TEXT NOT NULL,
    description TEXT,
    document_templates JSONB DEFAULT '[]',
    contract_clauses JSONB DEFAULT '[]',
    default_checklist JSONB DEFAULT '[]',
    sample_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee proposals for solo practitioners
CREATE TABLE IF NOT EXISTS public.fee_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    service_description TEXT NOT NULL,
    scope TEXT,
    total_amount_cents INTEGER NOT NULL,
    upfront_amount_cents INTEGER DEFAULT 0,
    balance_cents INTEGER NOT NULL,
    installments_count INTEGER DEFAULT 1,
    installment_value_cents INTEGER,
    success_fee_percentage INTEGER,
    included_expenses TEXT,
    excluded_expenses TEXT,
    validity_days INTEGER DEFAULT 15,
    charging_model TEXT DEFAULT 'fixo',
    observations TEXT,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'rascunho',
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receipts for solo practitioners
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    receipt_number TEXT,
    lawyer_name TEXT NOT NULL,
    oab_number TEXT,
    oab_state TEXT,
    client_name TEXT NOT NULL,
    client_document TEXT,
    service_description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_method TEXT,
    payment_date DATE NOT NULL,
    observations TEXT,
    status TEXT DEFAULT 'emitido',
    cancellation_reason TEXT,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Follow-ups/Returns for solo practitioners
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    follow_up_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pendente',
    result TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Intake forms for solo practitioners
CREATE TABLE IF NOT EXISTS public.intake_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    consultation_reason TEXT NOT NULL,
    practice_area TEXT,
    problem_summary TEXT,
    urgency TEXT DEFAULT 'normal',
    has_active_process BOOLEAN DEFAULT false,
    process_number TEXT,
    client_objective TEXT,
    perceived_risks TEXT,
    private_notes TEXT,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'rascunho',
    converted_to_client_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Professional profiles for solo practitioners
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE UNIQUE,
    professional_name TEXT NOT NULL,
    oab_number TEXT,
    oab_state TEXT,
    cnpj TEXT,
    cpf TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    signature_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#64748b',
    bio TEXT,
    specializations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Demo data tracking for solo mode onboarding
CREATE TABLE IF NOT EXISTS public.demo_data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- PART 3: Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_legal_area_templates_firm ON public.legal_area_templates(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_legal_area_templates_area ON public.legal_area_templates(area_key);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_firm ON public.fee_proposals(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_client ON public.fee_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_case ON public.fee_proposals(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_receipts_firm ON public.receipts(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_firm ON public.follow_ups(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_client ON public.follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON public.follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_intake_forms_firm ON public.intake_forms(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_firm ON public.professional_profiles(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_demo_data_firm ON public.demo_data_records(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_demo_data_entity ON public.demo_data_records(entity_type, entity_id);

-- =============================================================================
-- PART 4: RLS Policies for Solo Mode Tables
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.legal_area_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_data_records ENABLE ROW LEVEL SECURITY;

-- Helper function for firm access (reusing existing pattern)
CREATE OR REPLACE FUNCTION public.has_law_firm_access(target_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.law_firm_members
        WHERE law_firm_id = target_firm_id
        AND user_id = auth.uid()
        AND status = 'ativo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for legal_area_templates
CREATE POLICY "legal_area_templates_select" ON public.legal_area_templates
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_insert" ON public.legal_area_templates
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_update" ON public.legal_area_templates
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_delete" ON public.legal_area_templates
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for fee_proposals
CREATE POLICY "fee_proposals_select" ON public.fee_proposals
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_insert" ON public.fee_proposals
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_update" ON public.fee_proposals
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_delete" ON public.fee_proposals
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for receipts
CREATE POLICY "receipts_select" ON public.receipts
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_insert" ON public.receipts
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_update" ON public.receipts
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_delete" ON public.receipts
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for follow_ups
CREATE POLICY "follow_ups_select" ON public.follow_ups
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_insert" ON public.follow_ups
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_update" ON public.follow_ups
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_delete" ON public.follow_ups
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for intake_forms
CREATE POLICY "intake_forms_select" ON public.intake_forms
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_insert" ON public.intake_forms
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_update" ON public.intake_forms
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_delete" ON public.intake_forms
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for professional_profiles
CREATE POLICY "professional_profiles_select" ON public.professional_profiles
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_insert" ON public.professional_profiles
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_update" ON public.professional_profiles
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_delete" ON public.professional_profiles
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for demo_data_records
CREATE POLICY "demo_data_records_select" ON public.demo_data_records
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "demo_data_records_insert" ON public.demo_data_records
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "demo_data_records_delete" ON public.demo_data_records
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- =============================================================================
-- PART 5: Seed Data for Legal Area Templates
-- =============================================================================

INSERT INTO public.legal_area_templates (law_firm_id, area_key, area_name, description, document_templates, contract_clauses, default_checklist, sample_documents)
VALUES
(NULL, 'trabalhista', 'Direito Trabalhista', 'Ações trabalhistas, rescisões, verbas rescisórias, assédio moral e sexual no trabalho.', '[{"name": "Petição Inicial", "type": "peticao"}, {"name": "Contestação", "type": "peticao"}, {"name": "Reclamação Trabalhista", "type": "documento"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 30% sobre o valor total da condenação ou acordo..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas processuais, custas, perícias..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Calcular verbas rescisórias", "done": false}, {"task": "Protocolar reclamação", "done": false}, {"task": "Acompanhar audiência", "done": false}]', '[{"title": "CTPS Anotada", "type": "ctps"}, {"title": "Contracheque", "type": "holerite"}, {"title": "TRCT", "type": "rescisao"}]'),

(NULL, 'previdenciario', 'Direito Previdenciário', 'Aposentadorias, benefícios INSS, revisão de benefícios, auxílio-doença, LOAS.', '[{"name": "Requerimento Administrativo", "type": "requerimento"}, {"name": "Mandado de Segurança", "type": "peticao"}, {"name": "Embargos à Execução", "type": "peticao"}]', '[{"title": "Êxito", "text": "O êxito é alcançado quando o benefício é concedido administrativamente ou judicialmente..."}, {"title": "Honorários", "text": "Na hipótese de ação judicial, os honorários serão de até 30% sobre os atrasados..."}]', '[{"task": "Obter CNIS", "done": false}, {"task": "Calcular tempo de contribuição", "done": false}, {"task": "Analisar requisitos", "done": false}, {"task": "Protocolar requerimento", "done": false}]', '[{"title": "CNIS Completo", "type": "cnis"}, {"title": "Laudo Médico", "type": "laudo"}, {"title": "Documento de Identidade", "type": "doc"}]'),

(NULL, 'familia', 'Direito de Família', 'Divórcios, guarda, alimentos, união estável, partilha, adoção, regulamentação de visitas.', '[{"name": "Petição Inicial de Divórcio", "type": "peticao"}, {"name": "Ação de Alimentos", "type": "peticao"}, {"name": "Guarda Compartilhada", "type": "termo"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 10% sobre o valor da partilha, quando houver..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais, emolumentos e despesas com perícias..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Calcular pensão alimentícia", "done": false}, {"task": "Definir regime de bens", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Certidão de Casamento", "type": "certidao"}, {"title": "Certidão de Nascimento dos Filhos", "type": "certidao"}, {"title": "Comprovante de Renda", "type": "renda"}]'),

(NULL, 'consumidor', 'Direito do Consumidor', 'Ações de indenização, CDC, práticas abusivas, cobrança indevida, vício do produto/serviço.', '[{"name": "Ação de Indenização", "type": "peticao"}, {"name": "Notificação Extrajudicial", "type": "notificacao"}, {"name": "Reclamação no PROCON", "type": "reclamacao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 30% sobre o valor da indenização ou condenação..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas processuais, custas e perícias..."}]', '[{"task": "Analisar contrato", "done": false}, {"task": "Documentar danos", "done": false}, {"task": "Calcular indenização", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Contrato de Compra", "type": "contrato"}, {"title": "Notas Fiscais", "type": "nota"}, {"title": "Fotos/Provas do Dano", "type": "prova"}]'),

(NULL, 'civel', 'Direito Civil Geral', 'Ações possessórias, obrigações, responsabilidade civil, danos, enriquecimento sem causa, nulidades.', '[{"name": "Ação de Obrigação de Fazer", "type": "peticao"}, {"name": "Ação de Indenização", "type": "peticao"}, {"name": "Ação Rescisória", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB/UF ou 30% sobre o proveito econômico..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Identificar causa de pedir", "done": false}, {"task": "Calcular pleito", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Documentos Pessoais", "type": "doc"}, {"title": "Comprovante de Endereço", "type": "endereco"}, {"title": "Provas do Fato", "type": "prova"}]'),

(NULL, 'criminal', 'Direito Criminal', 'Defesa criminal, habeas corpus, flagrante, recursos em geral, compliance criminal.', '[{"name": "Habeas Corpus", "type": "peticao"}, {"name": "Defesa Preliminar", "type": "defesa"}, {"name": "Recurso em Sentido Estrito", "type": "recurso"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de valor fixo ou conforme estipulado em contrato, independentemente do resultado..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas com viagens, estadias, cópias e custas processuais..."}]', '[{"task": "Analisar ficha criminal", "done": false}, {"task": "Reunir provas de defesa", "done": false}, {"task": "Elaborar estratégia", "done": false}, {"task": "Protocolar medida", "done": false}]', '[{"title": "Boletim de Ocorrência", "type": "bo"}, {"title": "Certidão Criminal", "type": "certidao"}, {"title": "Provas de Defesa", "type": "prova"}]'),

(NULL, 'imobiliario', 'Direito Imobiliário', 'Compra e venda, locação, condomínio, usucapião, regularização fundiária, loteamentos.', '[{"name": "Ação de Usucapião", "type": "peticao"}, {"name": "Contrato de Compra e Venda", "type": "contrato"}, {"name": "Ação de Despejo", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 5% a 10% sobre o valor do imóvel ou conforme tabela da OAB..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas cartoriais, registrais e processuais..."}]', '[{"task": "Analisar documentação do imóvel", "done": false}, {"task": "Verificar ônus", "done": false}, {"task": "Elaborar contrato/ação", "done": false}, {"task": "Registrar/protocolar", "done": false}]', '[{"title": "Escritura/Matrícula", "type": "escritura"}, {"title": "Certidão de Ônus", "type": "certidao"}, {"title": "IPTU/Condomínio", "type": "imposto"}]'),

(NULL, 'empresarial', 'Direito Empresarial', 'Contratos, societário, falências e recuperações, propriedade intelectual, startups, M&A.', '[{"name": "Contrato Social", "type": "contrato"}, {"name": "Contrato de Investimento", "type": "contrato"}, {"name": "Pedido de Recuperação Judicial", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB, valor hora ou percentual sobre o valor da transação..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas com registro, publicações, viagens e custas..."}]', '[{"task": "Analisar estrutura societária", "done": false}, {"task": "Revisar contratos", "done": false}, {"task": "Elaborar documentação", "done": false}, {"task": "Registrar/publicar", "done": false}]', '[{"title": "Contrato Social/Alteração", "type": "social"}, {"title": "Certidões de Débitos", "type": "certidao"}, {"title": "Licenças e Alvarás", "type": "licenca"}]'),

(NULL, 'tributario', 'Direito Tributário', 'Contencioso administrativo e judicial, planejamento tributário, recuperação de créditos, compliance.', '[{"name": "Recurso Administrativo", "type": "recurso"}, {"name": "Mandado de Segurança Tributário", "type": "peticao"}, {"name": "Pedido de Compensação", "type": "requerimento"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de percentual sobre o valor do crédito recuperado ou conforme tabela da OAB..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas com perícias contábeis..."}]', '[{"task": "Analisar autos de infração", "done": false}, {"task": "Calcular créditos", "done": false}, {"task": "Elaborar defesa/recurso", "done": false}, {"task": "Acompanhar processo", "done": false}]', '[{"title": "Autos de Infração", "type": "infracao"}, {"title": "Guias de Recolhimento", "type": "guia"}, {"title": "Declarações (DAS, DEFIS)", "type": "declaracao"}]'),

(NULL, 'administrativo', 'Direito Administrativo', 'Licitações, contratos administrativos, improbidade, mandados de segurança, processos disciplinares.', '[{"name": "Mandado de Segurança", "type": "peticao"}, {"name": "Impetração de Habilitação", "type": "peticao"}, {"name": "Defesa em Processo Administrativo", "type": "defesa"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB ou valor fixo estipulado em contrato..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas com publicações..."}]', '[{"task": "Analisar edital/ato", "done": false}, {"task": "Elaborar impugnação/defesa", "done": false}, {"task": "Protocolar medida", "done": false}, {"task": "Acompanhar andamento", "done": false}]', '[{"title": "Edital/Portaria", "type": "edital"}, {"title": "Certidão de Antecedentes", "type": "certidao"}, {"title": "Procuração", "type": "procuracao"}]');

-- =============================================================================
-- PART 6: Insert Solo Plan
-- =============================================================================

INSERT INTO public.plans (id, name, description, price_cents, interval, features, limits, is_active)
VALUES (
    'solo',
    'Solo',
    'Ideal para advogados independentes. Todos os recursos essenciais para gerenciar sua prática individual.',
    7900,
    'month',
    '["all_core_features", "unlimited_documents", "email_support", "basic_reports", "client_portal", "mobile_app", "calendar_sync", "document_templates", "basic_automations"]',
    '{"max_members": 1, "max_clients": 30, "max_cases": 30, "max_contracts": 30, "storage_gb": 10, "api_calls_per_day": 1000}',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    interval = EXCLUDED.interval,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    is_active = EXCLUDED.is_active;

-- =============================================================================
-- PART 7: Insert Solo Feature Flags
-- =============================================================================

INSERT INTO public.feature_flags (id, key, name, description, enabled_by_default, created_at, updated_at)
VALUES
    ('solo_mode', 'solo_mode', 'Modo Solo', 'Interface simplificada para advogados independentes', true, now(), now()),
    ('solo_templates', 'solo_templates', 'Templates de Áreas', 'Templates específicos por área de atuação', true, now(), now()),
    ('solo_receipts', 'solo_receipts', 'Recibos Avulsos', 'Emissão de recibos avulsos sem necessidade de contrato', true, now(), now()),
    ('solo_proposals', 'solo_proposals', 'Propostas de Honorários', 'Criação de propostas de honorários personalizadas', true, now(), now()),
    ('solo_intake', 'solo_intake', 'Fichas de Atendimento', 'Fichas de triagem para novos atendimentos', true, now(), now()),
    ('solo_follow_ups', 'solo_follow_ups', 'Retornos Agendados', 'Sistema de acompanhamento de retornos', true, now(), now());

-- =============================================================================
-- PART 8: Create helper functions
-- =============================================================================

-- Function to switch interface mode
CREATE OR REPLACE FUNCTION public.switch_interface_mode(
    p_firm_id UUID,
    p_mode TEXT
) RETURNS void AS $$
BEGIN
    UPDATE public.law_firms
    SET interface_mode = p_mode,
        updated_at = now()
    WHERE id = p_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear demo data
CREATE OR REPLACE FUNCTION public.clear_demo_data(
    p_firm_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- This is a placeholder - actual implementation would delete demo records
    -- based on demo_data_records table
    SELECT COUNT(*) INTO v_count
    FROM public.demo_data_records
    WHERE law_firm_id = p_firm_id;
    
    DELETE FROM public.demo_data_records
    WHERE law_firm_id = p_firm_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;