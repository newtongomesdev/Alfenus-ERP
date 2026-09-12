/**
 * Solo Pro Constants
 * Rules definitions, health thresholds, and operational configuration
 */

import type {
  RecommendationPriority,
  RecommendationType,
  HealthStatus,
  HealthStatusConfig,
} from "./types";

// ── Health Status Definitions ─────────────────────────────────────

export const HEALTH_STATUS_CONFIG: Record<HealthStatus, HealthStatusConfig> = {
  organizado: {
    status: "organizado",
    label: "Organizado",
    color: "green",
    description: "Seu escritório está bem organizado. Continue assim!",
  },
  atencao: {
    status: "atencao",
    label: "Atenção",
    color: "yellow",
    description: "Alguns pontos precisam de sua atenção para evitar problemas.",
  },
  pendente: {
    status: "pendente",
    label: "Pendente",
    color: "orange",
    description: "Existem pendências que devem ser resolvidas em breve.",
  },
  critico: {
    status: "critico",
    label: "Crítico",
    color: "red",
    description: "Existem problemas que precisam ser resolvidos imediatamente.",
  },
};

// ── Health Score Thresholds ────────────────────────────────────────

export const HEALTH_SCORE_THRESHOLDS = {
  organizado: 80,
  atencao: 60,
  pendente: 40,
  critico: 0,
};

// ── Operational Rule Definitions ───────────────────────────────────

export interface RuleDefinition {
  key: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  actionLabel: string;
  actionUrl: string;
  entityTypes: string[];
  evaluationLogic: string;
}

