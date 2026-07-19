"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PortalInviteActionClient = {
  from(table: "client_portal_invites"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

export async function createPortalInviteAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "clientes.editar")) redirect("/portal-cliente?erro=permissao");

  const clientId = String(formData.get("clientId") ?? "");
  const email = String(formData.get("email") ?? "").trim() || null;
  const expiresAt = String(formData.get("expiresAt") ?? "").trim() || null;
  if (!clientId) redirect("/portal-cliente?erro=cliente");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/portal-cliente?erro=ambiente");

  const client = supabase as unknown as PortalInviteActionClient;
  const token = crypto.randomBytes(24).toString("base64url");
  const { error } = await client.from("client_portal_invites").insert({
    law_firm_id: context.lawFirm.id,
    client_id: clientId,
    token,
    email,
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    created_by: context.member.id,
  });

  if (error) redirect("/portal-cliente?erro=criacao");
  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_convite_portal_cliente",
    entity_type: "client",
    entity_id: clientId,
    metadata: { email },
  });

  revalidatePath("/portal-cliente");
  redirect("/portal-cliente?criado=1");
}

export async function revokePortalInviteAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "clientes.editar")) redirect("/portal-cliente?erro=permissao");

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) redirect("/portal-cliente?erro=convite");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/portal-cliente?erro=ambiente");

  const client = supabase as unknown as PortalInviteActionClient;
  const { error } = await client.from("client_portal_invites").update({ status: "revogado" }).eq("law_firm_id", context.lawFirm.id).eq("id", inviteId);
  if (error) redirect("/portal-cliente?erro=revogar");

  revalidatePath("/portal-cliente");
  redirect("/portal-cliente?revogado=1");
}
