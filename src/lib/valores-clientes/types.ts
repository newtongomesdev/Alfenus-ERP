export type ClientFundsAccount = {
  id: string;
  lawFirmId: string;
  clientId: string;
  legalCaseId: string | null;
  accountName: string;
  balance: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientFundsTransaction = {
  id: string;
  lawFirmId: string;
  accountId: string;
  clientId: string;
  legalCaseId: string | null;
  transactionType: string;
  amount: number;
  description: string;
  origin: string | null;
  beneficiary: string | null;
  receiptNumber: string | null;
  receiptUrl: string | null;
  authorizedByMemberId: string | null;
  approvalRequired: boolean;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type ClientFundsAllocation = {
  id: string;
  lawFirmId: string;
  accountId: string;
  transactionId: string | null;
  allocationType: string;
  amount: number;
  description: string | null;
  createdAt: string;
};

export type ClientFundsReconciliation = {
  id: string;
  lawFirmId: string;
  accountId: string;
  reconciledBy: string;
  reconciledAt: string;
  openingBalance: number;
  closingBalance: number;
  totalEntries: number;
  totalExits: number;
  transactionCount: number;
  notes: string | null;
  createdAt: string;
};

export type ClientFundsStatement = {
  id: string;
  lawFirmId: string;
  accountId: string;
  clientId: string;
  legalCaseId: string | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalEntries: number;
  totalExits: number;
  totalWithheld: number;
  totalRepasse: number;
  statementData: unknown[];
  generatedBy: string | null;
  generatedAt: string;
  createdAt: string;
};