export const OPERATIONAL_RULES: RuleDefinition[] = [
  {
    key: "leads_without_return",
    type: "clientes",
    title: "Leads sem retorno",
    description: "Você possui leads sem resposta há mais de dois dias. Converta-os para clientes.capture o contato o mais rápido possível.",
    priority: "atencao",
    actionLabel: "Ver leads",
    actionUrl: "/clientes?filter=leads",
    entityTypes: ["lead"],
    evaluationLogic: "leads_com_status_novo_ou_aguardando_retorno_mais_de_2_dias",
  },
  {
    key: "proposals_expiring_soon",
    type: "propostas",
    title: "Propostas prestes a vencer",
    description: "Esta proposta vence amanhã e ainda não recebeu resposta. Entre em contato com o cliente para confirmar interesse.",
    priority: "importante",
    actionLabel: "Ver propostas",
    actionUrl: "/propostas",
    entityTypes: ["fee_proposal"],
    evaluationLogic: "propostas_enviadas_com_vencimento_proximo",
  },
  {
    key: "cases_without_next_action",
    type: "juridico",
    title: "Processos sem próxima ação",
    description: "Este processo não possui próxima ação definida. Defina uma ação para manter o caso em andamento.",
    priority: "importante",
    actionLabel: "Ver processos",
    actionUrl: "/processos",
    entityTypes: ["legal_case"],
    evaluationLogic: "processosativos_sem_proxima_acao",
  },
  {
    key: "overdue_installments_no_charge",
    type: "financeiro",
    title: "Parcelas atrasadas sem cobrança",
    description: "Existem parcelas atrasadas sem registro de cobrança. Entre em contato com o cliente para regularizar.",
    priority: "critica",
    actionLabel: "Ver financeiro",
    actionUrl: "/financeiro",
    entityTypes: ["installment"],
    evaluationLogic: "parcelas_atrasadas_sem_pagamento",
  },
  {
    key: "monthly_recovery_insufficient",
    type: "financeiro",
    title: "Baixa recebimento mensal",
    description: "O valor recebido no mês está abaixo do previsto. Revise suas cobranças e contatos com clientes.",
    priority: "atencao",
    actionLabel: "Ver financeiro",
    actionUrl: "/financeiro",
    entityTypes: ["payment", "installment"],
    evaluationLogic: "recebimento_mensal_abaixo_do_esperado",
  },
  {
    key: "referral_clients_this_quarter",
    type: "clientes",
    title: "Clientes por indicação",
    description: "Você recebeu clientes por indicação neste trimestre. Isso é um bom sinal de satisfação dos seus clientes.",
    priority: "informativa",
    actionLabel: "Ver clientes",
    actionUrl: "/clientes",
    entityTypes: ["client"],
    evaluationLogic: "clientes_por_indicacao_no_trimestre",
  },
  {
    key: "pending_documents_audience",
    type: "juridico",
    title: "Documentos pendentes para audiência",
    description: "Existem documentos pendentes para audiência da próxima semana. Prepare os documentos necessários.",
    priority: "importante",
    actionLabel: "Ver documentos",
    actionUrl: "/documentos",
    entityTypes: ["deadline"],
    evaluationLogic: "documentos_pendentes_para_audiencia",
  },
  {
    key: "tasks_over_capacity",
    type: "produtividade",
    title: "Tarefas acima da capacidade",
    description: "Você está com mais tarefas previstas do que sua capacidade diária. Priorize as tarefas mais importantes.",
    priority: "importante",
    actionLabel: "Ver tarefas",
    actionUrl: "/tarefas",
    entityTypes: ["task"],
    evaluationLogic: "tarefas_acima_da_capacidade_diaria",
  },
  {
    key: "client_no_update_30days",
    type: "clientes",
    title: "Cliente sem atualização há 30 dias",
    description: "O cliente não recebe uma atualização há 30 dias. Entre em contato para manter o relacionamento.",
    priority: "atencao",
    actionLabel: "Ver clientes",
    actionUrl: "/clientes",
    entityTypes: ["client"],
    evaluationLogic: "cliente_sem_atualizacao_ha_30_dias",
  },
  {
    key: "contract_active_no_installment",
    type: "financeiro",
    title: "Contrato ativo sem parcela gerada",
    description: "O contrato está ativo, mas ainda não há parcela gerada. Verifique se o contrato está corretamente configurado.",
    priority: "importante",
    actionLabel: "Ver contratos",
    actionUrl: "/contratos",
    entityTypes: ["contract", "installment"],
    evaluationLogic: "contrato_ativo_sem_parcela",
  },
  {
    key: "deadline_without_review",
    type: "juridico",
    title: "Prazo cadastrado sem revisão",
    description: "Existe prazo cadastrado sem revisão. Revise o prazo para garantir que está correto.",
    priority: "atencao",
    actionLabel: "Ver prazos",
    actionUrl: "/prazos",
    entityTypes: ["deadline"],
    evaluationLogic: "prazo_sem_revisao",
  },
  {
    key: "proposal_template_not_configured",
    type: "configuracao",
    title: "Modelo de proposta não configurado",
    description: "Você ainda não configurou um modelo de proposta. Configure para criar propostas mais rapidamente.",
    priority: "informativa",
    actionLabel: "Configurar modelos",
    actionUrl: "/documentos/modelos",
    entityTypes: ["fee_proposal"],
    evaluationLogic: "modelo_proposta_nao_configurado",
  },
];

// ── Setup Diagnostic Question Labels ───────────────────────────────

export const DIAGNOSTIC_QUESTION_LABELS: Record<string, string> = {
  practice_areas: "Em quais áreas atua?",
  has_clients: "Já possui clientes?",
  has_cases: "Já possui processos?",
  practice_type: "Trabalha somente com atendimento particular?",
  charging_model: "Cobrar valor fixo, parcelas, êxito ou mensalidade?",
  has_recurring_expenses: "Possui despesas recorrentes?",
  uses_spreadsheet: "Usa planilhas?",
  uses_external_calendar: "Usa agenda externa?",
  has_website: "Possui site?",
  receives_referrals: "Recebe clientes por indicação?",
  work_location: "Trabalha em casa, coworking ou escritório?",
  intends_hire: "Pretende contratar alguém?",
  hours_per_week: "Quantas horas por semana pretende trabalhar?",
  monthly_revenue_goal: "Qual é sua meta mensal de receita?",
  new_clients_goal: "Qual é sua meta de novos clientes?",
  biggest_problem: "Qual é seu maior problema atual?",
};

// ── Diagnostic Answer Labels ───────────────────────────────────────

