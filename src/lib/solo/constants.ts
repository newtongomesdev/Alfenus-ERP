/**
 * Solo Mode Constants
 * Configuration, modules, and constants for solo mode
 */

import type { OperationProfile, InterfaceMode, ModuleKey, NavigationSection } from "./types";

export const OPERATION_PROFILES: { value: OperationProfile; label: string; description: string }[] = [
  {
    value: "advogado_independente",
    label: "Advogado Independente",
    description: "Um único profissional atuando sozinho, sem equipe",
  },
  {
    value: "escritorio_pequeno",
    label: "Escritório Pequeno",
    description: "Até 5 advogados, estrutura enxuta",
  },
  {
    value: "escritorio_com_equipe",
    label: "Escritório com Equipe",
    description: "Mais de 5 advogados, com equipe de apoio",
  },
  {
    value: "departamento_juridico",
    label: "Departamento Jurídico",
    description: "Setor jurídico de empresa ou órgão público",
  },
  {
    value: "personalizado",
    label: "Personalizado",
    description: "Configuração customizada",
  },
];

export const INTERFACE_MODES: { value: InterfaceMode; label: string; description: string }[] = [
  {
    value: "simples",
    label: "Modo Solo",
    description: "Interface simplificada com apenas os recursos essenciais",
  },
  {
    value: "completa",
    label: "Modo Completo",
    description: "Todos os recursos do sistema",
  },
  {
    value: "personalizada",
    label: "Personalizada",
    description: "Selecione quais módulos deseja exibir",
  },
];

// Default modules enabled in solo mode
export const SOLO_DEFAULT_MODULES: ModuleKey[] = [
  "meu_dia",
  "clientes",
  "processos",
  "contratos",
  "financeiro",
  "prazos",
  "agenda",
  "tarefas",
  "documentos",
  "modelos",
  "relatorios",
  "propostas",
  "recibos",
  "retornos",
  "fichas_atendimento",
  "perfil_profissional",
  "notificacoes",
  "configuracoes",
];

// Modules hidden in solo mode (only shown in completa)
export const SOLO_HIDDEN_MODULES: ModuleKey[] = [
  "admin",
  "equipe",
  "despesas",
  "horas",
  "portal_cliente",
  "automacoes",
  "custos_processuais",
  "procuracoes",
  "correspondentes",
  "checklists",
];

// Module metadata
export const MODULE_INFO: Record<ModuleKey, { name: string; description: string; icon: string; solo?: boolean }> = {
  // Core
  dashboard: { name: "Dashboard", description: "Visão geral do escritório", icon: "layout-dashboard", solo: true },
  meu_dia: { name: "Meu Dia", description: "Tarefas e compromissos do dia", icon: "sun", solo: true },
  clientes: { name: "Clientes", description: "Gestão de clientes", icon: "users", solo: true },
  processos: { name: "Processos", description: "Casos e processos", icon: "briefcase", solo: true },
  contratos: { name: "Contratos", description: "Gestão de contratos", icon: "file-text", solo: true },
  financeiro: { name: "Financeiro", description: "Controle financeiro", icon: "dollar-sign", solo: true },
  prazos: { name: "Prazos", description: "Gestão de prazos processuais", icon: "clock", solo: true },
  agenda: { name: "Agenda", description: "Compromissos e eventos", icon: "calendar", solo: true },
  tarefas: { name: "Tarefas", description: "Lista de tarefas", icon: "check-square", solo: true },
  documentos: { name: "Documentos", description: "Gestão de documentos", icon: "file", solo: true },

  // Solo-specific
  propostas: { name: "Propostas", description: "Propostas de honorários", icon: "file-plus", solo: true },
  recibos: { name: "Recibos", description: "Recibos avulsos", icon: "receipt", solo: true },
  retornos: { name: "Retornos", description: "Acompanhamento de retornos", icon: "phone", solo: true },
  fichas_atendimento: { name: "Fichas de Atendimento", description: "Triagem de novos clientes", icon: "clipboard-list", solo: true },
  perfil_profissional: { name: "Perfil Profissional", description: "Configuração do profissional", icon: "user-circle", solo: true },

  // General
  relatorios: { name: "Relatórios", description: "Relatórios e análises", icon: "bar-chart-2", solo: true },
  modelos: { name: "Modelos", description: "Modelos de documentos", icon: "file-code", solo: true },
  notificacoes: { name: "Notificações", description: "Central de notificações", icon: "bell", solo: true },
  configuracoes: { name: "Configurações", description: "Configurações do sistema", icon: "settings", solo: true },

  // Enterprise only (hidden in solo)
  admin: { name: "Administração", description: "Painel administrativo", icon: "shield" },
  equipe: { name: "Equipe", description: "Gestão de equipe", icon: "users" },
  despesas: { name: "Despesas", description: "Controle de despesas", icon: "credit-card" },
  horas: { name: "Horas", description: "Registro de horas", icon: "clock" },
  portal_cliente: { name: "Portal do Cliente", description: "Portal para clientes", icon: "globe" },
  automacoes: { name: "Automações", description: "Automações de workflow", icon: "zap" },
  custos_processuais: { name: "Custos Processuais", description: "Gestão de custos", icon: "dollar-sign" },
  procuracoes: { name: "Procurações", description: "Gestão de procurações", icon: "file-signature" },
  correspondentes: { name: "Correspondentes", description: "Rede de correspondentes", icon: "map-pin" },
  checklists: { name: "Checklists", description: "Checklists de processos", icon: "list-checks" },
};

