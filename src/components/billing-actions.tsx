"use client";

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

const plans = [
  { id: "starter", label: "Starter" },
  { id: "professional", label: "Professional" },
  { id: "business", label: "Business" },
] as const;

export function BillingActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout(plan: string) {
    setLoading(plan); setMessage(null);
    const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.url) window.location.assign(data.url);
    else { setMessage(data.error ?? "Não foi possível iniciar o pagamento."); setLoading(null); }
  }

  async function openPortal() {
    setLoading("portal"); setMessage(null);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.url) window.location.assign(data.url);
    else { setMessage(data.error ?? "Nenhuma assinatura encontrada."); setLoading(null); }
  }

  return <div className="space-y-3"><div className="flex flex-wrap gap-2">{plans.map((plan) => <Button key={plan.id} type="button" size="sm" onClick={() => startCheckout(plan.id)} disabled={Boolean(loading)}><CreditCard className="size-4" />{loading === plan.id ? "Abrindo..." : `Assinar ${plan.label}`}</Button>)}<Button type="button" size="sm" variant="outline" onClick={openPortal} disabled={Boolean(loading)}><ExternalLink className="size-4" />{loading === "portal" ? "Abrindo..." : "Gerenciar cobrança"}</Button></div>{message ? <p className="text-sm text-destructive">{message}</p> : null}</div>;
}
