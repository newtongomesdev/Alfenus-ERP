import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type { DeadlineCalculation, CalendarEvent } from "./engine";
import { calculateDeadline } from "./engine";

type DeadlineCalcUpdate =
  Database["public"]["Tables"]["deadline_calculations"]["Update"];
type CalendarEventUpdate =
  Database["public"]["Tables"]["calendar_events"]["Update"];

// --- Row mappers ---

function mapCalculationRow(
  row: Record<string, unknown>
): DeadlineCalculation {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    deadlineId: row.deadline_id as string | null,
    publicationId: row.publication_id as string | null,
    tribunal: row.tribunal as string,
    jurisdition: row.jurisdition as string | null,
    procedureType: row.procedure_type as string | null,
    ruleDescription: row.rule_description as string | null,
    disponibilizedAt: row.disponibilized_at as string | null,
    publishedAt: row.published_at as string | null,
    knowledgeAt: row.knowledge_at as string | null,
    startDate: row.start_date as string,
    quantity: row.quantity as number,
    unit: row.unit as DeadlineCalculation["unit"],
    businessDays: row.business_days as boolean,
    includeStartDate: row.include_start_date as boolean,
    includeEndDate: row.include_end_date as boolean,
    calculatedDate: row.calculated_date as string | null,
    adjustedDate: row.adjusted_date as string | null,
    adjustmentReason: row.adjustment_reason as string | null,
    calendarId: row.calendar_id as string | null,
    holidaysConsidered: (row.holidays_considered as string[]) ?? [],
    suspensionsConsidered: (row.suspensions_considered as string[]) ?? [],
    calculatedBy: row.calculated_by as string | null,
    calculatedAt: row.calculated_at as string | null,
    reviewedBy: row.reviewed_by as string | null,
    reviewedAt: row.reviewed_at as string | null,
    approvedBy: row.approved_by as string | null,
    approvedAt: row.approved_at as string | null,
    status: row.status as string,
    version: row.version as number,
    previousVersionId: row.previous_version_id as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCalendarEventRow(
  row: Record<string, unknown>
): CalendarEvent {
  return {
    id: row.id as string,
    calendarId: row.calendar_id as string,
    lawFirmId: row.law_firm_id as string,
    eventName: row.event_name as string,
    eventType: row.event_type as CalendarEvent["eventType"],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    isRecurring: row.is_recurring as boolean,
    recurrenceRule: row.recurrence_rule as string | null,
    description: row.description as string | null,
  };
}

// --- Filters ---

export type CalculationFilters = {
  status?: string;
  tribunal?: string;
  startDateFrom?: string;
  startDateTo?: string;
  quantityMin?: number;
  quantityMax?: number;
};

// --- CRUD ---

export async function getCalculations(
  context: AppContext,
  filters?: CalculationFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ calculations: DeadlineCalculation[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { calculations: [], total: 0 };

  let query = supabase
    .from("deadline_calculations")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.tribunal)
    query = query.ilike("tribunal", `%${filters.tribunal}%`);
  if (filters?.startDateFrom)
    query = query.gte("start_date", filters.startDateFrom);
  if (filters?.startDateTo)
    query = query.lte("start_date", filters.startDateTo);
  if (filters?.quantityMin !== undefined)
    query = query.gte("quantity", filters.quantityMin);
  if (filters?.quantityMax !== undefined)
    query = query.lte("quantity", filters.quantityMax);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    calculations: (data ?? []).map(mapCalculationRow),
    total: count ?? 0,
  };
}

export async function getCalculationById(
  context: AppContext,
  id: string
): Promise<DeadlineCalculation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("deadline_calculations")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapCalculationRow(data) : null;
}

