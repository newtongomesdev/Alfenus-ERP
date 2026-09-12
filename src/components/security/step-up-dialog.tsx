"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyReauthenticationAction } from "@/app/configuracoes/seguranca/actions";
import { ShieldCheck } from "lucide-react";

interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  onVerified: () => void;
}

export function StepUpDialog({
  open,
  onOpenChange,
  action,
  onVerified,
}: StepUpDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen) {
      setPassword("");
      setError(null);
    }
  }

  function handleSubmit() {
    if (!password) {
      setError("Insira sua senha.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("password", password);
        await verifyReauthenticationAction(fd);
        toast.success("Identidade confirmada!");
        onVerified();
        onOpenChange(false);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Erro ao verificar senha.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="max-w-md">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="size-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Confirmar identidade</DialogTitle>
              <DialogDescription>
                Para {action}, precisamos confirmar sua identidade. Insira sua
                senha.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="step-up-password">Senha</Label>
            <Input
              id="step-up-password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isPending) {
                  handleSubmit();
                }
              }}
              disabled={isPending}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="ghost" size="sm" />}>
              Cancelar
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || !password}
            >
              {isPending ? "Verificando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
