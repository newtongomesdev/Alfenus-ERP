"use client";

import { useTransition } from "react";
import {
  Headphones,
  Shield,
  LogOut,
  Ban,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistedAccess } from "@/lib/assisted-access/context";
import { endSupportSessionAction } from "@/lib/assisted-access/actions";
import { revokeSupportAccessAction } from "@/lib/assisted-access/actions";
import { AssistedAccessTimer } from "./assisted-access-timer";
import { cn } from "@/lib/utils";

// ── Componente ──────────────────────────────────────────────────────────────

export function AssistedAccessBanner() {
  const {
    session,
    operator,
    tenant,
    ticket,
    scopes,
    isActive,
    readOnly,
    timeRemaining,
  } = useAssistedAccess();

  const [isPending, startTransition] = useTransition();

  if (!session || !isActive) return null;

  const isOperatorView = operator && scopes.modules.length > 0;
  const isTenantView = !isOperatorView;

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleEndSession = () => {
    startTransition(async () => {
      await endSupportSessionAction(session.id);
    });
  };

  const handleRevokeSession = () => {
    const reason = prompt("Motivo da revogação:");
    if (reason && reason.trim().length >= 3) {
      startTransition(async () => {
        await revokeSupportAccessAction(session.id, reason.trim());
      });
    }
  };

  // ── Render: Operador ──────────────────────────────────────────────────

  if (isOperatorView) {
    return (
      <div
        className={cn(
          "border-b border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50",
          "px-3 py-2 sm:px-4 sm:py-2.5",
        )}
        role="status"
        aria-label="Sessão de acesso assistido ativa"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Informações principais */}
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Headphones className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Você está acessando{" "}
              <span className="font-semibold">{tenant?.name ?? "Tenant"}</span>{" "}
              em modo suporte
            </span>

            {ticket && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  #{ticket.protocol}
                </span>
              </>
            )}
          </div>

          {/* Escopo + Timer + Botão */}
          <div className="flex items-center gap-3">
            {/* Escopo */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-blue-600/70 dark:text-blue-300/70">
                {scopes.modules.length} módulo{scopes.modules.length !== 1 ? "s" : ""}
              </span>
              {readOnly && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Leitura
                </span>
              )}
            </div>

            {/* Timer */}
            <AssistedAccessTimer expiresAt={session.expires_at} />

            {/* Botão encerrar */}
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1 text-xs"
              onClick={handleEndSession}
              disabled={isPending}
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Encerrar</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Tenant ────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
        "px-3 py-2 sm:px-4 sm:py-2.5",
      )}
      role="status"
      aria-label="Um operador está acessando seu sistema"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Informações principais */}
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Shield className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            Operador{" "}
            <span className="font-semibold">
              {operator?.name ?? "Suporte"}
            </span>{" "}
            está acessando
          </span>
        </div>

        {/* Timer + Botão revogar */}
        <div className="flex items-center gap-3">
          <AssistedAccessTimer expiresAt={session.expires_at} />

          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-amber-300 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
            onClick={handleRevokeSession}
            disabled={isPending}
          >
            <Ban className="h-3 w-3" />
            <span className="hidden sm:inline">Revogar acesso</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