export async function getCalculationStats(context: AppContext): Promise<{
  total: number;
  byStatus: Record<string, number>;
  avgDaysToResolve: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) {
    return { total: 0, byStatus: {}, avgDaysToResolve: 0 };
  }

  const { data: all } = await supabase
    .from("deadline_calculations")
    .select("status, calculated_at, approved_at, start_date")
    .eq("law_firm_id", context.lawFirm.id);

  const rows = all ?? [];
  const total = rows.length;
  const byStatus: Record<string, number> = {};

  let totalDays = 0;
  let resolvedCount = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.approved_at && r.start_date) {
      const start = new Date(r.start_date);
      const end = new Date(r.approved_at);
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalDays += diffDays;
      resolvedCount++;
    }
  }

  const avgDaysToResolve =
    resolvedCount > 0 ? Math.round(totalDays / resolvedCount) : 0;

  return { total, byStatus, avgDaysToResolve };
}

export async function createCalculation(
  context: AppContext,
  data: {
    tribunal: string;
    deadlineId?: string;
    publicationId?: string;
    jurisdition?: string;
    procedureType?: string;
    ruleDescription?: string;
    disponibilizedAt?: string;
    publishedAt?: string;
    knowledgeAt?: string;
    startDate: string;
    quantity: number;
    unit: "dias" | "horas" | "meses" | "anos";
    businessDays?: boolean;
    includeStartDate?: boolean;
    includeEndDate?: boolean;
    calendarId?: string;
    notes?: string;
  }
): Promise<DeadlineCalculation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const businessDays = data.businessDays ?? true;
  const includeStartDate = data.includeStartDate ?? true;
  const includeEndDate = data.includeEndDate ?? true;

  // Auto-calculate if has start_date + quantity
  let calculatedDate: string | null = null;
  let adjustedDate: string | null = null;
  let holidaysConsidered: string[] = [];
  let suspensionsConsidered: string[] = [];
  let adjustmentReason: string | null = null;

  const now = new Date().toISOString();

  if (data.startDate && data.quantity > 0) {
    // Fetch calendar events if calendarId provided
    let holidays: CalendarEvent[] = [];
    let suspensions: CalendarEvent[] = [];

    if (data.calendarId) {
      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("calendar_id", data.calendarId)
        .eq("law_firm_id", context.lawFirm.id);

      if (events) {
        const mapped = events.map(mapCalendarEventRow);
        holidays = mapped.filter((e) => e.eventType === "feriado");
        suspensions = mapped.filter((e) => e.eventType !== "feriado");
      }
    }

    const result = calculateDeadline({
      startDate: data.startDate,
      quantity: data.quantity,
      unit: data.unit,
      businessDays,
      includeStartDate,
      includeEndDate,
      holidays,
      suspensions,
    });

    calculatedDate = result.calculatedDate;
    holidaysConsidered = result.holidaysConsidered;
    suspensionsConsidered = result.suspensionsConsidered;

    if (holidaysConsidered.length > 0 || suspensionsConsidered.length > 0) {
      adjustedDate = result.calculatedDate;
      const reasons: string[] = [];
      if (holidaysConsidered.length > 0)
        reasons.push(`Feriados: ${holidaysConsidered.join(", ")}`);
      if (suspensionsConsidered.length > 0)
        reasons.push(`Suspensões: ${suspensionsConsidered.join(", ")}`);
      adjustmentReason = reasons.join("; ");
    }
  }

  const insertData: Database["public"]["Tables"]["deadline_calculations"]["Insert"] =
    {
      law_firm_id: context.lawFirm.id,
      deadline_id: data.deadlineId ?? null,
      publication_id: data.publicationId ?? null,
      tribunal: data.tribunal,
      jurisdition: data.jurisdition ?? null,
      procedure_type: data.procedureType ?? null,
      rule_description: data.ruleDescription ?? null,
      disponibilized_at: data.disponibilizedAt ?? null,
      published_at: data.publishedAt ?? null,
      knowledge_at: data.knowledgeAt ?? null,
      start_date: data.startDate,
      quantity: data.quantity,
      unit: data.unit,
      business_days: businessDays,
      include_start_date: includeStartDate,
      include_end_date: includeEndDate,
      calculated_date: calculatedDate,
      adjusted_date: adjustedDate,
      adjustment_reason: adjustmentReason,
      calendar_id: data.calendarId ?? null,
      holidays_considered: holidaysConsidered,
      suspensions_considered: suspensionsConsidered,
      calculated_by: context.member?.userId ?? null,
      calculated_at: calculatedDate ? now : null,
      status: calculatedDate ? "calculado" : "rascunho",
      version: 1,
      notes: data.notes ?? null,
    };

  const { data: pub } = await supabase
    .from("deadline_calculations")
    .insert(insertData)
    .select()
    .maybeSingle();

  return pub ? mapCalculationRow(pub) : null;
}

