import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppContext } from "@/lib/auth/context";
import type { Database } from "@/lib/supabase/types";
import type {
  Communication,
  CommunicationThread,
  CommunicationAttachment,
} from "./types";

type CommunicationUpdate =
  Database["public"]["Tables"]["communications"]["Update"];
type ThreadUpdate =
  Database["public"]["Tables"]["communication_threads"]["Update"];

// --- Row mappers ---

function mapCommunicationRow(
  row: Record<string, unknown>
): Communication {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    senderMemberId: row.sender_member_id as string,
    subject: row.subject as string,
    content: row.content as string,
    communicationType: row.communication_type as string,
    visibility: row.visibility as string,
    channel: row.channel as string | null,
    clientId: row.client_id as string | null,
    legalCaseId: row.legal_case_id as string | null,
    contractRequestId: row.contract_request_id as string | null,
    leadId: row.lead_id as string | null,
    threadId: row.thread_id as string | null,
    parentId: row.parent_id as string | null,
    isPinned: row.is_pinned as boolean,
    readBy: (row.read_by as unknown[]) ?? [],
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapThreadRow(
  row: Record<string, unknown>
): CommunicationThread {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    title: row.title as string,
    subject: row.subject as string | null,
    clientId: row.client_id as string | null,
    legalCaseId: row.legal_case_id as string | null,
    createdBy: row.created_by as string,
    lastMessageAt: row.last_message_at as string | null,
    messageCount: row.message_count as number,
    isArchived: row.is_archived as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapAttachmentRow(
  row: Record<string, unknown>
): CommunicationAttachment {
  return {
    id: row.id as string,
    lawFirmId: row.law_firm_id as string,
    communicationId: row.communication_id as string,
    fileName: row.file_name as string,
    fileSize: row.file_size as number | null,
    mimeType: row.mime_type as string | null,
    storagePath: row.storage_path as string,
    uploadedBy: row.uploaded_by as string,
    createdAt: row.created_at as string,
  };
}

// --- Communications ---

export type CommunicationFilters = {
  communicationType?: string;
  status?: string;
  clientId?: string;
  threadId?: string;
  senderMemberId?: string;
};

export async function getCommunications(
  context: AppContext,
  filters?: CommunicationFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ communications: Communication[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { communications: [], total: 0 };

  let query = supabase
    .from("communications")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.communicationType)
    query = query.eq("communication_type", filters.communicationType);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.threadId) query = query.eq("thread_id", filters.threadId);
  if (filters?.senderMemberId)
    query = query.eq("sender_member_id", filters.senderMemberId);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    communications: (data ?? []).map(mapCommunicationRow),
    total: count ?? 0,
  };
}

export async function getCommunicationById(
  context: AppContext,
  id: string
): Promise<Communication | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("communications")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapCommunicationRow(data) : null;
}

export async function createCommunication(
  context: AppContext,
  data: {
    senderMemberId: string;
    subject: string;
    content: string;
    communicationType?: string;
    visibility?: string;
    channel?: string;
    clientId?: string;
    legalCaseId?: string;
    contractRequestId?: string;
    leadId?: string;
    threadId?: string;
    parentId?: string;
    isPinned?: boolean;
    status?: string;
  }
): Promise<Communication | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const insertData: Database["public"]["Tables"]["communications"]["Insert"] = {
    law_firm_id: context.lawFirm.id,
    sender_member_id: data.senderMemberId,
    subject: data.subject,
    content: data.content,
    communication_type: data.communicationType ?? "mensagem_interna",
    visibility: data.visibility ?? "equipe",
    channel: data.channel ?? "interno",
    client_id: data.clientId ?? null,
    legal_case_id: data.legalCaseId ?? null,
    contract_request_id: data.contractRequestId ?? null,
    lead_id: data.leadId ?? null,
    thread_id: data.threadId ?? null,
    parent_id: data.parentId ?? null,
    is_pinned: data.isPinned ?? false,
    status: data.status ?? "enviada",
  };

  const { data: row } = await supabase
    .from("communications")
    .insert(insertData)
    .select()
    .maybeSingle();

  return row ? mapCommunicationRow(row) : null;
}

