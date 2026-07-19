"use server";

import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type InviteClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: unknown | null; error: Error | null }>;
        };
      };
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    } & PromiseLike<{ error: Error | null }>;
  };
};

export async function acceptInvitationAction(token: string) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/convite/" + token + "?erro=ambiente");
  }
  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/convite/" + token + "?erro=ambiente");
  }

  const client = supabase as unknown as InviteClient;

  // Buscar convite válido
  const { data: invitation, error: fetchError } = await client
    .from("team_invitations")
    .select("id, law_firm_id, email, role, status, expires_at")
    .eq("token", token)
    .eq("status", "pendente")
    .maybeSingle();

  if (fetchError || !invitation) {
    redirect("/convite/" + token + "?erro=invalido");
  }

  const invite = invitation as {
    id: string;
    law_firm_id: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
  };

  // Verificar se não expirou
  if (new Date(invite.expires_at) < new Date()) {
    redirect("/convite/" + token + "?erro=expirado");
  }

  // Verificar se o e-mail do usuário logado bate com o convite
  const { data: sessionData } = await supabase.auth.getUser();
  const userEmail = sessionData?.user?.email?.toLowerCase();
  if (!userEmail || userEmail !== invite.email.toLowerCase()) {
    redirect("/convite/" + token + "?erro=email");
  }

  // Verificar se já é membro
  const { data: existingMember } = await client
    .from("law_firm_members")
    .select("id")
    .eq("law_firm_id", invite.law_firm_id)
    .eq("user_id", sessionData!.user!.id)
    .maybeSingle();

  if (existingMember) {
    // Já é membro, apenas marca convite como aceito
    await client
      .from("team_invitations")
      .update({ status: "aceito", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    redirect("/dashboard");
  }

  // Criar membro — retorna o ID para uso no audit log
  const { data: newMember, error: insertError } = await client.from("law_firm_members").insert({
    law_firm_id: invite.law_firm_id,
    user_id: sessionData!.user!.id,
    name: sessionData!.user!.user_metadata?.name || sessionData!.user!.email?.split("@")[0] || "Membro",
    email: invite.email,
    role: invite.role,
    status: "ativo",
  }).select("id").single();

  if (insertError) {
    redirect("/convite/" + token + "?erro=membro");
  }

  // Marcar convite como aceito
  await client
    .from("team_invitations")
    .update({ status: "aceito", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Audit log — usa o ID do membro recém-criado (não o auth UUID)
  await client.from("audit_logs").insert({
    law_firm_id: invite.law_firm_id,
    actor_id: (newMember as { id: string }).id,
    action: "aceitou_convite",
    entity_type: "team_invitation",
    entity_id: invite.id,
    metadata: { role: invite.role },
  });

  redirect("/dashboard");
}
