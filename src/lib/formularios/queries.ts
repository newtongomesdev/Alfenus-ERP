import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  FormBuilder,
  FormField,
  FormSubmission,
  SchedulingProfessional,
  SchedulingService,
  SchedulingSlot,
  SchedulingBooking,
} from "./types";

type FormBuilderUpdate =
  Database["public"]["Tables"]["form_builders"]["Update"];
type FormFieldUpdate =
  Database["public"]["Tables"]["form_fields"]["Update"];
type FormSubmissionUpdate =
  Database["public"]["Tables"]["form_submissions"]["Update"];
type SchedulingProfessionalUpdate =
  Database["public"]["Tables"]["scheduling_professionals"]["Update"];
type SchedulingServiceUpdate =
  Database["public"]["Tables"]["scheduling_services"]["Update"];
type SchedulingBookingUpdate =
  Database["public"]["Tables"]["scheduling_bookings"]["Update"];

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapFormBuilderRow(row: Record<string, unknown>): FormBuilder {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    formType: row.form_type as string,
    isActive: row.is_active as boolean,
    publicLink: row.public_link as string | null,
    confirmationMessage: row.confirmation_message as string | null,
    maxSubmissions: row.max_submissions as number | null,
    legalArea: row.legal_area as string | null,
    defaultResponsibleMemberId: row.default_responsible_member_id as string | null,
    tags: (row.tags as unknown[]) ?? [],
    lgpdConsentText: row.lgpd_consent_text as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapFormFieldRow(row: Record<string, unknown>): FormField {
  return {
    id: row.id as string,
    formBuilderId: row.form_builder_id as string,
    lawFirmId: row.law_firm_id as string,
    fieldType: row.field_type as string,
    label: row.label as string,
    placeholder: row.placeholder as string | null,
    required: row.required as boolean,
    options: row.options as unknown | null,
    validationRules: row.validation_rules as unknown | null,
    sortOrder: row.sort_order as number,
    pageNumber: row.page_number as number,
    conditionalLogic: row.conditional_logic as unknown | null,
    helpText: row.help_text as string | null,
    createdAt: row.created_at as string,
  };
}

function mapFormSubmissionRow(row: Record<string, unknown>): FormSubmission {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    formBuilderId: row.form_builder_id as string,
    leadId: row.lead_id as string | null,
    clientId: row.client_id as string | null,
    submissionData: (row.submission_data as Record<string, unknown>) ?? {},
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    source: row.source as string | null,
    campaign: row.campaign as string | null,
    lgpdConsent: row.lgpd_consent as boolean,
    lgpdConsentText: row.lgpd_consent_text as string | null,
    status: row.status as string,
    processedAt: row.processed_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapProfessionalRow(
  row: Record<string, unknown>
): SchedulingProfessional {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    memberId: row.member_id as string,
    displayName: row.display_name as string,
    specialty: row.specialty as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapServiceRow(row: Record<string, unknown>): SchedulingService {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    name: row.name as string,
    description: row.description as string | null,
    durationMinutes: row.duration_minutes as number,
    modality: row.modality as string,
    requiresApproval: row.requires_approval as boolean,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSlotRow(row: Record<string, unknown>): SchedulingSlot {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    professionalId: row.professional_id as string,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    isAvailable: row.is_available as boolean,
    createdAt: row.created_at as string,
  };
}

function mapBookingRow(row: Record<string, unknown>): SchedulingBooking {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    professionalId: row.professional_id as string,
    serviceId: row.service_id as string,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string | null,
    clientPhone: row.client_phone as string | null,
    clientId: row.client_id as string | null,
    bookingDate: row.booking_date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    modality: row.modality as string,
    address: row.address as string | null,
    meetingLink: row.meeting_link as string | null,
    status: row.status as string,
    cancellationToken: row.cancellation_token as string | null,
    lgpdConsent: row.lgpd_consent as boolean,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Form Builders
// ---------------------------------------------------------------------------

export async function getFormBuilders(
  context: AppContext,
  filters?: { formType?: string; isActive?: boolean },
  page: number = 1,
  pageSize: number = 20
): Promise<{ formBuilders: FormBuilder[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { formBuilders: [], total: 0 };

  let query = supabase
    .from("form_builders")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.formType) query = query.eq("form_type", filters.formType);
  if (filters?.isActive !== undefined)
    query = query.eq("is_active", filters.isActive);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    formBuilders: (data ?? []).map(mapFormBuilderRow),
    total: count ?? 0,
  };
}

export async function getFormBuilderBySlug(
  context: AppContext,
  slug: string
): Promise<FormBuilder | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("form_builders")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("slug", slug)
    .maybeSingle();

  return data ? mapFormBuilderRow(data) : null;
}

export async function createFormBuilder(
  context: AppContext,
  data: {
    name: string;
    slug: string;
    description?: string;
    formType?: string;
    publicLink?: string;
    confirmationMessage?: string;
    maxSubmissions?: number;
    legalArea?: string;
    defaultResponsibleMemberId?: string;
    tags?: unknown[];
    lgpdConsentText?: string;
  }
): Promise<FormBuilder | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("form_builders")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      form_type: data.formType ?? "contato",
      public_link: data.publicLink ?? null,
      confirmation_message: data.confirmationMessage ?? null,
      max_submissions: data.maxSubmissions ?? null,
      legal_area: data.legalArea ?? null,
      default_responsible_member_id:
        data.defaultResponsibleMemberId ?? null,
      tags: data.tags ?? [],
      lgpd_consent_text: data.lgpdConsentText ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapFormBuilderRow(pub) : null;
}

export async function updateFormBuilder(
  context: AppContext,
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    formType: string;
    isActive: boolean;
    publicLink: string;
    confirmationMessage: string;
    maxSubmissions: number;
    legalArea: string;
    defaultResponsibleMemberId: string;
    tags: unknown[];
    lgpdConsentText: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: FormBuilderUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) update.name = data.name;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.description !== undefined) update.description = data.description;
  if (data.formType !== undefined) update.form_type = data.formType;
  if (data.isActive !== undefined) update.is_active = data.isActive;
  if (data.publicLink !== undefined) update.public_link = data.publicLink;
  if (data.confirmationMessage !== undefined)
    update.confirmation_message = data.confirmationMessage;
  if (data.maxSubmissions !== undefined)
    update.max_submissions = data.maxSubmissions;
  if (data.legalArea !== undefined) update.legal_area = data.legalArea;
  if (data.defaultResponsibleMemberId !== undefined)
    update.default_responsible_member_id = data.defaultResponsibleMemberId;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.lgpdConsentText !== undefined)
    update.lgpd_consent_text = data.lgpdConsentText;

  await supabase
    .from("form_builders")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Form Fields
