"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  archivePricingScenarioAction,
  restorePricingScenarioAction,
  duplicatePricingScenarioAction,
  recalculatePricingScenarioAction,
} from "@/lib/pricing/actions";

interface ScenarioActionsProps {
  scenarioId: string;
  status: string;
  canManage: boolean;
}

export function ScenarioActions({
  scenarioId,
  status,
  canManage,
}: ScenarioActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function handleRecalculate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await recalculatePricingScenarioAction(scenarioId, true);
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error ?? "Erro ao recalcular");
        }
      } catch {
        setError("Erro inesperado");
      }
    });
  }

  async function handleDuplicate() {
    if (!duplicateName.trim()) {
      setError("Nome obrigatório");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await duplicatePricingScenarioAction(
          scenarioId,
          duplicateName.trim()
        );
        if (result.ok && result.id) {
          router.push(`/simulador/${result.id}`);
        } else {
          setError(result.error ?? "Erro ao duplicar");
        }
      } catch {
        setError("Erro inesperado");
      }
    });
  }

  const isArchived = status === "archived";

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Recalcular */}
        {!isArchived && (
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={isPending}
            aria-busy={isPending}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Calculando..." : "Recalcular"}
          </button>
        )}

        {/* Duplicar */}
        {!isArchived && (
          <button
            type="button"
            onClick={() => setShowDuplicate(!showDuplicate)}
            aria-expanded={showDuplicate}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Duplicar
          </button>
        )}

        {/* Arquivar / Restaurar */}
        {isArchived ? (
          <form
            id="restore-form"
            action={async () => {
              const result = await restorePricingScenarioAction(scenarioId);
              if (result.ok) {
                router.refresh();
              } else {
                setError(result.error ?? "Erro ao restaurar");
              }
            }}
            className="hidden"
          />
        ) : (
          <form
            id="archive-form"
            action={async () => {
              const result = await archivePricingScenarioAction(scenarioId);
              if (result.ok) {
      router.push("/simulador");
              } else {
                setError(result.error ?? "Erro ao arquivar");
              }
            }}
            className="hidden"
          />
        )}

        {isArchived ? (
          <ConfirmSubmitButton
            formId="restore-form"
            title="Restaurar cenário"
            description="O cenário voltará a estar ativo."
            confirmLabel="Restaurar"
            variant="default"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Restaurar
          </ConfirmSubmitButton>
        ) : (
          <ConfirmSubmitButton
            formId="archive-form"
            title="Arquivar cenário"
            description="O cenário será arquivado e ficará somente leitura."
            confirmLabel="Arquivar"
            variant="destructive"
            className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Arquivar
          </ConfirmSubmitButton>
        )}
      </div>

      {/* Formulário de duplicação */}
      {showDuplicate && !isArchived && (
        <div className="rounded-md border bg-muted/30 p-4 space-y-3">
          <label htmlFor="duplicate-name" className="text-sm font-medium">
            Nome da cópia
          </label>
          <input
            id="duplicate-name"
            type="text"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder="Ex: Cenário principal — cópia"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isPending || !duplicateName.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Duplicando..." : "Duplicar"}
            </button>
            <button
              type="button"
              onClick={() => setShowDuplicate(false)}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
