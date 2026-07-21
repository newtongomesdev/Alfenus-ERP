"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateProtocol } from "./queries";
import type { TicketStatus, TicketPriority } from "./constants";
import { VALID_STATUS_TRANSITIONS, ATTACHMENT_CONFIG } from "./constants";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fail(code: string): never {
  redirect(`/suporte?erro=${code}`);
}

async function requireAuth() {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }
  // After the checks above, member and lawFirm are guaranteed non-null
  return context as { status: "ready"; member: NonNullable<typeof context.member>; lawFirm: NonNullable<typeof context.lawFirm> };
}

async function getSupabaseClient() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  return supabase!;
}

async function createEvent(
  client: any,
  lawFirmId: string,
  ticketId: string,
  eventType: string,
  actorId: string,
  metadata: Record<string, unknown> = {},
) {
  await client.from("support_events").insert({
    law_firm_id: lawFirmId,
    ticket_id: ticketId,
    event_type: eventType,
    actor_id: actorId,
    actor_type: "client",
    metadata,
  });
}

async function createAuditLog(
  client: any,
  lawFirmId: string,
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await client.from("audit_logs").insert({
    law_firm_id: lawFirmId,
    actor_id: actorId,
    action,
    entity_type: "support_ticket",
    entity_id: entityId,
    metadata,
  });
}

// ── Actions ─────────────────────────────────────────────────────────────────

export async function createSupportTicketAction(formData: FormData) {
  try {
    const ctx = await requireAuth();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const subject = String(formData.get("subject") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "") || null;
    const priority = (String(formData.get("priority") ?? "normal") as TicketPriority) || "normal";

    if (!subject || subject.length < 3) fail("validacao");
    if (!description || description.length < 10) fail("validacao");

    const protocol = await generateProtocol();
    const now = new Date().toISOString();
    const client = await getSupabaseClient();

    const insertResult = await (client as any)
      .from("support_tickets")
      .insert({
        law_firm_id: ctx.lawFirm.id,
        protocol,
        subject,
        description,
        status: "aberto",
        priority,
        category_id: categoryId,
        created_by: ctx.member.id,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertResult.error) fail("criar_ticket");

    const ticketId = insertResult.data.id as string;

    await createEvent(client, ctx.lawFirm.id, ticketId, "ticket_criado", ctx.member.id, {
      protocol, subject, priority, category_id: categoryId,
    });

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "criou_ticket_suporte", ticketId, {
      protocol, subject,
    });

    revalidatePath("/suporte");
    redirect(`/suporte/${ticketId}?criado=1`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function replyToTicketAction(
  ticketId: string,
  content: string,
  visibility: "public" | "internal" = "public",
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 1) fail("validacao");

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, status")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const msgResult = await (client as any).from("support_messages").insert({
      law_firm_id: ctx.lawFirm.id,
      ticket_id: ticketId,
      author_id: ctx.member.id,
      author_role: "client",
      content: trimmed,
      message_type: "message",
      visibility,
      created_at: new Date().toISOString(),
    });

    if (msgResult.error) fail("enviar_mensagem");

    await createEvent(client, ctx.lawFirm.id, ticketId, "mensagem_enviada", ctx.member.id, {
      visibility, is_internal: visibility === "internal",
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, status")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const currentStatus = ticketResult.data.status as TicketStatus;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(status)) fail("transicao_invalida");

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "resolvido") updateData.resolved_at = new Date().toISOString();
    if (status === "fechado") updateData.closed_at = new Date().toISOString();
    if (status === "cancelado") updateData.closed_at = new Date().toISOString();
    if (status === "aberto") {
      updateData.resolved_at = null;
      updateData.closed_at = null;
    }

    const updateResult = await (client as any)
      .from("support_tickets")
      .update(updateData)
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("atualizar_status");

    await createEvent(client, ctx.lawFirm.id, ticketId, "status_alterado", ctx.member.id, {
      from: currentStatus, to: status,
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function updateTicketPriorityAction(
  ticketId: string,
  priority: TicketPriority,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, priority")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const updateResult = await (client as any)
      .from("support_tickets")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("atualizar_prioridade");

    await createEvent(client, ctx.lawFirm.id, ticketId, "prioridade_alterada", ctx.member.id, {
      from: ticketResult.data.priority, to: priority,
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function assignTicketAction(
  ticketId: string,
  operatorId: string,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, assigned_to")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const updateResult = await (client as any)
      .from("support_tickets")
      .update({
        assigned_to: operatorId || null,
        status: ticketResult.data.status === "aberto" ? "aguardando_suporte" : ticketResult.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("atribuir_ticket");

    await (client as any).from("support_assignments").insert({
      ticket_id: ticketId,
      operator_id: operatorId,
      assigned_by: ctx.member.id,
      law_firm_id: ctx.lawFirm.id,
    });

    await createEvent(client, ctx.lawFirm.id, ticketId, "responsavel_alterado", ctx.member.id, {
      from: ticketResult.data.assigned_to, to: operatorId || null,
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function closeTicketAction(ticketId: string) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, status")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const updateResult = await (client as any)
      .from("support_tickets")
      .update({
        status: "fechado",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("fechar_ticket");

    await createEvent(client, ctx.lawFirm.id, ticketId, "ticket_fechado", ctx.member.id, {
      from: ticketResult.data.status, to: "fechado",
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function cancelTicketAction(ticketId: string) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, status")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const currentStatus = ticketResult.data.status as TicketStatus;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes("cancelado")) fail("transicao_invalida");

    const updateResult = await (client as any)
      .from("support_tickets")
      .update({
        status: "cancelado",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("cancelar_ticket");

    await createEvent(client, ctx.lawFirm.id, ticketId, "ticket_cancelado", ctx.member.id, {
      from: currentStatus, to: "cancelado",
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

export async function reopenTicketAction(ticketId: string) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id, status")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const currentStatus = ticketResult.data.status as TicketStatus;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes("aberto")) fail("transicao_invalida");

    const updateResult = await (client as any)
      .from("support_tickets")
      .update({
        status: "aberto",
        resolved_at: null,
        closed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateResult.error) fail("reabrir_ticket");

    await createEvent(client, ctx.lawFirm.id, ticketId, "ticket_reaberto", ctx.member.id, {
      from: currentStatus, to: "aberto",
    });

    revalidatePath(`/suporte/${ticketId}`);
    revalidatePath("/suporte");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

// ── Validação de anexos ────────────────────────────────────────────────────

export function validateAttachment(file: File): { valid: boolean; error?: string } {
  if (file.size > ATTACHMENT_CONFIG.maxFileSizeBytes) {
    return {
      valid: false,
      error: `Arquivo excede o limite de ${ATTACHMENT_CONFIG.maxFileSizeBytes / (1024 * 1024)}MB`,
    };
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ATTACHMENT_CONFIG.allowedExtensions.includes(ext as any)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido: ${ext}`,
    };
  }

  const allowedMimes = ATTACHMENT_CONFIG.allowedMimeTypes as readonly string[];
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo MIME não permitido: ${file.type}`,
    };
  }

  return { valid: true };
}
