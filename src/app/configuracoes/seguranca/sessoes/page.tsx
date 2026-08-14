import { redirect } from "next/navigation";
import { Monitor, Globe, Shield } from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getUserSessions } from "@/lib/security/session-lifecycle";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionsManager } from "@/components/security/sessions-manager";
import { SessionsList } from "./sessions-list";

const statusLabel: Record<string, string> = {
  ativa: "Ativa",
  revogada: "Revogada",
  expirada: "Expirada",
  suspeita: "Suspeita",
};

const statusColor: Record<string, string> = {
  ativa: "bg-emerald-500",
  revogada: "bg-red-500",
  expirada: "bg-gray-400",
  suspeita: "bg-orange-500",
};

export default async function SessoesPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const sessions = await getUserSessions(
    context.member!.userId,
    context.lawFirm!.id
  );

  const mappedSessions = sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    memberId: s.memberId,
    lawFirmId: s.lawFirmId,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    lastActiveAt: s.lastActivityAt,
    createdAt: s.createdAt,
  }));

  const activeCount = sessions.filter((s) => s.status === "ativa").length;
  const statusCounts = sessions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Sessoes"
        description="Visualize e gerencie todas as sessoes de acesso ao sistema."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessoes Ativas
            </CardTitle>
            <Monitor className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{activeCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sessions.length} sessao(oes) no total
            </p>
          </CardContent>
        </Card>

        {(Object.entries(statusCounts) as [string, number][]).map(
          ([status, count]) => (
            <Card key={status} className="rounded-lg">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {statusLabel[status] ?? status}
                </CardTitle>
                <span
                  className={`mt-0.5 size-2.5 shrink-0 rounded-full ${statusColor[status] ?? "bg-gray-400"}`}
                />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{count}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sessoes com status "{statusLabel[status] ?? status}"
                </p>
              </CardContent>
            </Card>
          )
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Gerenciar Sessoes</CardTitle>
            <CardDescription className="mt-1">
              Encerre sessoes individuais ou todas as outras sessoes de uma vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsManager
              sessions={mappedSessions}
              currentUserId={context.member!.userId}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Detalhes das Sessoes</CardTitle>
            <CardDescription className="mt-1">
              Informacoes detalhadas de cada sessao, incluindo dispositivo,
              navegador e nivel de MFA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList
              sessions={sessions}
              currentUserId={context.member!.userId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
