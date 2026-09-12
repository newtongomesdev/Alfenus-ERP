import { redirect } from "next/navigation";
import { KeyRound, AlertTriangle, Shield } from "lucide-react";
import Link from "next/link";

import { getAppContext } from "@/lib/auth/context";
import { getRecoveryCodeCount } from "@/lib/security/recovery-codes";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegenerateButton } from "./regenerate-button";

export default async function RecoveryCodesPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const codeCount = await getRecoveryCodeCount(context.member!.userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Codigos de Recuperacao"
        description="Gerencie seus codigos de recuperacao para acessar sua conta quando nao tiver acesso ao autenticador."
      />

      <div className="text-sm">
        <Link
          href="/configuracoes/seguranca"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar a seguranca
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status card */}
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-muted-foreground" />
              <CardTitle>Status dos Codigos</CardTitle>
            </div>
            <CardDescription>
              Visualize quantos codigos de recuperacao estao disponiveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">
                {codeCount}
              </span>
              <span className="text-sm text-muted-foreground">
                codigo{codeCount !== 1 ? "s" : ""} disponivel
                {codeCount !== 1 ? "eis" : ""}
              </span>
            </div>

            {codeCount <= 3 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Poucos codigos restantes
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Recomendamos gerar novos codigos quando restam 3 ou menos.
                  </p>
                </div>
              </div>
            )}

            {codeCount === 0 && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-950/20">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-800 dark:text-red-200">
                    Nenhum codigo disponivel
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Voce nao possui codigos de recuperacao. Gere novos codigos para garantir acesso de emergencia a sua conta.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions card */}
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              <CardTitle>O que sao codigos de recuperacao?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Codigos de recuperacao permitem acessar sua conta quando voce nao
              consegue usar o autenticador TOTP (ex: celular perdido ou
              danificado).
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Cada codigo pode ser usado apenas uma vez.</li>
              <li>Armazene-os em um local seguro e acessivel.</li>
              <li>Ao gerar novos codigos, os anteriores serao revogados.</li>
              <li>
                Recomendamos gerar novos periodicamente ou ao suspeita de
                comprometimento.
              </li>
            </ul>
            <p>
              Se voce perder todos os codigos e nao tiver acesso ao autenticador,
              precisara contatar um administrador para recuperar o acesso.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate section */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Gerenciar Codigos</CardTitle>
          <CardDescription>
            Gere novos codigos de recuperacao. Os codigos anteriores serao
            revogados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegenerateButton />
        </CardContent>
      </Card>
    </div>
  );
}
