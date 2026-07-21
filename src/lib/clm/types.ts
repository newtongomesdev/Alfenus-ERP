// ──────────────────────────────────────────────
// Contract Lifecycle Management (CLM) — Types
// ──────────────────────────────────────────────

export type ContractCategory =
  | "juridico"
  | "administrativo"
  | "empresarial"
  | "trabalhista"
  | "financeiro";

export type ContractPriority = "baixa" | "normal" | "alta" | "urgente";

export type ContractRequestStatus =
  | "solicitacao"
  | "triagem"
  | "minuta"
  | "revisao"
  | "negociacao"
  | "aprovacao"
  | "assinatura_pendente"
  | "ativo"
  | "renovacao"
  | "encerramento"
  | "rescindido"
  | "arquivado";

export type ClauseRiskLevel = "baixo" | "medio" | "alto" | "critico";

export type ClauseStatus =
  | "ativa"
  | "em_revisao"
  | "aprovada"
  | "rejeitada"
  | "descontinuada";

export type ApprovalStatus = "pendente" | "aprovado" | "rejeitado";

export type ObligationPeriodicity =
  | "unica"
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

export type ObligationStatus =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "atrasada"
  | "isenta";

export type AmendmentType =
  | "aditivo"
  | "anexo_endereco"
  | "retificacao";

export type AmendmentStatus =
  | "rascunho"
  | "pendente_aprovacao"
  | "aprovado"
  | "rejeitado";

export type CounterpartyType = "pf" | "pj";

export type CounterpartyRole =
  | "contratante"
  | "contratado"
  | "fiador"
  | "avalista"
  | "outro";

// ──────────────────────────────────────────────
// Entity Types (camelCase)
// ──────────────────────────────────────────────

export type ContractRequest = {
  id: string;
  lawFirmId: string;
  requesterMemberId: string;
  clientId: string | null;
  legalCaseId: string | null;
  title: string;
  description: string | null;
  category: ContractCategory;
  contractType: string | null;
  priority: ContractPriority;
  necessaryDate: string | null;
  responsibleMemberId: string | null;
  status: ContractRequestStatus;
  slaDeadline: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractTemplate = {
  id: string;
  lawFirmId: string;
  name: string;
  description: string | null;
  category: string | null;
  content: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContractClause = {
  id: string;
  lawFirmId: string;
  templateId: string | null;
  title: string;
  category: string | null;
  content: string;
  version: number;
  riskLevel: ClauseRiskLevel;
  isMandatory: boolean;
  isApproved: boolean;
  approvedBy: string | null;
  responsibleMemberId: string | null;
  notes: string | null;
  status: ClauseStatus;
  createdAt: string;
};

export type ContractVersion = {
  id: string;
  lawFirmId: string;
  contractRequestId: string;
  versionNumber: number;
  content: string | null;
  authorMemberId: string | null;
  changeDescription: string | null;
  isCurrent: boolean;
  createdAt: string;
};

export type ContractApproval = {
  id: string;
  lawFirmId: string;
  contractRequestId: string;
  versionId: string | null;
  approverMemberId: string;
  status: ApprovalStatus;
  decisionAt: string | null;
  comments: string | null;
  createdAt: string;
};

export type ContractObligation = {
  id: string;
  lawFirmId: string;
  contractRequestId: string;
  description: string;
  responsibleParty: string | null;
  internalResponsibleMemberId: string | null;
  periodicity: ObligationPeriodicity | null;
  dueDate: string | null;
  evidenceDescription: string | null;
  status: ObligationStatus;
  alertDaysBefore: number;
  completedAt: string | null;
  createdAt: string;
};

export type ContractAmendment = {
  id: string;
  lawFirmId: string;
  contractRequestId: string;
  amendmentType: AmendmentType;
  description: string;
  newValue: number | null;
  newVigenceStart: string | null;
  newVigenceEnd: string | null;
  status: AmendmentStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

export type ContractCounterparty = {
  id: string;
  lawFirmId: string;
  contractRequestId: string;
  partyName: string;
  partyType: CounterpartyType;
  documentNumber: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  role: CounterpartyRole | null;
  createdAt: string;
};
