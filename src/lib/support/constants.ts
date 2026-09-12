// ── Status ──────────────────────────────────────────────────────────────────
export const TICKET_STATUSES = {
  aberto: "aberto",
  aguardando_cliente: "aguardando_cliente",
  aguardando_suporte: "aguardando_suporte",
  em_analise: "em_analise",
  resolvido: "resolvido",
  fechado: "fechado",
  cancelado: "cancelado",
} as const;

export type TicketStatus = (typeof TICKET_STATUSES)[keyof typeof TICKET_STATUSES];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: "Aberto",
  aguardando_cliente: "Aguardando Cliente",
  aguardando_suporte: "Aguardando Suporte",
  em_analise: "Em Análise",
  resolvido: "Resolvido",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  aberto: "#3b82f6",
  aguardando_cliente: "#f59e0b",
  aguardando_suporte: "#8b5cf6",
  em_analise: "#6366f1",
  resolvido: "#22c55e",
  fechado: "#6b7280",
  cancelado: "#ef4444",
};

// ── Prioridade ──────────────────────────────────────────────────────────────
export const TICKET_PRIORITIES = {
  baixa: "baixa",
  normal: "normal",
  alta: "alta",
  urgente: "urgente",
} as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[keyof typeof TICKET_PRIORITIES];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  baixa: "#6b7280",   // cinza
  normal: "#3b82f6",  // azul
  alta: "#f59e0b",    // amarelo
  urgente: "#ef4444", // vermelho
};

// ── Tipo de mensagem ────────────────────────────────────────────────────────
export const MESSAGE_TYPES = {
  resposta: "resposta",
  nota_interna: "nota_interna",
  sistema: "sistema",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  resposta: "Resposta",
  nota_interna: "Nota Interna",
  sistema: "Sistema",
};

// ── Visibilidade da mensagem ────────────────────────────────────────────────
export const MESSAGE_VISIBILITY = {
  publica: "publica",
  interna: "interna",
} as const;

export type MessageVisibility = (typeof MESSAGE_VISIBILITY)[keyof typeof MESSAGE_VISIBILITY];

// ── Configuração de anexos ─────────────────────────────────────────────────
export const ATTACHMENT_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/csv",
    "text/x-log",
    "application/zip",
  ] as const,
  allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv", ".log", ".zip"],
} as const;

// ── Transições de status válidas ────────────────────────────────────────────
export const VALID_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  aberto: ["aguardando_suporte", "aguardando_cliente", "em_analise", "resolvido", "cancelado"],
  aguardando_cliente: ["aberto", "aguardando_suporte", "em_analise", "resolvido", "cancelado"],
  aguardando_suporte: ["aberto", "aguardando_cliente", "em_analise", "resolvido", "cancelado"],
  em_analise: ["aberto", "aguardando_suporte", "aguardando_cliente", "resolvido", "cancelado"],
  resolvido: ["aberto", "fechado"],
  fechado: ["aberto"],
  cancelado: ["aberto"],
};

// ── Categorias padrão ──────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  { name: "Técnico", description: "Problemas técnicos com o sistema" },
  { name: "Financeiro", description: "Dúvidas sobre cobranças e planos" },
  { name: "Dúvida", description: "Perguntas gerais sobre o sistema" },
  { name: "Sugestão", description: "Sugestões de melhorias" },
  { name: "Bug", description: "Relato de erros no sistema" },
] as const;