// ---------------------------------------------------------------------------

export async function getFormFields(
  context: AppContext,
  formBuilderId: string
): Promise<FormField[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("form_fields")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("form_builder_id", formBuilderId)
    .order("sort_order", { ascending: true });

  return (data ?? []).map(mapFormFieldRow);
}

export async function createFormField(
  context: AppContext,
  data: {
    formBuilderId: string;
    fieldType: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: unknown;
    validationRules?: unknown;
    sortOrder?: number;
    pageNumber?: number;
    conditionalLogic?: unknown;
    helpText?: string;
  }
): Promise<FormField | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("form_fields")
    .insert({
      form_builder_id: data.formBuilderId,
      law_firm_id: context.lawFirm.id,
      field_type: data.fieldType,
      label: data.label,
      placeholder: data.placeholder ?? null,
      required: data.required ?? false,
      options: data.options ?? null,
      validation_rules: data.validationRules ?? null,
      sort_order: data.sortOrder ?? 0,
      page_number: data.pageNumber ?? 1,
      conditional_logic: data.conditionalLogic ?? null,
      help_text: data.helpText ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapFormFieldRow(pub) : null;
}

export async function updateFormField(
  context: AppContext,
  id: string,
  data: Partial<{
    fieldType: string;
    label: string;
    placeholder: string;
    required: boolean;
    options: unknown;
    validationRules: unknown;
    sortOrder: number;
    pageNumber: number;
    conditionalLogic: unknown;
    helpText: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: FormFieldUpdate = {};

  if (data.fieldType !== undefined) update.field_type = data.fieldType;
  if (data.label !== undefined) update.label = data.label;
  if (data.placeholder !== undefined) update.placeholder = data.placeholder;
  if (data.required !== undefined) update.required = data.required;
  if (data.options !== undefined) update.options = data.options;
  if (data.validationRules !== undefined)
    update.validation_rules = data.validationRules;
  if (data.sortOrder !== undefined) update.sort_order = data.sortOrder;
  if (data.pageNumber !== undefined) update.page_number = data.pageNumber;
  if (data.conditionalLogic !== undefined)
    update.conditional_logic = data.conditionalLogic;
  if (data.helpText !== undefined) update.help_text = data.helpText;

  await supabase
    .from("form_fields")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function deleteFormField(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("form_fields")
    .delete()
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Form Submissions
// ---------------------------------------------------------------------------

export async function getFormSubmissions(
  context: AppContext,
  formBuilderId: string,
  filters?: { status?: string },
  page: number = 1,
  pageSize: number = 20
): Promise<{ submissions: FormSubmission[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { submissions: [], total: 0 };

  let query = supabase
    .from("form_submissions")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("form_builder_id", formBuilderId);

  if (filters?.status) query = query.eq("status", filters.status);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    submissions: (data ?? []).map(mapFormSubmissionRow),
    total: count ?? 0,
  };
}

export async function createFormSubmission(
  context: AppContext,
  data: {
    formBuilderId: string;
    submissionData: Record<string, unknown>;
    leadId?: string;
    clientId?: string;
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    campaign?: string;
    lgpdConsent?: boolean;
    lgpdConsentText?: string;
  }
): Promise<FormSubmission | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("form_submissions")
    .insert({
      law_firm_id: context.lawFirm.id,
      form_builder_id: data.formBuilderId,
      submission_data: data.submissionData,
      lead_id: data.leadId ?? null,
      client_id: data.clientId ?? null,
      ip_address: data.ipAddress ?? null,
      user_agent: data.userAgent ?? null,
      source: data.source ?? null,
      campaign: data.campaign ?? null,
      lgpd_consent: data.lgpdConsent ?? false,
      lgpd_consent_text: data.lgpdConsentText ?? null,
      status: "recebido",
    })
    .select()
    .maybeSingle();

  return pub ? mapFormSubmissionRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Scheduling Professionals
// ---------------------------------------------------------------------------

export async function getProfessionals(
  context: AppContext,
  filters?: { isActive?: boolean }
): Promise<SchedulingProfessional[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("scheduling_professionals")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.isActive !== undefined)
    query = query.eq("is_active", filters.isActive);

  const { data } = await query.order("display_name", { ascending: true });

  return (data ?? []).map(mapProfessionalRow);
}

export async function createProfessional(
  context: AppContext,
  data: {
    memberId: string;
    displayName: string;
    specialty?: string;
    isActive?: boolean;
  }
): Promise<SchedulingProfessional | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("scheduling_professionals")
    .insert({
      law_firm_id: context.lawFirm.id,
      member_id: data.memberId,
      display_name: data.displayName,
      specialty: data.specialty ?? null,
      is_active: data.isActive ?? true,
    })
    .select()
    .maybeSingle();

  return pub ? mapProfessionalRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Scheduling Services
// ---------------------------------------------------------------------------

export async function getServices(
  context: AppContext,
  filters?: { isActive?: boolean; modality?: string }
): Promise<SchedulingService[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("scheduling_services")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.isActive !== undefined)
    query = query.eq("is_active", filters.isActive);
  if (filters?.modality) query = query.eq("modality", filters.modality);

  const { data } = await query.order("name", { ascending: true });

  return (data ?? []).map(mapServiceRow);
}

export async function createService(
  context: AppContext,
  data: {
    name: string;
    description?: string;
    durationMinutes?: number;
    modality?: string;
    requiresApproval?: boolean;
    isActive?: boolean;
  }
): Promise<SchedulingService | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("scheduling_services")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: data.name,
      description: data.description ?? null,
      duration_minutes: data.durationMinutes ?? 60,
      modality: data.modality ?? "presencial",
      requires_approval: data.requiresApproval ?? false,
      is_active: data.isActive ?? true,
    })
    .select()
    .maybeSingle();

  return pub ? mapServiceRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Scheduling Slots