export async function updateCommunication(
  context: AppContext,
  id: string,
  data: Partial<{
    subject: string;
    content: string;
    communicationType: string;
    visibility: string;
    channel: string;
    clientId: string;
    legalCaseId: string;
    contractRequestId: string;
    leadId: string;
    threadId: string;
    parentId: string;
    isPinned: boolean;
    status: string;
  }>
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const update: CommunicationUpdate = {};

  if (data.subject !== undefined) update.subject = data.subject;
  if (data.content !== undefined) update.content = data.content;
  if (data.communicationType !== undefined)
    update.communication_type = data.communicationType;
  if (data.visibility !== undefined) update.visibility = data.visibility;
  if (data.channel !== undefined) update.channel = data.channel;
  if (data.clientId !== undefined) update.client_id = data.clientId;
  if (data.legalCaseId !== undefined)
    update.legal_case_id = data.legalCaseId;
  if (data.contractRequestId !== undefined)
    update.contract_request_id = data.contractRequestId;
  if (data.leadId !== undefined) update.lead_id = data.leadId;
  if (data.threadId !== undefined) update.thread_id = data.threadId;
  if (data.parentId !== undefined) update.parent_id = data.parentId;
  if (data.isPinned !== undefined) update.is_pinned = data.isPinned;
  if (data.status !== undefined) update.status = data.status;

  await supabase
    .from("communications")
    .update(update)
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

export async function markAsRead(
  context: AppContext,
  id: string,
  memberId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return;

  // Fetch current read_by to append
  const { data: comm } = await supabase
    .from("communications")
    .select("read_by")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!comm) return;

  const readBy = (comm.read_by as string[]) ?? [];
  if (!readBy.includes(memberId)) {
    readBy.push(memberId);
  }

  await supabase
    .from("communications")
    .update({
      read_by: readBy,
      status: "lida",
    })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id);
}

export async function pinCommunication(
  context: AppContext,
  id: string,
  pinned: boolean
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("communications")
    .update({ is_pinned: pinned })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// --- Threads ---

export type ThreadFilters = {
  clientId?: string;
  legalCaseId?: string;
  isArchived?: boolean;
};

export async function getThreads(
  context: AppContext,
  filters?: ThreadFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ threads: CommunicationThread[]; total: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm)
    return { threads: [], total: 0 };

  let query = supabase
    .from("communication_threads")
    .select("*", { count: "exact" })
    .eq("law_firm_id", context.lawFirm.id);

  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.legalCaseId)
    query = query.eq("legal_case_id", filters.legalCaseId);
  if (filters?.isArchived !== undefined)
    query = query.eq("is_archived", filters.isArchived);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);

  return {
    threads: (data ?? []).map(mapThreadRow),
    total: count ?? 0,
  };
}

export async function getThreadById(
  context: AppContext,
  id: string
): Promise<CommunicationThread | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data } = await supabase
    .from("communication_threads")
    .select("*")
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  return data ? mapThreadRow(data) : null;
}

export async function createThread(
  context: AppContext,
  data: {
    title: string;
    subject?: string;
    clientId?: string;
    legalCaseId?: string;
    createdBy: string;
  }
): Promise<CommunicationThread | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: row } = await supabase
    .from("communication_threads")
    .insert({
      law_firm_id: context.lawFirm.id,
      title: data.title,
      subject: data.subject ?? null,
      client_id: data.clientId ?? null,
      legal_case_id: data.legalCaseId ?? null,
      created_by: data.createdBy,
      last_message_at: new Date().toISOString(),
      message_count: 0,
    })
    .select()
    .maybeSingle();

  return row ? mapThreadRow(row) : null;
}

export async function archiveThread(
  context: AppContext,
  id: string,
  archived: boolean = true
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("communication_threads")
    .update({ is_archived: archived })
    .eq("id", id)
    .eq("law_firm_id", context.lawFirm?.id ?? "");
}

// --- Attachments ---

export async function getAttachments(
  context: AppContext,
  communicationId: string
): Promise<CommunicationAttachment[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return [];

  const { data } = await supabase
    .from("communication_attachments")
    .select("*")
    .eq("communication_id", communicationId)
    .eq("law_firm_id", context.lawFirm.id)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapAttachmentRow);
}

export async function createAttachment(
  context: AppContext,
  data: {
    communicationId: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    storagePath: string;
    uploadedBy: string;
  }
): Promise<CommunicationAttachment | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase || !context.lawFirm) return null;

  const { data: row } = await supabase
    .from("communication_attachments")
    .insert({
      law_firm_id: context.lawFirm.id,
      communication_id: data.communicationId,
      file_name: data.fileName,
      file_size: data.fileSize ?? null,
      mime_type: data.mimeType ?? null,
      storage_path: data.storagePath,
      uploaded_by: data.uploadedBy,
    })
    .select()
    .maybeSingle();

  return row ? mapAttachmentRow(row) : null;
}
