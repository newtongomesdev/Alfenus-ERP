export type Communication = {
  id: string;
  lawFirmId: string;
  senderMemberId: string;
  subject: string;
  content: string;
  communicationType: string;
  visibility: string;
  channel: string | null;
  clientId: string | null;
  legalCaseId: string | null;
  contractRequestId: string | null;
  leadId: string | null;
  threadId: string | null;
  parentId: string | null;
  isPinned: boolean;
  readBy: unknown[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationThread = {
  id: string;
  lawFirmId: string;
  title: string;
  subject: string | null;
  clientId: string | null;
  legalCaseId: string | null;
  createdBy: string;
  lastMessageAt: string | null;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationAttachment = {
  id: string;
  lawFirmId: string;
  communicationId: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
};
