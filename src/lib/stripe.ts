import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  stripeClient ??= new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  return stripeClient;
}

export type BillingPlan = "starter" | "professional" | "business";

export function getStripePriceId(plan: BillingPlan) {
  return {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    business: process.env.STRIPE_PRICE_BUSINESS,
  }[plan] ?? null;
}

export function getAppUrl(request?: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || request?.url.split("/api/")[0] || "http://localhost:3000";
}
