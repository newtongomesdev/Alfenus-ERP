"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validations/foundation";

type InsertClient = {
  from(table: "clients"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

type ClientUpdateClient = {
  from(table: "clients"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): PromiseLike<{ error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
};

function normalizeTags(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function createClientAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/clientes/novo?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "clientes.criar")) {
    redirect("/clientes/novo?erro=permissao");
  }

  const parsed = clientSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    personType: String(formData.get("personType") ?? "fisica"),
    document: String(formData.get("document") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    profession: String(formData.get("profession") ?? "").trim(),
    maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    interestArea: String(formData.get("interestArea") ?? "").trim(),
    status: String(formData.get("status") ?? "ativo"),
    notes: String(formData.get("notes") ?? "").trim(),
    tags: String(formData.get("tags") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/clientes/novo?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/clientes/novo?erro=ambiente");
  }

  const insertClient = supabase as unknown as InsertClient;
  const { data: client, error } = await insertClient
    .from("clients")
    .insert({
      law_firm_id: context.lawFirm.id,
      name: parsed.data.name,
      person_type: parsed.data.personType,
      document: parsed.data.document || null,
      birth_date: parsed.data.birthDate || null,
      profession: parsed.data.profession || null,
      marital_status: parsed.data.maritalStatus || null,
      whatsapp: parsed.data.whatsapp || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      source: parsed.data.source || null,
      interest_area: parsed.data.interestArea,
      responsible_member_id: context.member.id,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      tags: normalizeTags(parsed.data.tags),
    })
    .select("id")
    .single();

  if (error) {
    redirect("/clientes/novo?erro=criacao");
  }

  await insertClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_cliente",
    entity_type: "client",
    entity_id: (client as { id: string }).id,
    metadata: { name: parsed.data.name, interest_area: parsed.data.interestArea },
  });

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  redirect("/clientes?criado=1");
}

export async function updateClientAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/clientes?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "clientes.editar")) {
    redirect("/clientes?erro=permissao");
  }

  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) {
    redirect("/clientes?erro=validacao");
  }

  const parsed = clientSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    personType: String(formData.get("personType") ?? "fisica"),
    document: String(formData.get("document") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    profession: String(formData.get("profession") ?? "").trim(),
    maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    interestArea: String(formData.get("interestArea") ?? "").trim(),
    status: String(formData.get("status") ?? "ativo"),
    notes: String(formData.get("notes") ?? "").trim(),
    tags: String(formData.get("tags") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect(`/clientes/${clientId}/editar?erro=validacao`);
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect(`/clientes/${clientId}/editar?erro=ambiente`);
  }

  const mutationClient = supabase as unknown as ClientUpdateClient;
  const { error } = await mutationClient
    .from("clients")
    .update({
      name: parsed.data.name,
      person_type: parsed.data.personType,
      document: parsed.data.document || null,
      birth_date: parsed.data.birthDate || null,
      profession: parsed.data.profession || null,
      marital_status: parsed.data.maritalStatus || null,
      whatsapp: parsed.data.whatsapp || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      source: parsed.data.source || null,
      interest_area: parsed.data.interestArea,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      tags: normalizeTags(parsed.data.tags),
    })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", clientId);

  if (error) {
    redirect(`/clientes/${clientId}/editar?erro=atualizacao`);
  }

  await mutationClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "editou_cliente",
    entity_type: "client",
    entity_id: clientId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?atualizado=1`);
}

export async function archiveClientAction(formData: FormData) {
  const context = await getAppContext();

  if (context.status === "missing-env") {
    redirect("/clientes?erro=ambiente");
  }

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant" || !context.member || !context.lawFirm) {
    redirect("/onboarding");
  }

  if (!can(context.member.role, "clientes.arquivar")) {
    redirect("/clientes?erro=permissao");
  }

  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) {
    redirect("/clientes?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect(`/clientes/${clientId}?erro=ambiente`);
  }

  const mutationClient = supabase as unknown as ClientUpdateClient;
  const { error } = await mutationClient
    .from("clients")
    .update({
      status: "arquivado",
      archived_at: new Date().toISOString(),
    })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", clientId);

  if (error) {
    redirect(`/clientes/${clientId}?erro=arquivamento`);
  }

  await mutationClient.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "arquivou_cliente",
    entity_type: "client",
    entity_id: clientId,
    metadata: {},
  });

  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  redirect("/clientes?arquivado=1");
}

export async function anonymizeClientAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "configuracoes.administrar")) redirect("/clientes?erro=permissao");
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) redirect("/clientes?erro=validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/clientes/${clientId}?erro=ambiente`);
  const mutationClient = supabase as unknown as ClientUpdateClient;
  const { error } = await mutationClient.from("clients").update({ name: "Titular anonimizado", document: null, birth_date: null, profession: null, marital_status: null, whatsapp: null, phone: null, email: null, address: {}, notes: null, tags: [], status: "arquivado", archived_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", clientId);
  if (error) redirect(`/clientes/${clientId}?erro=anonimizacao`);
  await mutationClient.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "anonimizou_cliente", entity_type: "client", entity_id: clientId, metadata: { reason: "solicitacao_lgpd" } });
  revalidatePath("/clientes"); revalidatePath(`/clientes/${clientId}`); redirect("/clientes?anonimizado=1");
}
