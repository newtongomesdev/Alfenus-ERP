import { z } from "zod";

import { roles } from "@/lib/auth/permissions";

export const lawFirmSchema = z.object({
  name: z.string().min(2, "Informe o nome do escritório."),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens."),
  document: z.string().optional(),
  email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  plan: z.enum(["starter", "professional", "business"]).default("starter"),
});

export const memberSchema = z.object({
  name: z.string().min(2, "Informe o nome do membro."),
  email: z.email("Informe um e-mail válido."),
  role: z.enum(roles),
  position: z.string().optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2, "Informe o nome do lead."),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
  source: z.string().optional(),
  interest: z.string().min(2, "Informe a área de interesse."),
  funnelStage: z.string().default("novo"),
  probability: z.coerce.number().int().min(0).max(100).default(0),
  estimatedValueCents: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  nextContactAt: z.string().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  personType: z.enum(["fisica", "juridica"]).default("fisica"),
  document: z.string().optional(),
  birthDate: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z.string().optional(),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
  source: z.string().optional(),
  interestArea: z.string().min(2, "Informe a área de interesse."),
  status: z.enum(["ativo", "inativo", "inadimplente"]).default("ativo"),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

export const legalCaseSchema = z
  .object({
    clientId: z.string().uuid("Selecione um cliente."),
    title: z.string().min(2, "Informe o nome interno do processo."),
    caseKind: z.enum(["judicial", "extrajudicial"]).default("judicial"),
    actionType: z.string().min(2, "Informe o tipo de ação ou assunto."),
    caseNumber: z.string().optional(),
    court: z.string().optional(),
    courtDivision: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    startedAt: z.string().optional(),
    status: z
      .enum([
        "em_analise",
        "documentacao_pendente",
        "ajuizamento",
        "em_andamento",
        "aguardando_decisao",
        "audiencia_marcada",
        "suspenso",
        "encerrado",
      ])
      .default("em_analise"),
    priority: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
    opposingParty: z.string().optional(),
    opposingLawyer: z.string().optional(),
    strategicNotes: z.string().optional(),
    tags: z.string().optional(),
  })
  .refine((data) => data.caseKind === "extrajudicial" || Boolean(data.caseNumber?.trim()), {
    message: "Informe o número do processo judicial.",
    path: ["caseNumber"],
  });

export const contractSchema = z
  .object({
    clientId: z.string().uuid("Selecione um cliente."),
    legalCaseId: z.string().uuid("Selecione um processo válido.").optional().or(z.literal("")),
    serviceDescription: z.string().min(5, "Descreva o serviço contratado."),
    totalAmountCents: z.coerce.number().int().min(1, "Informe o valor total."),
    upfrontAmountCents: z.coerce.number().int().min(0).default(0),
    installmentsCount: z.coerce.number().int().min(1).max(60).default(1),
    firstDueDate: z.string().min(1, "Informe o primeiro vencimento."),
    frequency: z.enum(["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "unica"]).default("mensal"),
    paymentMethod: z.string().min(2, "Informe a forma de pagamento."),
    status: z.enum(["rascunho", "aguardando_assinatura", "ativo", "quitado", "inadimplente", "cancelado"]).default("ativo"),
    successFee: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.upfrontAmountCents <= data.totalAmountCents, {
    message: "A entrada não pode ser maior que o valor total.",
    path: ["upfrontAmountCents"],
  });

export const paymentSchema = z.object({
  installmentId: z.string().uuid("Selecione uma parcela."),
  amountCents: z.coerce.number().int().positive("Informe um valor maior que zero."),
  paidAt: z.string().min(1, "Informe a data do recebimento."),
  paymentMethod: z.string().min(2, "Informe a forma de pagamento."),
  discountCents: z.coerce.number().int().min(0).default(0),
  fineCents: z.coerce.number().int().min(0).default(0),
  interestCents: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const deadlineSchema = z.object({
  title: z.string().min(3, "Informe o título do prazo."),
  type: z.string().min(2, "Informe o tipo do prazo."),
  clientId: z.string().uuid().optional().or(z.literal("")),
  legalCaseId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().min(1, "Informe a data limite."),
  dueTime: z.string().optional(),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  description: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(3, "Informe o título da tarefa."),
  description: z.string().optional(),
  clientId: z.string().uuid().optional().or(z.literal("")),
  legalCaseId: z.string().uuid().optional().or(z.literal("")),
  responsibleMemberId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  dueAt: z.string().optional(),
});

export const expenseSchema = z.object({
  description: z.string().min(3, "Informe a descrição da despesa."),
  category: z.string().min(2, "Informe a categoria."),
  amountCents: z.coerce.number().int().positive("Informe um valor maior que zero."),
  dueDate: z.string().optional(),
  clientId: z.string().uuid().optional().or(z.literal("")),
  legalCaseId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const appointmentSchema = z.object({
  title: z.string().min(3, "Informe o título do compromisso."),
  type: z.enum(["reuniao", "audiencia", "retorno", "outro"]),
  startsAt: z.string().min(1, "Informe a data e o horário."),
  endsAt: z.string().optional(),
  clientId: z.string().uuid().optional().or(z.literal("")),
  legalCaseId: z.string().uuid().optional().or(z.literal("")),
});

export const documentSchema = z.object({
  name: z.string().min(2, "Informe o nome do documento."),
  entityType: z.enum(["cliente", "processo", "contrato", "prazo", "tarefa", "outro"]),
  entityId: z.string().uuid().optional().or(z.literal("")),
});

export const casePartySchema = z.object({
  name: z.string().min(2, "Informe o nome da parte."),
  partyRole: z.string().min(2, "Informe o papel da parte."),
  document: z.string().optional(),
  contact: z.string().optional(),
});

export const caseMovementSchema = z.object({
  title: z.string().min(3, "Informe o título da movimentação."),
  description: z.string().optional(),
  occurredAt: z.string().min(1, "Informe a data da movimentação."),
});

export const teamInvitationSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  role: z.enum(roles),
});

export type LawFirmInput = z.infer<typeof lawFirmSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type LegalCaseInput = z.infer<typeof legalCaseSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type DeadlineInput = z.infer<typeof deadlineSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type CasePartyInput = z.infer<typeof casePartySchema>;
export type CaseMovementInput = z.infer<typeof caseMovementSchema>;
export type TeamInvitationInput = z.infer<typeof teamInvitationSchema>;
