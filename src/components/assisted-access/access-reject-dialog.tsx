"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rejectSupportAccessAction } from "@/lib/assisted-access/actions";

type AccessRejectDialogProps = {
  requestId: string;
};

export function AccessRejectDialog({ requestId }: AccessRejectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleReject = () => {
    setError(null);

    startTransition(async () => {
      try {
        await rejectSupportAccessAction(
          requestId,
          reason.trim() || undefined,
        );
        setIsOpen(false);
      } catch {
        setError("Erro ao rejeitar solicitação. Tente novamente.");
      }
    });
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => setIsOpen(true)}
      >
        Recusar
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle>Recusar Solicitação de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reject-reason" className="text-sm font-semibold">
              Motivo da recusa <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Informe o motivo da recusa, se desejar..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? "Recusando..." : "Confirmar recusa"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
