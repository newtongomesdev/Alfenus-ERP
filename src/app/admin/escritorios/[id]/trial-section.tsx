"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { startTrialAction, extendTrialAction, endTrialAction } from "../actions";

type TrialStatus = {
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  trialUsed: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysRemaining(endsAt: string): number {
  const end = new Date(endsAt);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function TrialSection({ tenantId, trial }: { tenantId: string; trial: TrialStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"start" | "extend" | "end">("start");

  const { trialStartsAt, trialEndsAt, trialUsed } = trial;

  // Determine status
  let statusLabel: string;
  let statusVariant: "default" | "secondary" | "outline" | "destructive";

  if (!trialUsed) {
    statusLabel = "Não iniciado";
    statusVariant = "outline";
  } else if (trialStartsAt && trialEndsAt) {
    const now = new Date();
    const ends = new Date(trialEndsAt);
    if (now < ends) {
      const days = getDaysRemaining(trialEndsAt);
      statusLabel = `Ativo (${days} ${days === 1 ? "dia" : "dias"} restantes)`;
      statusVariant = "default";
    } else {
      statusLabel = "Expirado";
      statusVariant = "destructive";
    }
  } else {
    statusLabel = "Já utilizado";
    statusVariant = "secondary";
  }

  const isActive = trialStartsAt && trialEndsAt && new Date() < new Date(trialEndsAt);
  const canStart = !trialUsed;
  const canExtend = isActive && !canStart;

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      if (confirmAction === "start") {
        await startTrialAction(tenantId, 14);
      } else if (confirmAction === "extend") {
        await extendTrialAction(tenantId, 7);
      } else if (confirmAction === "end") {
        await endTrialAction(tenantId);
      }
      router.refresh();
    });
  }

  const confirmTitles = {
    start: "Iniciar Trial",
    extend: "Estender Trial",
    end: "Encerrar Trial",
  };

  const confirmDescriptions = {
    start: "O trial de 14 dias será iniciado imediatamente.",
    extend: "7 dias serão adicionados ao trial atual.",
    end: "O trial será encerrado imediatamente. O escritório perderá acesso às funcionalidades de trial.",
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Período de Trial</h3>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Início</span>
            <span>{trialStartsAt ? formatDate(trialStartsAt) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Término</span>
            <span>{trialEndsAt ? formatDate(trialEndsAt) : "—"}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {canStart && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                setConfirmAction("start");
                setConfirmOpen(true);
              }}
            >
              Iniciar Trial (14 dias)
            </Button>
          )}
          {canExtend && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setConfirmAction("extend");
                setConfirmOpen(true);
              }}
            >
              Estender (+7 dias)
            </Button>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                setConfirmAction("end");
                setConfirmOpen(true);
              }}
            >
              Encerrar Trial
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitles[confirmAction]}
        description={confirmDescriptions[confirmAction]}
        onConfirm={handleConfirm}
      />
    </>
  );
}
