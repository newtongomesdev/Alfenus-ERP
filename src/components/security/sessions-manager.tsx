"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  terminateSessionAction,
  terminateAllSessionsAction,
} from "@/app/configuracoes/seguranca/actions";
import { Button } from "@/components/ui/button";
import type { ActiveSession } from "@/lib/security/sessions";
import { Monitor, Trash2, LogOut } from "lucide-react";

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
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export function SessionsManager({
  sessions,
  currentUserId,
}: {
  sessions: ActiveSession[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const otherSessions = sessions.filter((s) => s.userId !== currentUserId);
  const hasOtherSessions = otherSessions.length > 0;

  function handleTerminate(sessionId: string) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("sessionId", sessionId);
        await terminateSessionAction(fd);
        toast.success("Sessao encerrada.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao encerrar sessao.");
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
        toast.error(e instanceof Error ? e.message : "Erro ao encerrar sessoes.");
      }
    });
  }

  if (sessions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma sessao ativa.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sessions.map((session) => {
          const { browser, os } = parseUserAgent(session.userAgent);
          const isCurrent = session.userId === currentUserId;
          return (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Monitor className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {browser}
                    {os ? ` · ${os}` : ""}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Sessao atual
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.ipAddress ?? "IP desconhecido"} ·{" "}
                    {formatRelativeTime(session.lastActiveAt)}
                  </p>
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

      {hasOtherSessions && (
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