// ---------------------------------------------------------------------------

export async function getSlots(
  context: AppContext,
  professionalId: string
): Promise<SchedulingSlot[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("scheduling_slots")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("professional_id", professionalId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (data ?? []).map(mapSlotRow);
}

export async function createSlot(
  context: AppContext,
  data: {
    professionalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }
): Promise<SchedulingSlot | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("scheduling_slots")
    .insert({
      law_firm_id: context.lawFirm.id,
      professional_id: data.professionalId,
      day_of_week: data.dayOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      is_available: data.isAvailable ?? true,
    })
    .select()
    .maybeSingle();

  return pub ? mapSlotRow(pub) : null;
}

// ---------------------------------------------------------------------------
// Scheduling Bookings
// ---------------------------------------------------------------------------

export async function getBookings(
  context: AppContext,
  filters?: {
    professionalId?: string;
    bookingDate?: string;
    status?: string;
  },
  page: number = 1,
  pageSize: number = 20
): Promise<{ bookings: SchedulingBooking[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { bookings: [], total: 0 };

  let query = supabase
    .from("scheduling_bookings")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.professionalId)
    query = query.eq("professional_id", filters.professionalId);
  if (filters?.bookingDate)
    query = query.eq("booking_date", filters.bookingDate);
  if (filters?.status) query = query.eq("status", filters.status);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    bookings: (data ?? []).map(mapBookingRow),
    total: count ?? 0,
  };
}

