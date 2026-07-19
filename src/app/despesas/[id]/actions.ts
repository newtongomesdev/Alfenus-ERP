"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { expenseSchema } from "@/lib/validations/foundation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ExpenseReadClient = {
  from(table: "expenses"): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null; error: Error | null }> };
      };
    };
  };
};

type ExpenseUpdateClient = {
  from(table: "expenses"): {
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

function cents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

function fail(error: string): never {
  redirect(`/despesas?erro=${error}`);
}

export type ExpenseData = {
  id: string;
  description: string;
  category: string;
  amount_cents: number;
  supplier: string | null;
  client_id: string | null;
  legal_case_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  responsible_member_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getExpenseById(lawFirmId: string, expenseId: string): Promise<ExpenseData | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await (supabase as unknown as ExpenseReadClient)
    .from("expenses")
    .select("id, description, category, amount_cents, supplier, client_id, legal_case_id, due_date, paid_at, status, responsible_member_id, notes, created_at, updated_at")
    .eq("law_firm_id", lawFirmId)
    .eq("id", expenseId)
    .maybeSingle();
  return (data as ExpenseData | null) ?? null;
}

export async function updateExpenseAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "despesas.editar")) fail("permissao");

  const expenseId = String(formData.get("expenseId") ?? "");
  if (!expenseId) fail("validacao");

  const parsed = expenseSchema.safeParse({
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    amountCents: cents(formData.get("amount")),
    dueDate: String(formData.get("dueDate") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    legalCaseId: String(formData.get("legalCaseId") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ExpenseUpdateClient;
  const { error } = await client
    .from("expenses")
    .update({
      description: parsed.data.description,
      category: parsed.data.category,
      amount_cents: parsed.data.amountCents,
      due_date: parsed.data.dueDate || null,
      client_id: parsed.data.clientId || null,
      legal_case_id: parsed.data.legalCaseId || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", expenseId);

  if (error) fail("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "atualizou_despesa",
    entity_type: "expense",
    entity_id: expenseId,
    metadata: { amount_cents: parsed.data.amountCents },
  });

  revalidatePath("/despesas");
  revalidatePath("/fluxo-de-caixa");
  revalidatePath("/dashboard");
  redirect("/despesas?salvo=1");
}

export async function deleteExpenseAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "despesas.editar")) fail("permissao");

  const expenseId = String(formData.get("expenseId") ?? "");
  if (!expenseId) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ExpenseUpdateClient;
  const { error } = await client
    .from("expenses")
    .update({ status: "cancelado", updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", expenseId);

  if (error) fail("atualizacao");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_despesa",
    entity_type: "expense",
    entity_id: expenseId,
    metadata: {},
  });

  revalidatePath("/despesas");
  revalidatePath("/fluxo-de-caixa");
  redirect("/despesas?cancelado=1");
}
