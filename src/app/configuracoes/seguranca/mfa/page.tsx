import { redirect } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getMfaStatus } from "@/lib/security/mfa";
import { getRecoveryCodeCount } from "@/lib/security/recovery-codes";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MfaSetupDialog } from "@/components/security/mfa-setup-dialog";
import Link from "next/link";
import { RegenerateRecoveryCodesButton } from "./regenerate-button";

export default async function MfaPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const [mfaStatus, recoveryCodeCount] = await Promise.all([
    getMfaStatus(context),
    context.member
      ? getRecoveryCodeCount(context.member.userId)
      : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autenticacao Multifator"
        description="Configure a autenticacao de dois fatores para proteger seu acesso."
      />

      {/* MFA Status Card */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status do MFA
          </CardTitle>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {mfaStatus.enabled ? (
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldOff className="size-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                {mfaStatus.enabled ? "Ativado" : "Desativado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mfaStatus.required
                  ? "MFA obrigatorio pela politica do escritorio"
                  : "MFA opcional para sua conta"}
              </p>
            </div>
            <MfaSetupDialog mfaEnabled={mfaStatus.enabled} />
          </div>
        </CardContent>
      </Card>

      {/* Recovery Codes Card */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Codigos de Recuperacao
          </CardTitle>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <KeyRound className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                {recoveryCodeCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {recoveryCodeCount > 0
                  ? `codigo(s) disponivel(is) para recuperacao de conta`
                  : "nenhum codigo de recuperacao disponivel"}
              </p>
            </div>
            <RegenerateRecoveryCodesButton
              disabled={!mfaStatus.enabled}
            />
          </div>

          {recoveryCodeCount === 0 && mfaStatus.enabled && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Voce nao possui codigos de recuperacao. Regenere-os para poder
                acessar sua conta caso perca o acesso ao autenticador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Outras Configuracoes de Seguranca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href="/configuracoes/seguranca"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium">Sessoes e Politicas</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/configuracoes/seguranca/dispositivos"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium">Dispositivos Confiaveis</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/configuracoes/seguranca/recuperacao"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium">Recuperacao de Conta</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
