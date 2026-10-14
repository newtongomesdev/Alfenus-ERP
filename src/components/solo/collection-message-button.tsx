"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildCollectionMessage } from "@/lib/solo/collection-message";

type CollectionMessageInput = Parameters<typeof buildCollectionMessage>[0];

export function CollectionMessageButton({
  installment,
  iconOnly = false,
}: {
  installment: CollectionMessageInput;
  iconOnly?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(buildCollectionMessage(installment));
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant={iconOnly ? "ghost" : "outline"}
        size={iconOnly ? "icon" : "sm"}
        aria-label={`Copiar lembrete de cobrança da parcela ${installment.installmentNumber}`}
        title="Copiar lembrete de cobrança"
        onClick={copyMessage}
      >
        {status === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {!iconOnly ? <span>Copiar lembrete</span> : null}
      </Button>
      {status !== "idle" ? (
        <span className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
          {status === "copied" ? "Copiado" : "Falha ao copiar"}
        </span>
      ) : null}
    </span>
  );
}
