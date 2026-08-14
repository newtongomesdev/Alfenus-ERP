"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CHARGING_MODELS } from "@/lib/solo/constants";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { createFeeProposalAction } from "@/lib/solo/actions";

export function FeeProposalForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    service_description: "",
    scope: "",
    total_amount_cents: 0,
    upfront_amount_cents: 0,
    installments_count: 1,
    success_fee_percentage: 0,
    included_expenses: "",
    excluded_expenses: "",
    validity_days: 15,
    charging_model: "fixo",
    observations: "",
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const calculations = useMemo(() => {
    const total = form.total_amount_cents;
    const upfront = form.upfront_amount_cents;
    const balance = Math.max(total - upfront, 0);
    const installments = Math.max(form.installments_count, 1);
    const installmentValue = Math.floor(balance / installments);
    const monthly = installmentValue;

    return { balance, installmentValue, monthly };
  }, [form.total_amount_cents, form.upfront_amount_cents, form.installments_count]);

  async function handleSave() {
    if (!form.service_description.trim() || form.total_amount_cents <= 0) return;
    setSaving(true);
    const result = await createFeeProposalAction({
      client_id: clientId,
      ...form,
    });
    setSaving(false);
    if (result.ok) {
      router.push("/propostas");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proposta de honorários — {clientName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Descrição do serviço *</Label>
            <Input
              value={form.service_description}
              onChange={(e) => update("service_description", e.target.value)}
              placeholder="Ex: Ação trabalhista por verbas rescisórias"
            />
          </div>

          <div>
            <Label>Escopo</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.scope}
              onChange={(e) => update("scope", e.target.value)}
              placeholder="O que está incluído no serviço..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Modelo de cobrança</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.charging_model}
                onChange={(e) => update("charging_model", e.target.value)}
              >
                {Object.entries(CHARGING_MODELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Valor total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={(form.total_amount_cents / 100).toFixed(2)}
                onChange={(e) => update("total_amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
              />
            </div>
            <div>
              <Label>Entrada (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={(form.upfront_amount_cents / 100).toFixed(2)}
                onChange={(e) => update("upfront_amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={form.installments_count}
                onChange={(e) => update("installments_count", parseInt(e.target.value || "1"))}
              />
            </div>
            <div>
              <Label>Êxito (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={form.success_fee_percentage || ""}
                onChange={(e) => update("success_fee_percentage", parseFloat(e.target.value || "0"))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={form.validity_days}
                onChange={(e) => update("validity_days", parseInt(e.target.value || "15"))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cálculos automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Saldo após entrada</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(calculations.balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor da parcela</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(calculations.installmentValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Previsão mensal</p>
              <p className="text-lg font-semibold">{formatCurrencyFromCents(calculations.monthly)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Despesas e observações */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Despesas incluídas</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.included_expenses}
                onChange={(e) => update("included_expenses", e.target.value)}
                placeholder="Custas, perícias, etc."
              />
            </div>
            <div>
              <Label>Despesas não incluídas</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.excluded_expenses}
                onChange={(e) => update("excluded_expenses", e.target.value)}
                placeholder="Honorários contrapostos, etc."
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.observations}
              onChange={(e) => update("observations", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !form.service_description.trim() || form.total_amount_cents <= 0}>
          {saving ? "Salvando..." : "Criar proposta"}
        </Button>
      </div>
    </div>
  );
}
