import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSecurityPolicy } from "@/lib/security/policies";
import { getActiveSessions, getSessionStats } from "@/lib/security/sessions";
import { getMfaStatus } from "@/lib/security/mfa";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecurityPolicyForm } from "./security-policy-form";
import { SessionsList } from "./sessions-list";

export default async function SecurityPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const [policy, sessions, stats, mfaStatus] = await Promise.all([
    getSecurityPolicy(context),
    getActiveSessions(context),
    getSessionStats(context),
    getMfaStatus(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguranca"
        description="Configure MFA, politicas de senha, sessoes e restricoes de IP."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="MFA"
          value={mfaStatus.required ? "Obrigatorio" : "Opcional"}
          detail={mfaStatus.enabled ? "Sua conta usa MFA" : "Sua conta nao usa MFA"}
        />
        <MetricCard
          label="Sessoes ativas"
          value={stats.totalSessions}
          format="integer"
          detail={`${stats.uniqueUsers} usuario(s)`}
        />
        <MetricCard
          label="Sessoes recentes"
          value={stats.recentSessions}
          format="integer"
          detail="Ultimas 24h"
        />
        <MetricCard
          label="Restricao de IP"
          value={policy.ipRestrictionEnabled ? "Ativa" : "Inativa"}
          detail={policy.ipRestrictionEnabled ? "Apenas IPs permitidos" : "Todos os IPs"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Politicas de Seguranca</CardTitle>
            <CardDescription>Defina regras de autenticacao e acesso para o escritorio.</CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityPolicyForm policy={policy} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Sessoes Ativas ({sessions.length})</CardTitle>
            <CardDescription>Sessoes abertas por usuarios deste escritorio.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList sessions={sessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
