"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ───────────────────────────────────────────────────────────────────

type AssistedAccessTimerProps = {
  /** Timestamp de expiração da sessão (ISO string) */
  expiresAt: string;
  /** Callback chamado quando a sessão expira */
  onExpire?: () => void;
};

// ── Limites de cores ────────────────────────────────────────────────────────

const WARNING_THRESHOLD_MINUTES = 5;
const CRITICAL_THRESHOLD_MINUTES = 1;

// ── Componente ──────────────────────────────────────────────────────────────

export function AssistedAccessTimer({
  expiresAt,
  onExpire,
}: AssistedAccessTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemainingSeconds(expiresAt),
  );
  const [hasExpired, setHasExpired] = useState(false);

  const tick = useCallback(() => {
    const seconds = calculateRemainingSeconds(expiresAt);
    setRemainingSeconds(seconds);

    if (seconds <= 0 && !hasExpired) {
      setHasExpired(true);
      onExpire?.();
    }
  }, [expiresAt, hasExpired, onExpire]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  const isCritical = remainingMinutes <= CRITICAL_THRESHOLD_MINUTES;
  const isWarning = remainingMinutes <= WARNING_THRESHOLD_MINUTES;

  const timeString = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums",
        isCritical && "text-red-600 dark:text-red-400",
        isWarning && !isCritical && "text-amber-600 dark:text-amber-400",
        !isWarning && "text-green-600 dark:text-green-400",
      )}
      role="timer"
      aria-label={`Tempo restante: ${minutes} minutos e ${seconds} segundos`}
    >
      {isCritical ? (
        <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
      ) : isWarning ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      <span>{timeString}</span>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function calculateRemainingSeconds(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
}
