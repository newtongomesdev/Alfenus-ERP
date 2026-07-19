"use client";

import { useRef, useState } from "react";
import { Undo2 } from "lucide-react";

import { reverseInstallmentAction } from "@/app/recebimentos/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog";

interface ReversePaymentButtonProps {
  installmentId: string;
}

export function ReversePaymentButton({ installmentId }: ReversePaymentButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit() {
    if (reason.trim().length < 3) return;
    formRef.current?.requestSubmit();
    setOpen(false);
    setReason("");
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Estornar pagamento">
        <Undo2 className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup>
          <DialogTitle>Estornar pagamento</DialogTitle>
          <DialogDescription className="mt-2">
            O pagamento será revertido e a parcela voltará ao status pendente. Esta ação não pode ser desfeita.
          </DialogDescription>
          <div className="mt-4 space-y-2">
            <label htmlFor={`reason-${installmentId}`} className="text-sm font-medium">
              Motivo do estorno
            </label>
            <textarea
              id={`reason-${installmentId}`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo (mínimo 3 caracteres)"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={reason.trim().length < 3}
            >
              Estornar
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
      <form ref={formRef} action={reverseInstallmentAction} className="hidden">
        <input type="hidden" name="installmentId" value={installmentId} />
        <input type="hidden" name="reason" value={reason} />
      </form>
    </>
  );
}