// Practice areas for solo mode
export const PRACTICE_AREAS = [
  { key: "trabalhista", name: "Direito Trabalhista", icon: "briefcase" },
  { key: "previdenciario", name: "Direito Previdenciário", icon: "shield" },
  { key: "familia", name: "Direito de Família", icon: "heart" },
  { key: "consumidor", name: "Direito do Consumidor", icon: "shopping-cart" },
  { key: "civel", name: "Direito Civil", icon: "scale" },
  { key: "criminal", name: "Direito Criminal", icon: "gavel" },
  { key: "imobiliario", name: "Direito Imobiliário", icon: "home" },
  { key: "empresarial", name: "Direito Empresarial", icon: "building" },
  { key: "tributario", name: "Direito Tributário", icon: "calculator" },
  { key: "administrativo", name: "Direito Administrativo", icon: "landmark" },
  { key: "outro", name: "Outra Área", icon: "folder" },
];

// Charge message templates for WhatsApp
export const CHARGE_MESSAGE_TEMPLATES = [
  {
    id: "cobranca_amigavel",
    name: "Cobrança Amigável",
    message: "Olá {cliente}! Tudo bem?\n\nPassando para lembrar que a parcela {parcela} do contrato {contrato} venceu em {vencimento}.\n\nValor: R$ {valor}\n\nCaso já tenha efetuado o pagamento, desconsidere esta mensagem.\n\nObrigado!",
  },
  {
    id: "cobranca_urgente",
    name: "Cobrança Urgente",
    message: "Olá {cliente},\n\nGostaria de conversar sobre a parcela {parcela} do nosso contrato que venceu em {vencimento} e ainda não foi quitada.\n\nValor em aberto: R$ {valor}\n\nÉ importante regularizarmos isso para evitar maiores complicações. Podemos conversar?\n\nAguardo seu retorno.",
  },
  {
    id: "parcelamento_negociado",
    name: "Proposta de Parcelamento",
    message: "Prezado(a) {cliente},\n\nConforme conversamos, segue proposta para regularização do débito:\n\nValor total: R$ {valor_total}\nEntrada: R$ {entrada}\nParcelamento: {quantidade}x de R$ {valor_parcela}\n\nCaso concorde, enviarei o contrato de renegociação.\n\nAguardo sua confirmação.",
  },
  {
    id: "notificacao_judicial",
    name: "Notificação Pré-Judicial",
    message: "{cliente},\n\nVimos por meio desta notificá-lo(a) sobre a inadimplência do contrato {contrato}, com saldo devedor de R$ {valor}.\n\nCaso não haja regularização no prazo de {prazo} dias, serão tomadas medidas judiciais cabíveis para recuperação do crédito, com incidência de custas, honorários advocatícios de até 20% e correção monetária.\n\nRegularize seu débito e evite maiores complicações.",
  },
  {
    id: "confirmacao_recebimento",
    name: "Confirmação de Recebimento",
    message: "Olá {cliente}!\n\nConfirmo o recebimento do pagamento da parcela {parcela} no valor de R$ {valor}.\n\nAgradeço a pontualidade!\n\nQualquer dúvida, estou à disposição.",
  },
];