export const DIAGNOSTIC_ANSWER_LABELS: Record<string, Record<string, string>> = {
  has_clients: { sim: "Sim", nao: "Não" },
  has_cases: { sim: "Sim", nao: "Não" },
  practice_type: { sim: "Somente particular", nao: "Não só particular", parcialmente: "Parcialmente" },
  charging_model: {
    fixo: "Valor fixo",
    parcelas: "Parcelas",
    exito: "Êxito",
    mensalidade: "Mensalidade",
    misto: "Misto",
  },
  has_recurring_expenses: { sim: "Sim", nao: "Não" },
  uses_spreadsheet: { sim: "Sim", nao: "Não", "pretendo usar": "Pretendo usar" },
  uses_external_calendar: { sim: "Sim", nao: "Não", "pretendo usar": "Pretendo usar" },
  has_website: { sim: "Sim", nao: "Não", "pretendo criar": "Pretendo criar" },
  receives_referrals: { sim: "Sim", nao: "Não", parcialmente: "Parcialmente" },
  work_location: { casa: "Casa", coworking: "Coworking", escritorio: "Escritório" },
  intends_hire: { sim: "Sim", nao: "Não", futuramente: "Futuramente" },
  hours_per_week: { "20": "20h", "30": "30h", "40": "40h", "50": "50h", "60": "60h" },
  monthly_revenue_goal: {
    ate_5000: "Até R$ 5.000",
    "5000_10000": "R$ 5.000 – R$ 10.000",
    "10000_20000": "R$ 10.000 – R$ 20.000",
    "20000_30000": "R$ 20.000 – R$ 30.000",
    "acima_30000": "Acima de R$ 30.000",
  },
  new_clients_goal: {
    ate_2: "Até 2 clientes",
    "3_5": "3 a 5 clientes",
    "6_10": "6 a 10 clientes",
    "acima_10": "Acima de 10 clientes",
  },
  biggest_problem: {
    falta_clientes: "Falta de clientes",
    perda_prazos: "Perda de prazos",
    falta_cobranca: "Falta de cobrança",
    desorganizacao: "Desorganização",
    falta_tempo: "Falta de tempo",
    falta_documento: "Falta de documentos",
  },
};

// ── Priority Colors ────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  informativa: "blue",
  atencao: "yellow",
  importante: "orange",
  critica: "red",
};

export const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  informativa: "Informativa",
  atencao: "Atenção",
  importante: "Importante",
  critica: "Crítica",
};

export const PRIORITY_ICONS: Record<RecommendationPriority, string> = {
  informativa: "info",
  atencao: "alert-triangle",
  importante: "alert-circle",
  critica: "alert-octagon",
};

// ── Status Colors ──────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  ativa: "blue",
  visualizada: "gray",
  adiada: "yellow",
  concluida: "green",
  dispensada: "gray",
  expirada: "red",
};

export const STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  visualizada: "Visualizada",
  adiada: "Adiada",
  concluida: "Concluída",
  dispensada: "Dispensada",
  expirada: "Expirada",
};

// ── Rule Type Labels ───────────────────────────────────────────────

export const RULE_TYPE_LABELS: Record<RecommendationType, string> = {
  clientes: "Clientes",
  propostas: "Propostas",
  juridico: "Jurídico",
  financeiro: "Financeiro",
  produtividade: "Produtividade",
  configuracao: "Configuração",
};

// ── Solo Pro Navigation Sections ───────────────────────────────────

