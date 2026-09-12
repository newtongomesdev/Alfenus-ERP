"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Globe,
  Monitor,
  Smartphone,
  Laptop,
  MapPin,
  Clock,
  Shield,
  Trash2,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  terminateSessionAction,
  terminateAllSessionsAction,
} from "@/app/configuracoes/seguranca/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserSession, SessionStatus } from "@/lib/security/session-lifecycle";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOsIcon(os: string): LucideIcon {
  if (os === "iOS" || os === "Android") return Smartphone;
  if (os === "Windows" || os === "macOS" || os === "Linux") return Laptop;
  return Monitor;
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "Desconhecido", os: "" };

  let browser = "Desconhecido";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `ha ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `ha ${days} dia${days > 1 ? "s" : ""}`;
}

const statusBadgeStyle: Record<SessionStatus, string> = {
  ativa:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  revogada:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expirada:
    "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  suspeita:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const statusLabel: Record<SessionStatus, string> = {
  ativa: "Ativa",
  revogada: "Revogada",
  expirada: "Expirada",
  suspeita: "Suspeita",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionsList({
  sessions,
  currentUserId,
}: {
  sessions: UserSession[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleTerminate(sessionId: string) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("sessionId", sessionId);
        await terminateSessionAction(fd);
        toast.success("Sessao encerrada.");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao encerrar sessao."
        );
      }
    });
  }

  function handleTerminateAll() {
    startTransition(async () => {
      try {
        await terminateAllSessionsAction();
        toast.success("Todas as outras sessoes foram encerradas.");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao encerrar sessoes."
        );
      }
    });
  }

  if (sessions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma sessao encontrada.
      </p>
    );
  }

  const otherSessions = sessions.filter((s) => s.userId !== currentUserId);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sessions.map((session) => {
          const { browser, os } = parseUserAgent(session.userAgent);
          const isCurrent = session.userId === currentUserId;
          const OsIcon = getOsIcon(os);
          const badgeClass = statusBadgeStyle[session.status] ?? "";

          return (
            <div
              key={session.id}
              className={`relative flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                isCurrent
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isCurrent
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-muted"
                  }`}
                >
                  <OsIcon
                    className={`size-4 ${
                      isCurrent
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {browser}
                      {os ? ` · ${os}` : ""}
                    </p>
                    {isCurrent && (
                      <Badge
                        variant="default"
                        className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                      >
                        <span className="mr-1 inline-block size-1.5 rounded-full bg-white animate-pulse" />
                        Sessao atual
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`shrink-0 border-0 ${badgeClass}`}
                    >
                      {statusLabel[session.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {session.ipAddress ?? "IP desconhecido"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatRelativeTime(session.lastActivityAt)}
                    </span>
                    {os && (
                      <span className="flex items-center gap-1">
                        <OsIcon className="size-3" />
                        {os}
                      </span>
                    )}
                    {session.mfaLevel && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Shield className="size-3" />
                        MFA: {session.mfaLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleTerminate(session.id)}
                  disabled={isPending}
                  title="Encerrar esta sessao"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {otherSessions.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleTerminateAll}
          disabled={isPending}
          className="w-full"
        >
          <LogOut className="size-4" />
          Encerrar todas as outras sessoes ({otherSessions.length})
        </Button>
      )}
    </div>
  );
}
