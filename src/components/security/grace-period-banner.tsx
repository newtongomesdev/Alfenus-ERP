"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, ExternalLink } from "lucide-react";

export function GracePeriodBanner({
  daysRemaining,
  deadline,
  enforcementMode,
}: {
  daysRemaining: number;
  deadline: string;
  enforcementMode: string;
}) {
  const router = useRouter();

  const isUrgent = daysRemaining <= 3;
  const isCritical = daysRemaining <= 1;

  function getModeLabel(mode: string): string {
    switch (mode) {
      case "obrigatorio_todos":
        return "todos os membros";
      case "obrigatorio_roles":
        return "seu papel";
      case "obrigatorio_usuarios":
        return "seu usuario";
      default:
        return "sua conta";
    }
  }

  return (
    <div
      className={`w-full border-b px-4 py-3 ${
        isCritical
          ? "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
          : isUrgent
            ? "border-orange-300 bg-orange-50 dark:border-orange-800/50 dark:bg-orange-950/30"
            : "border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
              isCritical
                ? "bg-red-100 dark:bg-red-900/40"
                : isUrgent
                  ? "bg-orange-100 dark:bg-orange-900/40"
                  : "bg-amber-100 dark:bg-amber-900/40"
            }`}
          >
            <AlertTriangle
              className={`size-4 ${
                isCritical
                  ? "text-red-600 dark:text-red-400"
                  : isUrgent
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-amber-600 dark:text-amber-400"
              }`}
            />
          </div>
          <div className="space-y-0.5">
            <p
              className={`text-sm font-semibold ${
                isCritical
                  ? "text-red-800 dark:text-red-200"
                  : isUrgent
                    ? "text-orange-800 dark:text-orange-200"
                    : "text-amber-800 dark:text-amber-200"
              }`}
            >
              Seu escritorio exige MFA para {getModeLabel(enforcementMode)}.
            </p>
            <p
              className={`text-xs ${
                isCritical
                  ? "text-red-700 dark:text-red-300"
                  : isUrgent
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              Configure em{" "}
              <span className="font-bold">
                {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""}
              </span>
              . Prazo:{" "}
              {new Date(deadline).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              .
              {isUrgent && " Apos este prazo, o acesso ao sistema sera bloqueado."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
          <Button
            size="sm"
            onClick={() => router.push("/configuracoes/seguranca")}
            className={
              isCritical
                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                : isUrgent
                  ? "bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
                  : "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
            }
          >
            <Shield className="size-3.5" />
            Configurar MFA agora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const subject = encodeURIComponent("Suporte MFA - Solicitacao de ajuda");
              const body = encodeURIComponent(
                `Ola,\n\nPreciso de ajuda para configurar a autenticacao de dois fatores (MFA).\n\nPrazo restante: ${daysRemaining} dia(s).\n\nObrigado.`
              );
              window.open(`mailto:suporte@juridico.com?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            <ExternalLink className="size-3.5" />
            Falar com administrador
          </Button>
        </div>
      </div>
    </div>
  );
}
