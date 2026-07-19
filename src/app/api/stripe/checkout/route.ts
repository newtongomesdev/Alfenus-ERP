import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getStripeClient, getStripePriceId, getAppUrl, type BillingPlan } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const plans = new Set<BillingPlan>(["starter", "professional", "business"]);

export async function POST(request: Request) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!can(context.member.role, "configuracoes.administrar")) return NextResponse.json({ error: "Somente administradores podem alterar a assinatura" }, { status: 403 });

  const stripe = getStripeClient();
  const admin = getSupabaseAdminClient();
  const supabase = await getSupabaseServerClient();
  if (!stripe || !admin || !supabase) return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { plan?: string };
  const plan = body.plan as BillingPlan;
  if (!plans.has(plan)) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  const priceId = getStripePriceId(plan);
  if (!priceId) return NextResponse.json({ error: "Preço do plano não configurado" }, { status: 503 });

  const billingQuery = await (admin as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): Promise<{ data: { stripe_customer_id: string | null; stripe_subscription_id: string | null; stripe_subscription_status: string | null } | null }> } } } }).from("law_firms").select("stripe_customer_id, stripe_subscription_id, stripe_subscription_status").eq("id", context.lawFirm.id).maybeSingle();
  if (["active", "trialing", "past_due"].includes(billingQuery.data?.stripe_subscription_status ?? "")) {
    return NextResponse.json({ error: "Este escritório já possui uma assinatura ativa. Use Gerenciar cobrança para alterar o plano." }, { status: 409 });
  }
  let customerId = billingQuery.data?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const { data: authData } = await supabase.auth.getUser();
    const customer = await stripe.customers.create({
      email: authData.user?.email ?? context.member.email,
      name: context.lawFirm.name,
      metadata: { law_firm_id: context.lawFirm.id },
    });
    customerId = customer.id;
    await (admin as unknown as { from(table: string): { update(values: Record<string, unknown>): { eq(column: string, value: string): Promise<unknown> } } }).from("law_firms").update({ stripe_customer_id: customerId }).eq("id", context.lawFirm.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: context.lawFirm.id,
    metadata: { law_firm_id: context.lawFirm.id, plan },
    subscription_data: { metadata: { law_firm_id: context.lawFirm.id, plan } },
    success_url: `${getAppUrl(request)}/configuracoes?stripe=sucesso`,
    cancel_url: `${getAppUrl(request)}/configuracoes?stripe=cancelado`,
  });

  return NextResponse.json({ url: session.url });
}
