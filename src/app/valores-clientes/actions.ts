"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function cents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

const APPROVAL_THRESHOLD_CENTS = 500_000; // R$ 5.000,00

export async function createAccountAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/valores-clientes/contas?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "financeiro.editar")) redirect("/valores-clientes/contas?erro=permissao");

  const clientId = String(formData.get("clientId") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const initialBalance = cents(formData.get("initialBalance"));

  if (!clientId || !accountName) redirect("/valores-clientes/contas?erro=validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/valores-clientes/contas?erro=ambiente");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("client_accounts")
    .insert({
      law_firm_id: context.lawFirm.id,
      client_id: clientId,
      name: accountName,
      balance_cents: initialBalance,
      status: "ativa",
      created_by: context.member.id,
    });

  if (error) redirect("/valores-clientes/contas?erro=criacao");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_conta_cliente",
    entity_type: "client_account",
    entity_id: null,
    metadata: { client_id: clientId, account_name: accountName, initial_balance_cents: initialBalance },
  });

  revalidatePath("/valores-clientes");
  revalidatePath("/valores-clientes/contas");
  redirect("/valores-clientes/contas?criado=1");
}

export async function createTransactionAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/valores-clientes/transacoes?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "financeiro.editar")) redirect("/valores-clientes/transacoes?erro=permissao");

  const accountId = String(formData.get("accountId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const amount = cents(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();

  if (!accountId || !type || amount <= 0 || !description) {
    redirect("/valores-clientes/transacoes?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/valores-clientes/transacoes?erro=ambiente");

  // Validate: negative balance not allowed
  if (type === "saida" || type === "transferencia") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account } = await (supabase as any)
      .from("client_accounts")
      .select("balance_cents")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("id", accountId)
      .maybeSingle();

    if (account && account.balance_cents < amount) {
      redirect("/valores-clientes/transacoes?erro=saldo");
    }
  }

  // Approval required above threshold
  const requiresApproval = amount > APPROVAL_THRESHOLD_CENTS;
  const status = requiresApproval ? "pendente" : "aprovado";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transaction, error } = await (supabase as any)
    .from("client_transactions")
    .insert({
      law_firm_id: context.lawFirm.id,
      account_id: accountId,
      type,
      amount_cents: amount,
      description,
      status,
      created_by: context.member.id,
    })
    .select("id")
    .single();

  if (error) redirect("/valores-clientes/transacoes?erro=criacao");

  // If approved, update account balance
  if (status === "aprovado") {
    const balanceDelta = type === "entrada" ? amount : -amount;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("client_accounts")
      .update({ balance_cents: { __op: "increment", __value: balanceDelta } })
      .eq("law_firm_id", context.lawFirm.id)
      .eq("id", accountId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "criou_transacao_cliente",
    entity_type: "client_transaction",
    entity_id: (transaction as { id: string } | null)?.id ?? null,
    metadata: { account_id: accountId, type, amount_cents: amount, requires_approval: requiresApproval },
  });

  revalidatePath("/valores-clientes");
  revalidatePath("/valores-clientes/transacoes");
  revalidatePath("/valores-clientes/contas");
  redirect("/valores-clientes/transacoes?criado=1");
}

export async function approveTransactionAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "financeiro.editar")) redirect("/valores-clientes/transacoes?erro=permissao");

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const action = String(formData.get("approvalAction") ?? "").trim();

  if (!transactionId || (action !== "aprovado" && action !== "rejeitado")) {
    redirect("/valores-clientes/transacoes?erro=validacao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/valores-clientes/transacoes?erro=ambiente");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transaction } = await (supabase as any)
    .from("client_transactions")
    .select("id, account_id, type, amount_cents, status")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", transactionId)
    .maybeSingle();

  if (!transaction || transaction.status !== "pendente") {
    redirect("/valores-clientes/transacoes?erro=validacao");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("client_transactions")
    .update({ status: action, approved_by: context.member.id, approved_at: new Date().toISOString() })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", transactionId);

  if (error) redirect("/valores-clientes/transacoes?erro=aprovacao");

  // If approved, update account balance
  if (action === "aprovado") {
    const balanceDelta = transaction.type === "entrada" ? transaction.amount_cents : -transaction.amount_cents;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("client_accounts")
      .update({ balance_cents: { __op: "increment", __value: balanceDelta } })
      .eq("law_firm_id", context.lawFirm.id)
      .eq("id", transaction.account_id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: action === "aprovado" ? "aprovou_transacao_cliente" : "rejeitou_transacao_cliente",
    entity_type: "client_transaction",
    entity_id: transactionId,
    metadata: { amount_cents: transaction.amount_cents, type: transaction.type },
  });

  revalidatePath("/valores-clientes");
  revalidatePath("/valores-clientes/transacoes");
  revalidatePath("/valores-clientes/contas");
  redirect("/valores-clientes/transacoes?aprovado=1");
}

export async function generateStatementAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") redirect("/valores-clientes/extratos?erro=ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "financeiro.editar")) redirect("/valores-clientes/extratos?erro=permissao");

  const accountId = String(formData.get("accountId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();

  if (!accountId || !periodStart || !periodEnd) {
    redirect("/valores-clientes/extratos?erro=validacao");
  }

  if (periodStart > periodEnd) {
    redirect("/valores-clientes/extratos?erro=periodo");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/valores-clientes/extratos?erro=ambiente");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("client_statements")
    .insert({
      law_firm_id: context.lawFirm.id,
      account_id: accountId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "gerado",
      generated_by: context.member.id,
    });

  if (error) redirect("/valores-clientes/extratos?erro=geracao");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "gerou_extrato_cliente",
    entity_type: "client_statement",
    entity_id: null,
    metadata: { account_id: accountId, period_start: periodStart, period_end: periodEnd },
  });

  revalidatePath("/valores-clientes");
  revalidatePath("/valores-clientes/extratos");
  redirect("/valores-clientes/extratos?gerado=1");
}
