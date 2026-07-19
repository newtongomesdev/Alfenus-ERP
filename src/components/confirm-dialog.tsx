import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  confirmationText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "default",
  confirmationText,
}: ConfirmDialogProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const requiresConfirmation = Boolean(confirmationText);
  const canConfirm = !requiresConfirmation || typedConfirmation === confirmationText;
  const closeDialog = () => {
    setTypedConfirmation("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : closeDialog()}>
      <DialogPopup>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-2">{description}</DialogDescription>
        {confirmationText ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-dialog-text">Digite a confirmação</Label>
            <Input
              id="confirm-dialog-text"
              value={typedConfirmation}
              onChange={(event) => setTypedConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmationText}
            />
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" />}>
            {cancelLabel}
          </DialogClose>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm();
              closeDialog();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
