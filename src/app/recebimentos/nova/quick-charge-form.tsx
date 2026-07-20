"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientOption {
  id: string;
  name: string;
}

interface QuickChargeFormProps {
  clients: ClientOption[];
  today: string;
  errorMessage: string | null;
  createQuickChargeAction: (formData: FormData) => void;
}

export function QuickChargeForm({
  clients,
  today,
  errorMessage,
  createQuickChargeAction,
}: QuickChargeFormProps) {
  const [paymentType, setPaymentType] = useState<"avista" | "parcelado">("avista");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");

  return (
    <form action={createQuickChargeAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="clientId">Cliente</Label>
        <select
          id="clientId"
          name="clientId"
          required
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="">Selecione um cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">O que está sendo cobrado</Label>
        <Input
          id="description"
          name="description"
          required
          placeholder="Ex.: Consulta inicial e análise de documentos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor Total</Label>
        <Input id="amount" name="amount" required inputMode="decimal" placeholder="500,00" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Vencimento (1ª Parcela ou À vista)</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={today} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentType">Tipo de Pagamento</Label>
        <select
          id="paymentType"
          name="paymentType"
          value={paymentType}
          onChange={(e) => {
            const val = e.target.value as "avista" | "parcelado";
            setPaymentType(val);
            if (val === "parcelado") {
              setPaymentMethod("pix"); // default to pix for installments
            }
          }}
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="avista">À vista</option>
          <option value="parcelado">Parcelado</option>
        </select>
      </div>

      {paymentType === "parcelado" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="installmentsCount">Quantidade de Parcelas</Label>
            <select
              id="installmentsCount"
              name="installmentsCount"
              required
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={num}>
                  {num}x
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Parcelamento</Label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            >
              <option value="pix">Pix</option>
              <option value="cartao">Cartão de Crédito</option>
            </select>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Forma preferida</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="pix">Pix</option>
            <option value="pix_recorrente">Pix recorrente</option>
            <option value="link_pagamento">Link de pagamento</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
            <option value="deposito">Depósito</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cheque">Cheque</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      )}

      <div className="space-y-2 sm:col-span-2">
        <Label className="text-xs font-semibold">Notificar o cliente através de</Label>
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              id="notifyWhatsapp"
              name="notifyWhatsapp"
              className="rounded border-input text-primary focus:ring-primary size-4"
            />
            WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              id="notifyEmail"
              name="notifyEmail"
              className="rounded border-input text-primary focus:ring-primary size-4"
            />
            E-mail
          </label>
        </div>
      </div>

      <div className="flex items-end sm:col-span-2">
        <p className="text-xs text-muted-foreground">
          {paymentType === "parcelado"
            ? "Será criado um contrato parcelado. Os recebimentos deverão ser confirmados individualmente nas datas de vencimento."
            : "O recebimento será confirmado depois, na tela de recebimentos."}
        </p>
      </div>

      {errorMessage && <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit">Criar cobrança</Button>
        <Link
          href="/recebimentos"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
