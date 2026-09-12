import { redirect } from "next/navigation";
import { Shield, Monitor, Clock, Globe } from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getSecurityPolicy } from "@/lib/security/policies";
import { getActiveSessions, getSessionStats } from "@/lib/security/sessions";
import { getMfaStatus } from "@/lib/security/mfa";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityPolicyForm } from "./security-policy-form";
import { SessionsList } from "./sessions-list";
import { MfaSetupDialog } from "@/components/security/mfa-setup-dialog";
import { formatCurrencyFromCents, integerFormatter } from "@/lib/formatters";
import type { LucideIcon } from "lucide-react";

function MetricCardItem({
  label,
  value,
  format,
  detail,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: number | string;
  format?: "integer" | "currency";
  detail: string;
  icon: LucideIcon;
  iconColor?: string;
}) {
  const formattedValue =
    typeof value === "string"
      ? value
      : format === "currency"
        ? formatCurrencyFromCents(value)
        : integerFormatter.format(value);

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className={`size-4 ${iconColor ?? "text-muted-foreground"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{formattedValue}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SecurityScoreIndicator({
  mfaEnabled,
  mfaRequired,
  ipRestrictionEnabled,
}: {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  ipRestrictionEnabled: boolean;
}) {
  let score = 0;
  if (mfaEnabled) score += 40;
  if (mfaRequired) score += 20;
  if (ipRestrictionEnabled) score += 40;

  const scoreLabel =
    score >= 80
      ? "Excelente"
      : score >= 60
        ? "Boa"
        : score >= 40
          ? "Regular"
          : "Fraca";

  const scoreColor =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-emerald-400"
        : score >= 40
          ? "bg-yellow-500"
          : "bg-red-500";

  const textColor =
    score >= 80
      ? "text-emerald-700 dark:text-emerald-400"
      : score >= 60
        ? "text-emerald-600 dark:text-emerald-400"
        : score >= 40
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400";

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Nivel de Seguranca</CardTitle>
        <Shield className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight">{score}%</p>
          <span className={`text-sm font-medium ${textColor}`}>{scoreLabel}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${scoreColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${mfaEnabled ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
            <span className={`inline-block size-1.5 rounded-full ${mfaEnabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            MFA {mfaEnabled ? "ativado" : "desativado"}
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span className={`flex items-center gap-1 ${mfaRequired ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
            <span className={`inline-block size-1.5 rounded-full ${mfaRequired ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            MFA {mfaRequired ? "obrigatorio" : "opcional"}
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span className={`flex items-center gap-1 ${ipRestrictionEnabled ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
            <span className={`inline-block size-1.5 rounded-full ${ipRestrictionEnabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            IP {ipRestrictionEnabled ? "restrito" : "aberto"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

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
        <MetricCardItem
          label="MFA"
          value={mfaStatus.required ? "Obrigatorio" : "Opcional"}
          detail={mfaStatus.enabled ? "Sua conta usa MFA" : "Sua conta nao usa MFA"}
          icon={Shield}
          iconColor={mfaStatus.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
        />
        <MetricCardItem
          label="Sessoes ativas"
          value={stats.totalSessions}
          format="integer"
          detail={`${stats.uniqueUsers} usuario(s)`}
          icon={Monitor}
        />
        <MetricCardItem
          label="Sessoes recentes"
          value={stats.recentSessions}
          format="integer"
          detail="Ultimas 24h"
          icon={Clock}
        />
        <MetricCardItem
          label="Restricao de IP"
          value={policy.ipRestrictionEnabled ? "Ativa" : "Inativa"}
          detail={policy.ipRestrictionEnabled ? "Apenas IPs permitidos" : "Todos os IPs"}
          icon={Globe}
          iconColor={policy.ipRestrictionEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
        />
      </section>

      <SecurityScoreIndicator
        mfaEnabled={mfaStatus.enabled}
        mfaRequired={mfaStatus.required}
        ipRestrictionEnabled={policy.ipRestrictionEnabled}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Politicas de Seguranca</CardTitle>
                <CardDescription className="mt-1">
                  Defina regras de autenticacao e acesso para o escritorio.
                </CardDescription>
              </div>
              <MfaSetupDialog mfaEnabled={mfaStatus.enabled} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <SecurityPolicyForm policy={policy} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Sessoes Ativas ({sessions.length})</CardTitle>
            <CardDescription className="mt-1">
              Sessoes abertas por usuarios deste escritorio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList sessions={sessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