export async function getAvailableSlots(
  context: AppContext,
  professionalId: string,
  date: string
): Promise<SchedulingSlot[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  // dayOfWeek: 0=Sun, 1=Mon, ... 6=Sat
  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  const { data } = await supabase
    .from("scheduling_slots")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("professional_id", professionalId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_available", true)
    .order("start_time", { ascending: true });

  return (data ?? []).map(mapSlotRow);
}

export async function createBooking(
  context: AppContext,
  data: {
    professionalId: string;
    serviceId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientId?: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    modality?: string;
    address?: string;
    meetingLink?: string;
    lgpdConsent?: boolean;
    notes?: string;
  }
): Promise<SchedulingBooking | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const cancellationToken =
    Math.random().toString(36).substring(2) +
    Date.now().toString(36);

  const { data: pub } = await supabase
    .from("scheduling_bookings")
    .insert({
      law_firm_id: context.lawFirm.id,
      professional_id: data.professionalId,
      service_id: data.serviceId,
      client_name: data.clientName,
      client_email: data.clientEmail ?? null,
      client_phone: data.clientPhone ?? null,
      client_id: data.clientId ?? null,
      booking_date: data.bookingDate,
      start_time: data.startTime,
      end_time: data.endTime,
      modality: data.modality ?? "presencial",
      address: data.address ?? null,
      meeting_link: data.meetingLink ?? null,
      status: "confirmado",
      cancellation_token: cancellationToken,
      lgpd_consent: data.lgpdConsent ?? false,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapBookingRow(pub) : null;
}

export async function cancelBooking(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("scheduling_bookings")
    .update({
      status: "cancelado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getFormulariosDashboardStats(context: AppContext): Promise<{
  totalFormularios: number;
  totalSubmissoes: number;
  agendamentosConfirmados: number;
  totalProfissionais: number;
  totalServicos: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return {
      totalFormularios: 0,
      totalSubmissoes: 0,
      agendamentosConfirmados: 0,
      totalProfissionais: 0,
      totalServicos: 0,
    };
  }

  const firmId = context.lawFirm.id;

  const [formsRes, submissionsRes, bookingsRes, professionalsRes, servicesRes] =
    await Promise.all([
      supabase
        .from("form_builders")
        .select("id", { count: "exact" })
        .eq("law_firm_id", firmId),
      supabase
        .from("form_submissions")
        .select("id", { count: "exact" })
        .eq("law_firm_id", firmId),
      supabase
        .from("scheduling_bookings")
        .select("id", { count: "exact" })
        .eq("law_firm_id", firmId)
        .eq("status", "confirmado"),
      supabase
        .from("scheduling_professionals")
        .select("id", { count: "exact" })
        .eq("law_firm_id", firmId)
        .eq("is_active", true),
      supabase
        .from("scheduling_services")
        .select("id", { count: "exact" })
        .eq("law_firm_id", firmId)
        .eq("is_active", true),
    ]);

  return {
    totalFormularios: formsRes.count ?? 0,
    totalSubmissoes: submissionsRes.count ?? 0,
    agendamentosConfirmados: bookingsRes.count ?? 0,
    totalProfissionais: professionalsRes.count ?? 0,
    totalServicos: servicesRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Submission stats (count per form)
// ---------------------------------------------------------------------------

export async function getSubmissionCounts(
  context: AppContext,
  formBuilderIds: string[]
): Promise<Record<string, number>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm || formBuilderIds.length === 0) return {};

  const { data } = await supabase
    .from("form_submissions")
    .select("form_builder_id")
    .eq("law_firm_id", context.lawFirm.id)
    .in("form_builder_id", formBuilderIds);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.form_builder_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
