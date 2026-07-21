"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACCESS_REQUEST_STATUSES,
  SESSION_STATUSES,
  ASSISTED_MODULES,
  ASSISTED_ACTIONS,
  MAX_DURATION_MINUTES,
} from "./constants";
import type { AccessRequestStatus } from "./constants";
import { getExpiresAt, isActionForbidden } from "./service";

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
  return context as {
    status: "ready";
    member: NonNullable<typeof context.member>;
    lawFirm: NonNullable<typeof context.lawFirm>;
  };
}

async function getSupabaseClient() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  return supabase!;
}

async function createAccessEvent(
  client: any,
  lawFirmId: string,
  eventType: string,
  actorId: string,
  metadata: Record<string, unknown> = {},
  accessRequestId?: string | null,
  sessionId?: string | null,
) {
  await client.from("support_access_events").insert({
    law_firm_id: lawFirmId,
    access_request_id: accessRequestId ?? null,
    session_id: sessionId ?? null,
    event_type: eventType,
    actor_id: actorId,
    actor_type: "operator",
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
    entity_type: "access_request",
    entity_id: entityId,
    metadata,
  });
}

function validateModules(modules: string[]): boolean {
  return modules.every((m) => (ASSISTED_MODULES as readonly string[]).includes(m));
}

function validateActions(actions: string[]): boolean {
  return actions.every(
    (a) =>
      (ASSISTED_ACTIONS as readonly string[]).includes(a) &&
      !isActionForbidden(a),
  );
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Cria uma solicitação de acesso assistido para um ticket de suporte.
 */
export async function requestSupportAccessAction(
  ticketId: string,
  reason: string,
  modules: string[],
  actions: string[],
  durationMinutes: number,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 5) fail("validacao");
    if (!modules.length || !validateModules(modules)) fail("validacao");
    if (!actions.length || !validateActions(actions)) fail("validacao");
    if (durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES) fail("validacao");

    // Verificar se o ticket pertence ao tenant
    const ticketResult = await (client as any)
      .from("support_tickets")
      .select("id, law_firm_id")
      .eq("id", ticketId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (ticketResult.error || !ticketResult.data) fail("ticket_nao_encontrado");

    const now = new Date().toISOString();

    const insertResult = await (client as any)
      .from("support_access_requests")
      .insert({
        law_firm_id: ctx.lawFirm.id,
        ticket_id: ticketId,
        operator_id: ctx.member.id,
        status: "pendente",
        reason: trimmedReason,
        requested_modules: modules,
        requested_actions: actions,
        duration_minutes: durationMinutes,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertResult.error) fail("criar_solicitacao");

    const requestId = insertResult.data.id as string;

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "solicitacao_criada",
      ctx.member.id,
      { reason: trimmedReason, modules, actions, duration_minutes: durationMinutes },
      requestId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "criou_solicitacao_acesso", requestId, {
      ticket_id: ticketId,
      modules,
      actions,
    });

    revalidatePath("/suporte");
    revalidatePath(`/suporte/${ticketId}`);
    redirect(`/suporte/${ticketId}?solicitacao_criada=1`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Aprova uma solicitação de acesso, opcionalmente com restrições.
 */
export async function approveSupportAccessAction(
  requestId: string,
  durationMinutes?: number,
  modules?: string[],
  restrictions?: string[],
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const { data: request, error: reqError } = await (client as any)
      .from("support_access_requests")
      .select("id, law_firm_id, status, requested_modules, requested_actions")
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (reqError || !request) fail("solicitacao_nao_encontrada");

    if (request.status !== "pendente" && request.status !== "visualizada") {
      fail("transicao_invalida");
    }

    const effectiveDuration = durationMinutes ?? request.duration_minutes;
    if (effectiveDuration <= 0 || effectiveDuration > MAX_DURATION_MINUTES) fail("validacao");

    const effectiveModules = modules ?? request.requested_modules;
    if (!validateModules(effectiveModules)) fail("validacao");

    const hasRestrictions = restrictions && restrictions.length > 0;
    const newStatus: AccessRequestStatus = hasRestrictions
      ? "aprovada_com_restrições"
      : "aprovada";

    const now = new Date().toISOString();

    const { error: updateError } = await (client as any)
      .from("support_access_requests")
      .update({
        status: newStatus,
        approved_by: ctx.member.id,
        approved_at: now,
        approved_modules: effectiveModules,
        approved_actions: request.requested_actions,
        restrictions: restrictions ?? null,
        duration_minutes: effectiveDuration,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateError) fail("aprovar_solicitacao");

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "solicitacao_aprovada",
      ctx.member.id,
      {
        duration_minutes: effectiveDuration,
        modules: effectiveModules,
        restrictions: restrictions ?? [],
        has_restrictions: hasRestrictions,
      },
      requestId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "aprovou_solicitacao_acesso", requestId, {
      duration_minutes: effectiveDuration,
      has_restrictions: hasRestrictions,
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Rejeita uma solicitação de acesso.
 */
export async function rejectSupportAccessAction(
  requestId: string,
  reason?: string,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const { data: request, error: reqError } = await (client as any)
      .from("support_access_requests")
      .select("id, law_firm_id, status")
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (reqError || !request) fail("solicitacao_nao_encontrada");
    if (request.status !== "pendente" && request.status !== "visualizada") {
      fail("transicao_invalida");
    }

    const now = new Date().toISOString();

    const { error: updateError } = await (client as any)
      .from("support_access_requests")
      .update({
        status: "recusada",
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateError) fail("recusar_solicitacao");

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "solicitacao_recusada",
      ctx.member.id,
      { reason: reason ?? null },
      requestId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "recusou_solicitacao_acesso", requestId, {
      reason: reason ?? null,
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Altera o escopo de uma solicitação já aprovada (restringe).
 */
export async function restrictSupportAccessAction(
  requestId: string,
  restrictions: string[],
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const { data: request, error: reqError } = await (client as any)
      .from("support_access_requests")
      .select("id, law_firm_id, status, restrictions")
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (reqError || !request) fail("solicitacao_nao_encontrada");
    if (request.status !== "aprovada" && request.status !== "aprovada_com_restrições") {
      fail("transicao_invalida");
    }

    const now = new Date().toISOString();
    const hasRestrictions = restrictions.length > 0;

    const { error: updateError } = await (client as any)
      .from("support_access_requests")
      .update({
        status: hasRestrictions ? "aprovada_com_restrições" : "aprovada",
        restrictions: hasRestrictions ? restrictions : null,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id);

    if (updateError) fail("restringir_solicitacao");

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "escopo_alterado",
      ctx.member.id,
      { restrictions, previous_restrictions: request.restrictions },
      requestId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "alterou_escopo_acesso", requestId, {
      restrictions,
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Inicia uma sessão de acesso assistido após aprovação.
 */
export async function startSupportSessionAction(requestId: string) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const { data: request, error: reqError } = await (client as any)
      .from("support_access_requests")
      .select("id, law_firm_id, status, duration_minutes")
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id)
      .single();

    if (reqError || !request) fail("solicitacao_nao_encontrada");
    if (request.status !== "aprovada" && request.status !== "aprovada_com_restrições") {
      fail("transicao_invalida");
    }

    const now = new Date().toISOString();
    const expiresAt = getExpiresAt(request.duration_minutes);

    const insertResult = await (client as any)
      .from("support_access_sessions")
      .insert({
        law_firm_id: ctx.lawFirm.id,
        access_request_id: requestId,
        operator_id: request.operator_id ?? ctx.member.id,
        status: "ativa",
        started_at: now,
        expires_at: expiresAt,
        created_at: now,
      })
      .select("id")
      .single();

    if (insertResult.error) fail("criar_sessao");

    const sessionId = insertResult.data.id as string;

    // Atualizar status da solicitação
    await (client as any)
      .from("support_access_requests")
      .update({
        status: "utilizada",
        started_at: now,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("law_firm_id", ctx.lawFirm.id);

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "sessao_iniciada",
      ctx.member.id,
      { expires_at: expiresAt, duration_minutes: request.duration_minutes },
      requestId,
      sessionId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "iniciou_sessao_acesso", sessionId, {
      access_request_id: requestId,
      expires_at: expiresAt,
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Encerra uma sessão voluntariamente pelo operador.
 */
export async function endSupportSessionAction(
  sessionId: string,
  summary?: string,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const { data: session, error: sessError } = await (client as any)
      .from("support_access_sessions")
      .select("id, law_firm_id, operator_id, status, access_request_id")
      .eq("id", sessionId)
      .single();

    if (sessError || !session) fail("sessao_nao_encontrada");

    if (session.law_firm_id !== ctx.lawFirm.id) fail("tenant_incorreto");

    const activeStatuses = ["ativa", "aguardando_inicio", "suspensa"];
    if (!activeStatuses.includes(session.status)) {
      fail("sessao_ja_encerrada");
    }

    const now = new Date().toISOString();

    const { error: updateError } = await (client as any)
      .from("support_access_sessions")
      .update({
        status: SESSION_STATUSES.encerrada,
        ended_at: now,
        summary: summary?.trim() || null,
      })
      .eq("id", sessionId);

    if (updateError) fail("encerrar_sessao");

    // Atualizar solicitação
    if (session.access_request_id) {
      await (client as any)
        .from("support_access_requests")
        .update({
          status: "encerrada",
          ended_at: now,
          summary: summary?.trim() || null,
          updated_at: now,
        })
        .eq("id", session.access_request_id);
    }

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "sessao_encerrada",
      ctx.member.id,
      { summary: summary?.trim() || null, operator_initiated: true },
      session.access_request_id,
      sessionId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "encerrou_sessao_acesso", sessionId, {
      summary: summary?.trim() || null,
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Revoga uma sessão pelo tenant (proprietário/administrador).
 */
export async function revokeSupportAccessAction(
  sessionId: string,
  reason: string,
) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    if (!can(ctx.member.role, "configuracoes.administrar")) {
      fail("permissao");
    }

    const { data: session, error: sessError } = await (client as any)
      .from("support_access_sessions")
      .select("id, law_firm_id, status, access_request_id")
      .eq("id", sessionId)
      .single();

    if (sessError || !session) fail("sessao_nao_encontrada");
    if (session.law_firm_id !== ctx.lawFirm.id) fail("tenant_incorreto");

    const activeStatuses = ["ativa", "aguardando_inicio", "suspensa"];
    if (!activeStatuses.includes(session.status)) {
      fail("sessao_ja_encerrada");
    }

    if (!reason || reason.trim().length < 3) fail("validacao");

    const now = new Date().toISOString();

    const { error: updateError } = await (client as any)
      .from("support_access_sessions")
      .update({
        status: SESSION_STATUSES.revogada,
        ended_at: now,
      })
      .eq("id", sessionId);

    if (updateError) fail("revogar_sessao");

    // Atualizar solicitação
    if (session.access_request_id) {
      await (client as any)
        .from("support_access_requests")
        .update({
          status: "encerrada",
          ended_at: now,
          updated_at: now,
        })
        .eq("id", session.access_request_id);
    }

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "sessao_revogada",
      ctx.member.id,
      { reason: reason.trim() },
      session.access_request_id,
      sessionId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "revogou_sessao_acesso", sessionId, {
      reason: reason.trim(),
    });

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}

/**
 * Cancela uma solicitação pendente pelo operador.
 */
export async function cancelAccessRequestAction(requestId: string) {
  try {
    const ctx = await requireAuth();
    const client = await getSupabaseClient();

    const { data: request, error: reqError } = await (client as any)
      .from("support_access_requests")
      .select("id, law_firm_id, status, operator_id")
      .eq("id", requestId)
      .single();

    if (reqError || !request) fail("solicitacao_nao_encontrada");

    // Operador só pode cancelar suas próprias solicitações
    if (request.operator_id !== ctx.member.id) {
      fail("permissao");
    }

    if (request.status !== "pendente" && request.status !== "visualizada") {
      fail("transicao_invalida");
    }

    const now = new Date().toISOString();

    const { error: updateError } = await (client as any)
      .from("support_access_requests")
      .update({
        status: "cancelada",
        updated_at: now,
      })
      .eq("id", requestId);

    if (updateError) fail("cancelar_solicitacao");

    await createAccessEvent(
      client,
      ctx.lawFirm.id,
      "solicitacao_cancelada",
      ctx.member.id,
      {},
      requestId,
    );

    await createAuditLog(client, ctx.lawFirm.id, ctx.member.id, "cancelou_solicitacao_acesso", requestId, {});

    revalidatePath("/suporte");
    revalidatePath("/suporte/acesso-assistido");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    fail("erro_interno");
  }
}
