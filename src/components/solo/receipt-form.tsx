"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReceiptAction } from "@/lib/solo/actions";

export function ReceiptForm({
  clientId,
  clientName,
  clientDocument,
}: {
  clientId: string;
  clientName: string;
  clientDocument?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    service_description: "",
    amount_cents: 0,
    payment_method: "pix",
    payment_date: new Date().toISOString().split("T")[0],
    observations: "",
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSave() {
    if (!form.service_description.trim() || form.amount_cents <= 0) return;
    setSaving(true);
    const result = await createReceiptAction({
      client_id: clientId,
      client_name: clientName,
      client_document: clientDocument,
      ...form,
    });
    setSaving(false);
    if (result.ok) {
      router.push("/recibos");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Emitir recibo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Descrição do serviço *</Label>
          <Input
            value={form.service_description}
            onChange={(e) => update("service_description", e.target.value)}
            placeholder="Ex: Honorários advocatícios - Ação trabalhista"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={(form.amount_cents / 100).toFixed(2)}
              onChange={(e) => update("amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
            />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.payment_method}
              onChange={(e) => update("payment_method", e.target.value)}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
              <option value="cartao">Cartão</option>
              <option value="cheque">Cheque</option>
              <option value="boleto">Boleto</option>
            </select>
          </div>
          <div>
            <Label>Data do pagamento</Label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={(e) => update("payment_date", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Observações</Label>
          <Input
            value={form.observations}
            onChange={(e) => update("observations", e.target.value)}
            placeholder="Observações adicionais..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.service_description.trim() || form.amount_cents <= 0}>
            {saving ? "Emitindo..." : "Emitir recibo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
