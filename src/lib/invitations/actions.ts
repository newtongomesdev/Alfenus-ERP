"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// ── Client type ──────────────────────────────────────────────────────────────

type InviteClient = {
  from(table: "team_invitations"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown | null; error: Error | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): {
            count(): Promise<{ count: number | null }>;
          };
        };
      };
    };
  };
  from(table: "law_firm_members"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): Promise<{
          count: number | null;
        }>;
      };
    };
  };
  from(table: "law_firms"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown | null; error: Error | null }>;
      };
    };
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fail(code: string): never {
  redirect(`/equipe?erro=${code}`);
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Cancela um convite pendente e registra audit log.
 */
export async function cancelInvitationAction(invitationId: string) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  if (!can(context.member.role, "equipe.gerenciar")) fail("permissao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as InviteClient;

  // Verificar se o convite pertence ao tenant e está pendente
  const { data: invitation, error: fetchError } = await client
    .from("team_invitations")
    .select("id, law_firm_id, status")
    .eq("id", invitationId)
    .maybeSingle();

  if (fetchError || !invitation) fail("convite_nao_encontrado");

  const invite = invitation as { id: string; law_firm_id: string; status: string };

  if (invite.law_firm_id !== context.lawFirm.id) fail("tenant_incorreto");

  if (invite.status !== "pendente" && invite.status !== "visualizado") {
    fail("convite_cancelavel");
  }

  const { error } = await client
    .from("team_invitations")
    .update({ status: "cancelado" })
    .eq("id", invitationId);

  if (error) fail("cancelar_convite");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_convite",
    entity_type: "team_invitation",
    entity_id: invitationId,
  });

  revalidatePath("/equipe");
  redirect("/equipe?cancelado=1");
}

/**
 * Regenera o token, estende a validade (máx. 5 reenvios).
 */
export async function resendInvitationAction(invitationId: string) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  if (!can(context.member.role, "equipe.gerenciar")) fail("permissao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as InviteClient;

  // Verificar convite
  const { data: invitation, error: fetchError } = await client
    .from("team_invitations")
    .select("id, law_firm_id, status")
    .eq("id", invitationId)
    .maybeSingle();

  if (fetchError || !invitation) fail("convite_nao_encontrado");

  const invite = invitation as { id: string; law_firm_id: string; status: string };

  if (invite.law_firm_id !== context.lawFirm.id) fail("tenant_incorreto");

  if (invite.status === "cancelado" || invite.status === "aceito") {
    fail("convite_reenviavel");
  }

  // Verificar limite de reenvios (máx. 5)
  const { count } = await client
    .from("audit_logs")
    .select("id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("entity_type", "team_invitation")
    .eq("entity_id", invitationId)
    .count();

  if ((count ?? 0) >= 5) {
    fail("limite_reenvios");
  }

  const newToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const { error } = await client
    .from("team_invitations")
    .update({ token: newToken, expires_at: expiresAt, status: "pendente" })
    .eq("id", invitationId);

  if (error) fail("reenviar_convite");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "reenviou_convite",
    entity_type: "team_invitation",
    entity_id: invitationId,
  });

  revalidatePath("/equipe");
  redirect("/equipe?reenviado=1");
}

/**
 * Marca um convite como recusado (via token público).
 */
export async function declineInvitationAction(token: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/convite/" + token + "?erro=ambiente");

  const client = supabase as unknown as InviteClient;

  const { data: invitation, error: fetchError } = await client
    .from("team_invitations")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (fetchError || !invitation) {
    redirect("/convite/" + token + "?erro=invalido");
  }

  const invite = invitation as { id: string; status: string };

  if (invite.status !== "pendente" && invite.status !== "visualizado") {
    redirect("/convite/" + token + "?erro=status");
  }

  const { error } = await client
    .from("team_invitations")
    .update({ status: "recusado" })
    .eq("id", invite.id);

  if (error) {
    redirect("/convite/" + token + "?erro=recusar");
  }

  redirect("/convite/" + token + "?recusado=1");
}

/**
 * Verifica se o plano do escritório permite adicionar mais membros.
 * Retorna o limite, o total atual (ativos + pendentes) e se a operação é permitida.
 */
export async function checkInviteLimitAction(): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
}> {
  const context = await getAppContext();
  if (context.status === "missing-env") {
    return { allowed: false, limit: 0, current: 0 };
  }
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { allowed: false, limit: 0, current: 0 };

  const client = supabase as unknown as InviteClient;

  // Contar membros ativos
  const membersResponse = await client
    .from("law_firm_members")
    .select("id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "ativo");
  const memberCount = membersResponse.count;

  // Contar convites pendentes
  const pendingResponse = await client
    .from("audit_logs")
    .select("id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("entity_type", "team_invitation")
    .eq("action", "convidou_membro")
    .count();
  const pendingCount = pendingResponse.count;

  const current = (memberCount ?? 0) + (pendingCount ?? 0);

  // Buscar limite do plano
  const { data: firmData } = await client
    .from("law_firms")
    .select("plan")
    .eq("id", context.lawFirm.id)
    .maybeSingle();

  const firm = firmData as { plan: string } | null;
  if (!firm) return { allowed: false, limit: 0, current };

  const planId = firm.plan;

  // Buscar limite de membros do plano
  const { data: limitData } = await (client as unknown as {
    from(table: "plan_limits"): {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{
            data: unknown | null;
          }>;
        };
      };
    };
  })
    .from("plan_limits")
    .select("limit_value")
    .eq("plan_id", planId)
    .eq("limit_key", "max_members");

  const limit = limitData
    ? (limitData as { limit_value: number }).limit_value
    : -1;

  // -1 significa ilimitado
  if (limit === -1) {
    return { allowed: true, limit: -1, current };
  }

  return {
    allowed: current < limit,
    limit,
    current,
  };
}
