"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { terminateSessionAction } from "./actions";
import type { ActiveSession } from "@/lib/security/sessions";

export function SessionsList({ sessions }: { sessions: ActiveSession[] }) {
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
        toast.error(e instanceof Error ? e.message : "Erro ao encerrar.");
      }
    });
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nenhuma sessao ativa.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.slice(0, 20).map((session) => (
        <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{session.ipAddress ?? "IP desconhecido"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session.userAgent ? session.userAgent.slice(0, 60) : "—" } · Ativo em {new Date(session.lastActiveAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <button
            onClick={() => handleTerminate(session.id)}
            disabled={isPending}
            className="shrink-0 h-7 rounded-md border border-input bg-background px-2 text-xs font-medium transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            Encerrar
          </button>
        </div>
      ))}
    </div>
  );
}