export const SOLO_PRO_NAVIGATION = [
  {
    name: "Principal",
    items: [
      { name: "Meu Dia", href: "/meu-dia", icon: "sun", description: "Visão do dia" },
      { name: "Meu Escritório", href: "/meu-escritorio", icon: "building", description: "Central do escritório" },
      { name: "Dashboard", href: "/dashboard", icon: "layout-dashboard", description: "Visão geral" },
    ],
  },
  {
    name: "Comercial",
    items: [
      { name: "Clientes", href: "/clientes", icon: "users", description: "Gestão de clientes" },
      { name: "Contatos", href: "/clientes?filter=leads", icon: "contact", description: "Novos contatos" },
      { name: "Consultas", href: "/atendimentos", icon: "clipboard-list", description: "Atendimentos" },
      { name: "Propostas", href: "/propostas", icon: "file-plus", description: "Propostas de honorários" },
      { name: "Serviços", href: "/servicos", icon: "briefcase", description: "Catálogo de serviços" },
      { name: "Indicações", href: "/clientes?source=indicacao", icon: "link", description: "Clientes por indicação" },
    ],
  },
  {
    name: "Jurídico",
    items: [
      { name: "Processos", href: "/processos", icon: "briefcase", description: "Casos e processos" },
      { name: "Contratos", href: "/contratos", icon: "file-text", description: "Gestão de contratos" },
      { name: "Prazos", href: "/prazos", icon: "clock", description: "Prazos processuais" },
      { name: "Retornos", href: "/retornos", icon: "phone", description: "Acompanhamento de retornos" },
      { name: "Relatórios ao Cliente", href: "/relatorios/clientes", icon: "file-text", description: "Relatórios para clientes" },
    ],
  },
  {
    name: "Gestão",
    items: [
      { name: "Tarefas", href: "/tarefas", icon: "check-square", description: "Lista de tarefas" },
      { name: "Modelos", href: "/documentos/modelos", icon: "file-code", description: "Modelos de documentos" },
      { name: "Agenda", href: "/agenda", icon: "calendar", description: "Compromissos" },
      { name: "Documentos", href: "/documentos", icon: "file", description: "Documentos" },
      { name: "Revisão Semanal", href: "/revisao-semanal", icon: "refresh-cw", description: "Revisão semanal" },
    ],
  },
  {
    name: "Financeiro",
    items: [
      { name: "Financeiro", href: "/financeiro", icon: "dollar-sign", description: "Controle financeiro" },
      { name: "Recibos", href: "/recibos", icon: "receipt", description: "Recibos avulsos" },
      { name: "Fluxo de Caixa", href: "/financeiro/fluxo", icon: "trending-up", description: "Fluxo de caixa" },
      { name: "Despesas Recorrentes", href: "/financeiro/despesas", icon: "repeat", description: "Despesas recorrentes" },
      { name: "Reservas", href: "/financeiro/reservas", icon: "piggy-bank", description: "Reservas financeiras" },
    ],
  },
  {
    name: "Configurações",
    items: [
      { name: "Perfil Profissional", href: "/configuracoes/perfil-profissional", icon: "user-circle", description: "Dados profissionais" },
      { name: "Página Pública", href: "/p/configurar", icon: "globe", description: "Perfil público" },
      { name: "Configurações", href: "/configuracoes", icon: "settings", description: "Configurações gerais" },
      { name: "Relatórios", href: "/relatorios/solo", icon: "bar-chart-2", description: "Relatórios solo" },
    ],
  },
];

// ── Meu Escritório Tab Definitions ─────────────────────────────────

export const MEU_ESCRITORIO_TABS = [
  { key: "hoje", label: "Hoje", icon: "sun" },
  { key: "clientes", label: "Clientes", icon: "users" },
  { key: "juridico", label: "Jurídico", icon: "briefcase" },
  { key: "financeiro", label: "Financeiro", icon: "dollar-sign" },
  { key: "crescimento", label: "Crescimento", icon: "trending-up" },
];

// ── Disclaimer Text ────────────────────────────────────────────────

export const SOLO_PRO_DISCLAIMER = "Esta ferramenta organiza os parâmetros definidos pelo próprio profissional. Revise os valores conforme o caso, a regulamentação aplicável e sua estratégia profissional. Não constituía aconselhamento jurídico, financeiro ou contábil.";

// ── Privacy Settings ───────────────────────────────────────────────

export const PRIVACY_SETTINGS_KEYS = {
  hide_values: "hide_values",
  discreet_mode: "discreet_mode",
  block_notification_preview: "block_notification_preview",
  require_reauth_finance: "require_reauth_finance",
  hide_client_names: "hide_client_names",
  clear_offline_data: "clear_offline_data",
  auto_lock_timeout: "auto_lock_timeout",
  presentation_mode: "presentation_mode",
};

export const PRIVACY_SETTINGS_DEFAULTS = {
  hide_values: false,
  discreet_mode: false,
  block_notification_preview: false,
  require_reauth_finance: false,
  hide_client_names: false,
  clear_offline_data: false,
  auto_lock_timeout: 15,
  presentation_mode: false,
};