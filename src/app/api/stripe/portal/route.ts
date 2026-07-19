import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getStripeClient, getAppUrl } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!can(context.member.role, "configuracoes.administrar")) return NextResponse.json({ error: "Somente administradores podem gerenciar a assinatura" }, { status: 403 });
  const stripe = getStripeClient();
  const admin = getSupabaseAdminClient();
  if (!stripe || !admin) return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const result = await (admin as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): Promise<{ data: { stripe_customer_id: string | null } | null }> } } } }).from("law_firms").select("stripe_customer_id").eq("id", context.lawFirm.id).maybeSingle();
  if (!result.data?.stripe_customer_id) return NextResponse.json({ error: "Nenhuma assinatura Stripe encontrada" }, { status: 404 });
  const session = await stripe.billingPortal.sessions.create({ customer: result.data.stripe_customer_id, return_url: `${getAppUrl(request)}/configuracoes` });
  return NextResponse.json({ url: session.url });
}
