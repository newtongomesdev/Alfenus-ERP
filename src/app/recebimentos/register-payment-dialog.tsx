"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogPopup,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyFromCents } from "@/lib/formatters";

import { registerPaymentAction } from "./actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Registrando...
        </>
      ) : (
        "Registrar pagamento"
      )}
    </button>
  );
}

interface Installment {
  id: string;
  clientName: string | null;
  number: number;
  remainingAmountCents: number;
}

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openInstallments: Installment[];
  initialInstallmentId?: string | null;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  openInstallments,
  initialInstallmentId,
}: RegisterPaymentDialogProps) {
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(initialInstallmentId ?? "");
  
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (open && initialInstallmentId) {
      setSelectedInstallmentId(initialInstallmentId);
    } else if (!open) {
      setTimeout(() => setSelectedInstallmentId(""), 200);
    }
  }, [open, initialInstallmentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-[500px]">
        <div className="mb-4">
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            Escolha a parcela e informe o recebimento.
          </DialogDescription>
        </div>
        
        <form action={registerPaymentAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="installmentId">Parcela</Label>
            <select
              id="installmentId"
              name="installmentId"
              required
              value={selectedInstallmentId}
              onChange={(e) => setSelectedInstallmentId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione uma parcela</option>
              {openInstallments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.clientName ?? "Cliente"} · #{item.number} ·{" "}
                  {formatCurrencyFromCents(item.remainingAmountCents)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor recebido</Label>
              <Input id="amount" name="amount" placeholder="R$ 0,00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAt">Data do recebimento</Label>
              <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de pagamento</Label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione</option>
              <option value="pix">Pix</option>
              <option value="transferencia">Transferência</option>
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto</Label>
              <Input id="discount" name="discount" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fine">Multa</Label>
              <Input id="fine" name="fine" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest">Juros</Label>
              <Input id="interest" name="interest" placeholder="R$ 0,00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" placeholder="Ex.: comprovante recebido por WhatsApp" />
          </div>

          <SubmitButton disabled={openInstallments.length === 0} />
        </form>
      </DialogPopup>
    </Dialog>
  );
}
