import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type BillingUpdate = Record<string, unknown>;

async function updateLawFirm(lawFirmId: string, values: BillingUpdate) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurado");
  await (admin as unknown as { from(table: string): { update(values: BillingUpdate): { eq(column: string, value: string): Promise<unknown> } } }).from("law_firms").update({ ...values, stripe_updated_at: new Date().toISOString() }).eq("id", lawFirmId);
}

function subscriptionValues(subscription: Stripe.Subscription): BillingUpdate {
  const raw = subscription as unknown as { metadata?: Record<string, string>; customer: string | Stripe.Customer | Stripe.DeletedCustomer; items: { data: Array<{ price: { id: string } }> }; status: string; current_period_end: number };
  return {
    stripe_customer_id: typeof raw.customer === "string" ? raw.customer : raw.customer.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: raw.items.data[0]?.price.id ?? null,
    stripe_subscription_status: raw.status,
    stripe_current_period_end: raw.current_period_end ? new Date(raw.current_period_end * 1000).toISOString() : null,
    stripe_billing_status: raw.status === "active" || raw.status === "trialing" ? "paid" : raw.status === "past_due" ? "past_due" : "inactive",
  };
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return NextResponse.json({ error: "Stripe webhook não configurado" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const lawFirmId = session.metadata?.law_firm_id ?? session.client_reference_id;
      if (lawFirmId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
        await updateLawFirm(lawFirmId, subscriptionValues(subscription));
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata as Record<string, string>;
      const lawFirmId = metadata.law_firm_id;
      if (lawFirmId) await updateLawFirm(lawFirmId, subscriptionValues(subscription));
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const admin = getSupabaseAdminClient();
        const result = await (admin as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): Promise<{ data: Array<{ id: string }> | null }> } } }).from("law_firms").select("id").eq("stripe_customer_id", customerId);
        for (const firm of result.data ?? []) await updateLawFirm(firm.id, { stripe_billing_status: event.type === "invoice.paid" ? "paid" : "past_due", stripe_last_payment_at: event.type === "invoice.paid" ? new Date().toISOString() : null });
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Falha ao sincronizar cobrança" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