// Quick action items for solo mode
export const QUICK_ACTIONS = [
  { id: "new_client", name: "Novo Cliente", icon: "user-plus", href: "/clientes/novo", color: "blue" },
  { id: "new_case", name: "Novo Caso", icon: "briefcase", href: "/processos/novo", color: "indigo" },
  { id: "new_contract", name: "Novo Contrato", icon: "file-text", href: "/contratos/novo", color: "emerald" },
  { id: "new_receipt", name: "Emitir Recibo", icon: "receipt", href: "/recibos/novo", color: "amber" },
  { id: "new_proposal", name: "Proposta", icon: "file-plus", href: "/propostas/nova", color: "violet" },
  { id: "new_intake", name: "Ficha Atendimento", icon: "clipboard-list", href: "/atendimentos/novo", color: "rose" },
];

// Solo plan limits
export const SOLO_PLAN_LIMITS = {
  max_members: 1,
  max_clients: 30,
  max_cases: 30,
  max_contracts: 30,
  storage_gb: 10,
  api_calls_per_day: 1000,
};

// Feature flags for solo mode
export const SOLO_FEATURES = [
  { key: "solo_mode", name: "Modo Solo", enabled: true },
  { key: "solo_templates", name: "Templates de Áreas", enabled: true },
  { key: "solo_receipts", name: "Recibos Avulsos", enabled: true },
  { key: "solo_proposals", name: "Propostas de Honorários", enabled: true },
  { key: "solo_intake", name: "Fichas de Atendimento", enabled: true },
  { key: "solo_follow_ups", name: "Retornos Agendados", enabled: true },
  { key: "solo_finance", name: "Financeiro Simplificado", enabled: true },
];

// Onboarding steps for solo mode
export const SOLO_ONBOARDING_STEPS = [
  { id: "profile", name: "Perfil Profissional", description: "Configure suas informações profissionais" },
  { id: "practice_areas", name: "Áreas de Atuação", description: "Selecione suas áreas de atuação" },
  { id: "first_client", name: "Primeiro Cliente", description: "Cadastre seu primeiro cliente" },
  { id: "first_case", name: "Primeiro Caso", description: "Crie seu primeiro caso" },
  { id: "explore", name: "Explore o Sistema", description: "Conheça os recursos disponíveis" },
];

// Priority levels for follow-ups
export const PRIORITY_LEVELS = [
  { value: "baixa", label: "Baixa", color: "gray" },
  { value: "normal", label: "Normal", color: "blue" },
  { value: "alta", label: "Alta", color: "orange" },
  { value: "urgente", label: "Urgente", color: "red" },
];

// Follow-up types
export const FOLLOW_UP_TYPES: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  visita: "Visita",
  outro: "Outro",
};

// Follow-up statuses
export const FOLLOW_UP_STATUSES: Record<string, string> = {
  pendente: "Pendente",
  realizado: "Realizado",
  cancelado: "Cancelado",
  adiado: "Adiado",
};

// Intake urgency levels
export const INTAKE_URGENCY_LEVELS = [
  { value: "baixa", label: "Baixa", description: "Pode aguardar alguns dias", color: "gray" },
  { value: "normal", label: "Normal", description: "Atendimento regular", color: "blue" },
  { value: "alta", label: "Alta", description: "Requer atenção prioritária", color: "orange" },
  { value: "urgente", label: "Urgente", description: "Situação emergencial", color: "red" },
];

