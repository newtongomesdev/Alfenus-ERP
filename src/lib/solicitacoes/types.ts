export type LegalRequestType = {
  id: string;
  lawFirmId: string;
  name: string;
  description: string | null;
  defaultPriority: string;
  defaultSlaHours: number | null;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LegalRequest = {
  id: string;
  lawFirmId: string;
  requestTypeId: string | null;
  requesterMemberId: string;
  clientId: string | null;
  legalCaseId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  responsibleMemberId: string | null;
  participants: unknown[];
  status: string;
  slaDeadline: string | null;
  estimatedCost: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  openedAt: string;
  firstResponseAt: string | null;
  concludedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LegalRequestStage = {
  id: string;
  lawFirmId: string;
  requestId: string;
  stageName: string;
  stageOrder: number;
  status: string;
  assignedTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type LegalRequestApproval = {
  id: string;
  lawFirmId: string;
  requestId: string;
  approverMemberId: string;
  status: string;
  decisionAt: string | null;
  comments: string | null;
  createdAt: string;
};

export type LegalRequestSlaEvent = {
  id: string;
  lawFirmId: string;
  requestId: string;
  eventType: string;
  scheduledAt: string | null;
  actualAt: string | null;
  isMet: boolean | null;
  justification: string | null;
  createdAt: string;
};

export type LegalRequestMessage = {
  id: string;
  lawFirmId: string;
  requestId: string;
  senderMemberId: string;
  message: string;
  isInternal: boolean;
  attachmentUrl: string | null;
  createdAt: string;
};
