"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistedAccess } from "@/lib/assisted-access/context";
import { endSupportSessionAction } from "@/lib/assisted-access/actions";
import { cn } from "@/lib/utils";

// ── Props ───────────────────────────────────────────────────────────────────

type AssistedAccessGuardProps = {
  children: ReactNode;
  /** Módulo que esta rota requer acesso */
  requiredModule?: string;
  /** Ação que esta rota requer */
  requiredAction?: string;
  /** URL para redirecionar quando a sessão expira */
  redirectTo?: string;
};

// ── Componente ──────────────────────────────────────────────────────────────

export function AssistedAccessGuard({
  children,
  requiredModule,
  requiredAction,
  redirectTo = "/suporte/acesso-assistido",
}: AssistedAccessGuardProps) {
  const { session, isActive, allowedModules, allowedActions } =
    useAssistedAccess();
  const router = useRouter();

  // ── Redirecionar se a sessão expirou ──────────────────────────────────

  useEffect(() => {
    if (session && !isActive) {
      router.replace(redirectTo);
    }
  }, [session, isActive, router, redirectTo]);

  // ── Sessão inativa ────────────────────────────────────────────────────

  if (session && !isActive) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Sessão expirada
          </h2>
          <p className="text-sm text-muted-foreground">
            Sua sessão de acesso assistido foi encerrada. Entre em contato com
            o suporte se precisar de acesso adicional.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace(redirectTo)}
        >
          Voltar
        </Button>
      </div>
    );
  }

  // ── Sem sessão ativa ──────────────────────────────────────────────────

  if (!session || !isActive) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Acesso restrito
          </h2>
          <p className="text-sm text-muted-foreground">
            Esta página requer uma sessão de acesso assistido ativa. Solicite
            acesso através do sistema de suporte.
          </p>
        </div>
      </div>
    );
  }

  // ── Verificar módulo ──────────────────────────────────────────────────

  if (requiredModule && !allowedModules.includes(requiredModule)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Módulo fora do escopo
          </h2>
          <p className="text-sm text-muted-foreground">
            Você não tem acesso ao módulo{" "}
            <span className="font-medium text-foreground">
              {requiredModule}
            </span>{" "}
            nesta sessão. Os módulos permitidos são:{" "}
            <span className="font-medium text-foreground">
              {allowedModules.join(", ")}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          Voltar
        </Button>
      </div>
    );
  }

  // ── Verificar ação ────────────────────────────────────────────────────

  if (requiredAction && !allowedActions.includes(requiredAction)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Ação não autorizada
          </h2>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para executar a ação{" "}
            <span className="font-medium text-foreground">
              {requiredAction}
            </span>{" "}
            nesta sessão. As ações permitidas são:{" "}
            <span className="font-medium text-foreground">
              {allowedActions.join(", ")}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          Voltar
        </Button>
      </div>
    );
  }

  // ── Tudo autorizado ───────────────────────────────────────────────────

  return <>{children}</>;
}