// Proposal charging models
export const PROPOSAL_CHARGING_MODELS = [
  { value: "fixo", label: "Valor Fixo", description: "Honorário fixo independente do resultado" },
  { value: "exito", label: "Êxito", description: "Percentual sobre o resultado obtido" },
  { value: "fixo_exito", label: "Fixo + Êxito", description: "Valor fixo + percentual sobre o resultado" },
  { value: "hora", label: "Por Hora", description: "Cobrança por hora trabalhada" },
  { value: "mensal", label: "Mensalidade", description: "Valor mensal fixo" },
];

// Charging models for fee proposals (Record format for backward compatibility)
export const CHARGING_MODELS: Record<string, string> = {
  fixo: "Valor Fixo",
  exito: "Êxito",
  fixo_exito: "Fixo + Êxito",
  hora: "Por Hora",
  mensal: "Mensalidade",
};

// Receipt status options
export const RECEIPT_STATUS_OPTIONS = [
  { value: "emitido", label: "Emitido", color: "green" },
  { value: "cancelado", label: "Cancelado", color: "red" },
];

// Payment methods for receipts
export const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro", icon: "banknote" },
  { value: "pix", label: "PIX", icon: "smartphone" },
  { value: "boleto", label: "Boleto", icon: "file-text" },
  { value: "transferencia", label: "Transferência", icon: "arrow-left-right" },
  { value: "cartao_credito", label: "Cartão de Crédito", icon: "credit-card" },
  { value: "cartao_debito", label: "Cartão de Débito", icon: "credit-card" },
  { value: "cheque", label: "Cheque", icon: "file-text" },
  { value: "deposito", label: "Depósito", icon: "landmark" },
  { value: "outro", label: "Outro", icon: "more-horizontal" },
];

// Solo mode colors
export const SOLO_COLORS = {
  primary: "#3b82f6",
  secondary: "#64748b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
};

// Solo navigation sections
export const SOLO_NAVIGATION: NavigationSection[] = [
  {
    name: "Principal",
    items: [
      { name: "Meu Dia", href: "/meu-dia", icon: "sun", description: "Visão do dia" },
      { name: "Dashboard", href: "/dashboard", icon: "layout-dashboard", description: "Visão geral" },
      { name: "Clientes", href: "/clientes", icon: "users", description: "Gestão de clientes" },
      { name: "Processos", href: "/processos", icon: "briefcase", description: "Casos e processos" },
      { name: "Contratos", href: "/contratos", icon: "file-text", description: "Gestão de contratos" },
    ],
  },
  {
    name: "Gestão",
    items: [
      { name: "Financeiro", href: "/financeiro", icon: "dollar-sign", description: "Controle financeiro" },
      { name: "Prazos", href: "/prazos", icon: "clock", description: "Prazos processuais" },
      { name: "Agenda", href: "/agenda", icon: "calendar", description: "Compromissos" },
      { name: "Tarefas", href: "/tarefas", icon: "check-square", description: "Lista de tarefas" },
      { name: "Documentos", href: "/documentos", icon: "file", description: "Documentos" },
    ],
  },
  {
    name: "Ferramentas Solo",
    items: [
      { name: "Propostas", href: "/propostas", icon: "file-plus", description: "Propostas de honorários" },
      { name: "Recibos", href: "/recibos", icon: "receipt", description: "Recibos avulsos" },
      { name: "Retornos", href: "/retornos", icon: "phone", description: "Acompanhamento de retornos" },
      { name: "Fichas de Atendimento", href: "/atendimentos", icon: "clipboard-list", description: "Triagem de novos clientes" },
      { name: "Modelos", href: "/documentos/modelos", icon: "file-code", description: "Modelos de documentos" },
    ],
  },
  {
    name: "Relatórios",
    items: [
      { name: "Visão Geral", href: "/relatorios", icon: "bar-chart-2", description: "Relatórios gerais" },
      { name: "Desempenho Solo", href: "/relatorios/solo", icon: "trending-up", description: "Métricas solo" },
    ],
  },
  {
    name: "Configurações",
    items: [
      { name: "Perfil Profissional", href: "/configuracoes/perfil-profissional", icon: "user-circle", description: "Dados profissionais" },
      { name: "Configurações", href: "/configuracoes", icon: "settings", description: "Configurações gerais" },
    ],
  },
];
