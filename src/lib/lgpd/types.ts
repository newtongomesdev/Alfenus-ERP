export type LgpdConsent = {
  id: string;
  lawFirmId: string;
  dataSubjectId: string | null;
  purpose: string;
  consentText: string;
  consentVersion: string;
  granted: boolean;
  origin: string | null;
  ipAddress: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type LgpdDataSubjectRequest = {
  id: string;
  lawFirmId: string;
  dataSubjectId: string | null;
  requestType: string;
  description: string | null;
  status: string;
  priority: string | null;
  responsibleMemberId: string | null;
  receivedAt: string | null;
  identifiedAt: string | null;
  analysisStartedAt: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  decisionNotes: string | null;
  rejectionReason: string | null;
  identityVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LgpdRetentionPolicy = {
  id: string;
  lawFirmId: string;
  policyName: string;
  description: string | null;
  targetModule: string;
  documentType: string | null;
  retentionDays: number;
  legalBasis: string | null;
  autoDelete: boolean;
  requiresReview: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LgpdDataClassification = {
  id: string;
  lawFirmId: string;
  entityType: string;
  entityId: string;
  classification: string;
  classifiedBy: string | null;
  classifiedAt: string;
  notes: string | null;
  createdAt: string;
};
