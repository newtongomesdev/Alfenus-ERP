export type FormBuilder = {
  id: string;
  lawFirmId: string;
  name: string;
  slug: string;
  description: string | null;
  formType: string;
  isActive: boolean;
  publicLink: string | null;
  confirmationMessage: string | null;
  maxSubmissions: number | null;
  legalArea: string | null;
  defaultResponsibleMemberId: string | null;
  tags: unknown[];
  lgpdConsentText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FormField = {
  id: string;
  formBuilderId: string;
  lawFirmId: string;
  fieldType: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: unknown | null;
  validationRules: unknown | null;
  sortOrder: number;
  pageNumber: number;
  conditionalLogic: unknown | null;
  helpText: string | null;
  createdAt: string;
};

export type FormSubmission = {
  id: string;
  lawFirmId: string;
  formBuilderId: string;
  leadId: string | null;
  clientId: string | null;
  submissionData: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  source: string | null;
  campaign: string | null;
  lgpdConsent: boolean;
  lgpdConsentText: string | null;
  status: string;
  processedAt: string | null;
  createdAt: string;
};

export type SchedulingProfessional = {
  id: string;
  lawFirmId: string;
  memberId: string;
  displayName: string;
  specialty: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchedulingService = {
  id: string;
  lawFirmId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  modality: string;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchedulingSlot = {
  id: string;
  lawFirmId: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
};

export type SchedulingBooking = {
  id: string;
  lawFirmId: string;
  professionalId: string;
  serviceId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientId: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  modality: string;
  address: string | null;
  meetingLink: string | null;
  status: string;
  cancellationToken: string | null;
  lgpdConsent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
