import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Settings, Calendar, Key } from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getMfaPolicy } from "@/lib/security/mfa-policies";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MfaPolicyEditor } from "./mfa-policy-editor";

const enforcementLabel: Record<string, string> = {
  desabilitado: "Desabilitado",
  obrigatorio_todos: "Obrigatorio para todos",
  obrigatorio_roles: "Obrigatorio por papeis",
  obrigatorio_usuarios: "Obrigatorio por usuarios",
};

const enforcementBadgeStyle: Record<string, string> = {
  desabilitado:
    "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  obrigatorio_todos:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  obrigatorio_roles:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  obrigatorio_usuarios:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default async function PoliticasMfaPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");
  if (
    context.member?.role !== "proprietario" &&
    context.member?.role !== "administrador"
  ) {
    redirect("/configuracoes/seguranca");
  }

  const policy = await getMfaPolicy(context.lawFirm!.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Politicas de MFA"
        description="Configure as regras de autenticacao multifator para o escritorio."
      />

      <div className="text-sm">
        <Link
          href="/configuracoes/seguranca"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar a seguranca
        </Link>
      </div>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Modo de Enforcement
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Shield className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={`border-0 ${enforcementBadgeStyle[policy.enforcementMode] ?? ""}`}
            >
              {enforcementLabel[policy.enforcementMode] ?? policy.enforcementMode}
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Periodo de Carencia
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Calendar className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {policy.gracePeriodDays}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {policy.gracePeriodDays === 1
                ? "dia"
                : "dias"}{" "}
              apos ativacao
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dispositivos Confiaveis
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Settings className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {policy.allowTrustedDevices ? "Ativo" : "Inativo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {policy.allowTrustedDevices
                ? `${policy.trustedDeviceDurationDays} dias de duracao`
                : "Sem dispositivos confiaveis"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Step-up Auth
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Key className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {policy.requireStepUpForSensitiveActions ? "Ativo" : "Inativo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verificacao adicional para acoes sensiveis
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Roles with MFA Required */}
      {(policy.enforcementMode === "obrigatorio_roles" ||
        policy.enforcementMode === "obrigatorio_usuarios") && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>
              {policy.enforcementMode === "obrigatorio_roles"
                ? "Papeis com MFA Obrigatorio"
                : "Usuarios com MFA Obrigatorio"}
            </CardTitle>
            <CardDescription className="mt-1">
              {policy.enforcementMode === "obrigatorio_roles"
                ? "Papeis que devem obrigatoriamente configurar MFA."
                : `${policy.requiredUserIds.length} usuario(s) com MFA obrigatorio.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policy.enforcementMode === "obrigatorio_roles" ? (
              <div className="flex flex-wrap gap-2">
                {policy.requiredRoles.length > 0 ? (
                  policy.requiredRoles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum papel selecionado.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {policy.requiredUserIds.length > 0
                  ? `${policy.requiredUserIds.length} usuario(s) configurado(s).`
                  : "Nenhum usuario selecionado."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Editar Politica MFA</CardTitle>
          <CardDescription className="mt-1">
            Altere as configuracoes de enforcement, periodo de carencia e
            dispositivos confiaveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaPolicyEditor policy={policy} />
        </CardContent>
      </Card>
    </div>
  );
}
