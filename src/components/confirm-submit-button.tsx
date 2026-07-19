"use client";

import { type ReactNode, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";

interface ConfirmSubmitButtonProps {
  formId: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  children: ReactNode;
  className?: string;
  confirmationText?: string;
}

export function ConfirmSubmitButton({
  formId,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "destructive",
  children,
  className,
  confirmationText,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        variant={variant}
        confirmationText={confirmationText}
        onConfirm={() => {
          const el = document.getElementById(formId);
          if (el instanceof HTMLFormElement) el.requestSubmit();
        }}
      />
    </>
  );
}
