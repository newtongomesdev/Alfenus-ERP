"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validations/foundation";

type ExpenseClient = {
  from(table: "expenses"): { insert(values: Record<string, unknown>): { select(columns: string): { single(): Promise<{ data: unknown; error: Error | null }> } }; update(values: Record<string, unknown>): { eq(column: string, value: string): { eq(column: string, value: string): PromiseLike<{ error: Error | null }> } } };
  from(table: "audit_logs"): { insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }> };
};

function cents(value: FormDataEntryValue | null) { const normalized = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""); return Math.round(Number(normalized || "0") * 100); }
function fail(error: string): never { redirect(`/despesas?erro=${error}`); }

export async function createExpenseAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  const parsed = expenseSchema.safeParse({ description: String(formData.get("description") ?? "").trim(), category: String(formData.get("category") ?? "").trim(), amountCents: cents(formData.get("amount")), dueDate: String(formData.get("dueDate") ?? ""), clientId: String(formData.get("clientId") ?? ""), legalCaseId: String(formData.get("legalCaseId") ?? ""), notes: String(formData.get("notes") ?? "").trim() });
  if (!parsed.success) fail("validacao");
  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");
  const client = supabase as unknown as ExpenseClient;
  const { data: expense, error } = await client.from("expenses").insert({ law_firm_id: context.lawFirm.id, description: parsed.data.description, category: parsed.data.category, amount_cents: parsed.data.amountCents, due_date: parsed.data.dueDate || null, client_id: parsed.data.clientId || null, legal_case_id: parsed.data.legalCaseId || null, responsible_member_id: context.member.id, status: "pendente", notes: parsed.data.notes || null }).select("id").single();
  if (error) fail("criacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "criou_despesa", entity_type: "expense", entity_id: (expense as { id: string }).id, metadata: { amount_cents: parsed.data.amountCents } });
  revalidatePath("/despesas"); revalidatePath("/fluxo-de-caixa"); revalidatePath("/dashboard"); redirect("/despesas?criado=1");
}

export async function payExpenseAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  const expenseId = String(formData.get("expenseId") ?? "");
  if (!expenseId) fail("despesa");
  const supabase = await getSupabaseServerClient(); if (!supabase) fail("ambiente");
  const client = supabase as unknown as ExpenseClient;
  const { error } = await client.from("expenses").update({ status: "paga", paid_at: new Date().toISOString() }).eq("law_firm_id", context.lawFirm.id).eq("id", expenseId);
  if (error) fail("atualizacao");
  await client.from("audit_logs").insert({ law_firm_id: context.lawFirm.id, actor_id: context.member.id, action: "pagou_despesa", entity_type: "expense", entity_id: expenseId, metadata: {} });
  revalidatePath("/despesas"); revalidatePath("/fluxo-de-caixa"); redirect("/despesas?paga=1");
}
