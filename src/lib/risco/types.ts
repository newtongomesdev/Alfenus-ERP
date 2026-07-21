export type ProcessClaim = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  clientId: string | null;
  description: string;
  category: string;
  originalValue: number | null;
  updatedValue: number | null;
  baseDate: string | null;
  indexName: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RiskAssessment = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  claimId: string | null;
  classification: string;
  probability: number | null;
  estimatedValue: number | null;
  scenario: string;
  justification: string | null;
  responsibleMemberId: string | null;
  baseDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  version: number;
  previousVersionId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Provision = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  claimId: string | null;
  riskAssessmentId: string | null;
  value: number;
  competence: string | null;
  baseDate: string | null;
  provisionType: string;
  justification: string | null;
  responsibleMemberId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  status: string;
  reversalDate: string | null;
  reversalReason: string | null;
  history: unknown[];
  createdAt: string;
  updatedAt: string;
};

export type JudicialGuarantee = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  guaranteeType: string;
  value: number;
  assetDescription: string | null;
  bank: string | null;
  accountNumber: string | null;
  validityDate: string | null;
  documentId: string | null;
  status: string;
  releaseDate: string | null;
  releaseDocument: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JudicialDeposit = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  depositType: string;
  value: number;
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  depositDate: string | null;
  releaseDate: string | null;
  beneficiary: string | null;
  institution: string | null;
  documentNumber: string | null;
  repasse: number | null;
  retention: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Seizure = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  seizureType: string;
  assetType: string;
  assetDescription: string | null;
  assetValue: number | null;
  entity: string | null;
  documentNumber: string | null;
  orderDate: string | null;
  status: string;
  releaseDate: string | null;
  releaseReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourtRelease = {
  id: string;
  lawFirmId: string;
  legalCaseId: string | null;
  seizureId: string | null;
  releasedValue: number;
  beneficiary: string | null;
  releaseDate: string | null;
  institution: string | null;
  documentNumber: string | null;
  repasse: number | null;
  retention: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