export async function updateCalculation(
  context: AppContext,
  id: string,
  data: Partial<{
    tribunal: string;
    jurisdition: string;
    procedureType: string;
    ruleDescription: string;
    disponibilizedAt: string;
    publishedAt: string;
    knowledgeAt: string;
    startDate: string;
    quantity: number;
    unit: "dias" | "horas" | "meses" | "anos";
    businessDays: boolean;
    includeStartDate: boolean;
    includeEndDate: boolean;
    calendarId: string;
    notes: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: DeadlineCalcUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (data.tribunal !== undefined) update.tribunal = data.tribunal;
  if (data.jurisdition !== undefined) update.jurisdition = data.jurisdition;
  if (data.procedureType !== undefined)
    update.procedure_type = data.procedureType;
  if (data.ruleDescription !== undefined)
    update.rule_description = data.ruleDescription;
  if (data.disponibilizedAt !== undefined)
    update.disponibilized_at = data.disponibilizedAt;
  if (data.publishedAt !== undefined)
    update.published_at = data.publishedAt;
  if (data.knowledgeAt !== undefined)
    update.knowledge_at = data.knowledgeAt;
  if (data.startDate !== undefined) update.start_date = data.startDate;
  if (data.quantity !== undefined) update.quantity = data.quantity;
  if (data.unit !== undefined) update.unit = data.unit;
  if (data.businessDays !== undefined)
    update.business_days = data.businessDays;
  if (data.includeStartDate !== undefined)
    update.include_start_date = data.includeStartDate;
  if (data.includeEndDate !== undefined)
    update.include_end_date = data.includeEndDate;
  if (data.calendarId !== undefined) update.calendar_id = data.calendarId;
  if (data.notes !== undefined) update.notes = data.notes;

  await supabase
    .from("deadline_calculations")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function submitForReview(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("deadline_calculations")
    .update({
      status: "aguardando_revisao",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function reviewCalculation(
  context: AppContext,
  id: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: DeadlineCalcUpdate = {
    reviewed_by: context.member?.userId ?? null,
    reviewed_at: new Date().toISOString(),
    status: approved ? "revisado" : "calculado",
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) update.notes = notes;

  await supabase
    .from("deadline_calculations")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function approveCalculation(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("deadline_calculations")
    .update({
      approved_by: context.member?.userId ?? null,
      approved_at: new Date().toISOString(),
      status: "confirmado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function cancelCalculation(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("deadline_calculations")
    .update({
      status: "cancelado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function recalculateWithNewVersion(
  context: AppContext,
  id: string
): Promise<DeadlineCalculation | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  // Fetch the original calculation
  const { data: original } = await supabase
    .from("deadline_calculations")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!original) return null;

  const now = new Date().toISOString();

  // Mark the old version as substituido
  await supabase
    .from("deadline_calculations")
    .update({
      status: "substituido",
      updated_at: now,
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);

  // Re-run calculation with current data
  let calculatedDate: string | null = null;
  let adjustedDate: string | null = null;
  let holidaysConsidered: string[] = [];
  let suspensionsConsidered: string[] = [];
  let adjustmentReason: string | null = null;

  const startDate = original.start_date as string;
  const quantity = original.quantity as number;
  const unit = original.unit as DeadlineCalculation["unit"];
  const businessDays = original.business_days as boolean;
  const includeStartDate = original.include_start_date as boolean;
  const includeEndDate = original.include_end_date as boolean;

  if (startDate && quantity > 0) {
    let holidays: CalendarEvent[] = [];
    let suspensions: CalendarEvent[] = [];

    const calendarId = original.calendar_id as string | null;
    if (calendarId) {
      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("calendar_id", calendarId)
        .eq("law_firm_id", context.lawFirm.id);

      if (events) {
        const mapped = events.map(mapCalendarEventRow);
        holidays = mapped.filter((e) => e.eventType === "feriado");
        suspensions = mapped.filter((e) => e.eventType !== "feriado");
      }
    }

    const result = calculateDeadline({
      startDate,
      quantity,
      unit,
      businessDays,
      includeStartDate,
      includeEndDate,
      holidays,
      suspensions,
    });

    calculatedDate = result.calculatedDate;
    holidaysConsidered = result.holidaysConsidered;
    suspensionsConsidered = result.suspensionsConsidered;

    if (holidaysConsidered.length > 0 || suspensionsConsidered.length > 0) {
      adjustedDate = result.calculatedDate;
      const reasons: string[] = [];
      if (holidaysConsidered.length > 0)
        reasons.push(`Feriados: ${holidaysConsidered.join(", ")}`);
      if (suspensionsConsidered.length > 0)
        reasons.push(`Suspensões: ${suspensionsConsidered.join(", ")}`);
      adjustmentReason = reasons.join("; ");
    }
  }

  const newVersion = (original.version as number) + 1;

  const insertData: Database["public"]["Tables"]["deadline_calculations"]["Insert"] =
    {
      law_firm_id: context.lawFirm.id,
      deadline_id: original.deadline_id as string | null,
      publication_id: original.publication_id as string | null,
      tribunal: original.tribunal as string,
      jurisdition: original.jurisdition as string | null,
      procedure_type: original.procedure_type as string | null,
      rule_description: original.rule_description as string | null,
      disponibilized_at: original.disponibilized_at as string | null,
      published_at: original.published_at as string | null,
      knowledge_at: original.knowledge_at as string | null,
      start_date: startDate,
      quantity,
      unit,
      business_days: businessDays,
      include_start_date: includeStartDate,
      include_end_date: includeEndDate,
      calculated_date: calculatedDate,
      adjusted_date: adjustedDate,
      adjustment_reason: adjustmentReason,
      calendar_id: (original.calendar_id as string | null) ?? null,
      holidays_considered: holidaysConsidered,
      suspensions_considered: suspensionsConsidered,
      calculated_by: context.member?.userId ?? null,
      calculated_at: now,
      status: "calculado",
      version: newVersion,
      previous_version_id: id,
      notes: original.notes as string | null,
    };

  const { data: pub } = await supabase
    .from("deadline_calculations")
    .insert(insertData)
    .select()
    .maybeSingle();

  return pub ? mapCalculationRow(pub) : null;
}

// --- Calendar Events ---

export async function getCalendarEvents(
  context: AppContext,
  calendarId?: string
): Promise<CalendarEvent[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("law_firm_id", context.lawFirm.id)
    .order("start_date", { ascending: true });

  if (calendarId) query = query.eq("calendar_id", calendarId);

  const { data } = await query;
  return (data ?? []).map(mapCalendarEventRow);
}

export async function createCalendarEvent(
  context: AppContext,
  data: {
    calendarId: string;
    eventName: string;
    eventType: CalendarEvent["eventType"];
    startDate: string;
    endDate: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    description?: string;
  }
): Promise<CalendarEvent | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: pub } = await supabase
    .from("calendar_events")
    .insert({
      calendar_id: data.calendarId,
      law_firm_id: context.lawFirm.id,
      event_name: data.eventName,
      event_type: data.eventType,
      start_date: data.startDate,
      end_date: data.endDate,
      is_recurring: data.isRecurring ?? false,
      recurrence_rule: data.recurrenceRule ?? null,
      description: data.description ?? null,
    })
    .select()
    .maybeSingle();

  return pub ? mapCalendarEventRow(pub) : null;
}

export async function deleteCalendarEvent(
  context: AppContext,
  id: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}
