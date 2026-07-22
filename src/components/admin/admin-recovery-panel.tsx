"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Smartphone,
  Monitor,
  Unlock,
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

import {
  adminUnlockMfaAction,
  adminGenerateRecoveryCodesAction,
  adminForceSignOutAction,
} from "@/app/admin/usuarios/actions";

type RecoveryStatus = {
  mfa: { hasEnrollment: boolean; enabled: boolean; lockedOut: boolean; lockoutExpiresAt?: string };
  recoveryCodes: { activeCount: number };
  trustedDevices: { activeCount: number };
  sessions: { activeCount: number };
  overallStatus: string;
};

type ActionDialog = "unlock_mfa" | "generate_codes" | "force_signout" | "reset_mfa" | null;

export function AdminRecoveryPanel({
  targetUserId,
  targetUserName,
  recoveryStatus,
}: {
  targetUserId: string;
  targetUserName: string;
  recoveryStatus: RecoveryStatus;
}) {
  const [activeDialog, setActiveDialog] = useState<ActionDialog>(null);
  const [justification, setJustification] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(true);

  const statusColor =
    recoveryStatus.overallStatus === "ok"
      ? "emerald"
      : recoveryStatus.overallStatus === "warning"
        ? "yellow"
        : "red";

  const handleAction = async (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        toast.success("Ação executada com sucesso");
        setActiveDialog(null);
        setJustification("");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao executar ação";
        toast.error(msg);
      }
    });
  };

  const handleUnlockMfa = () =>
    handleAction(async () => {
      const fd = new FormData();
      fd.set("targetUserId", targetUserId);
      fd.set("justification", justification);
      await adminUnlockMfaAction(fd);
    });

  const handleGenerateCodes = () =>
    handleAction(async () => {
      const fd = new FormData();
      fd.set("targetUserId", targetUserId);
      fd.set("justification", justification);
      const result = await adminGenerateRecoveryCodesAction(fd);
      if (result?.codes) setGeneratedCodes(result.codes);
    });

  const handleForceSignOut = () =>
    handleAction(async () => {
      const fd = new FormData();
      fd.set("targetUserId", targetUserId);
      fd.set("justification", justification);
      await adminForceSignOutAction(fd);
    });

  type DialogConfig = { title: string; description: string; onConfirm: () => void; destructive?: boolean };
  const dialogConfig: Record<string, DialogConfig> = {
    unlock_mfa: {
      title: "Desbloquear MFA",
      description: "Remove o bloqueio de tentativas MFA sem desativar a proteção. O usuário poderá tentar novamente.",
      onConfirm: handleUnlockMfa,
    },
    generate_codes: {
      title: "Gerar novos códigos de recuperação",
      description: "Gera um novo lote de códigos e revoga os anteriores. Os códigos serão exibidos apenas uma vez.",
      onConfirm: handleGenerateCodes,
    },
    force_signout: {
      title: "Forçar encerramento de sessões",
      description: "Remove todas as sessões ativas do usuário e revoga dispositivos confiáveis. O usuário precisará fazer login novamente.",
      onConfirm: handleForceSignOut,
      destructive: true,
    },
  };

  const currentConfig = activeDialog ? (dialogConfig[activeDialog] ?? null) : null;

  return (
    <>
      <Card className="rounded-lg">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              Recuperação de Acesso
              <Badge
                variant="outline"
                className={`ml-2 border-${statusColor}-300 text-${statusColor}-700 dark:border-${statusColor}-700 dark:text-${statusColor}-400`}
              >
                {recoveryStatus.overallStatus === "ok"
                  ? "Normal"
                  : recoveryStatus.overallStatus === "warning"
                    ? "Atenção"
                    : "Crítico"}
              </Badge>
            </div>
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </CardTitle>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4">
            {/* Grid de status */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {/* MFA */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  {recoveryStatus.mfa.enabled ? (
                    <ShieldCheck className="size-4 text-emerald-600" />
                  ) : (
                    <ShieldOff className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">MFA</span>
                </div>
                <p className="text-sm font-semibold">
                  {recoveryStatus.mfa.enabled ? "Ativo" : "Inativo"}
                </p>
                {recoveryStatus.mfa.lockedOut && (
                  <p className="text-xs text-red-600 mt-1">Bloqueado</p>
                )}
              </div>

              {/* Recovery Codes */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Códigos</span>
                </div>
                <p className="text-sm font-semibold">
                  {recoveryStatus.recoveryCodes.activeCount} ativos
                </p>
                {recoveryStatus.recoveryCodes.activeCount === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">Nenhum código</p>
                )}
              </div>

              {/* Trusted Devices */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Dispositivos</span>
                </div>
                <p className="text-sm font-semibold">
                  {recoveryStatus.trustedDevices.activeCount} confiáveis
                </p>
              </div>

              {/* Sessions */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Sessões</span>
                </div>
                <p className="text-sm font-semibold">
                  {recoveryStatus.sessions.activeCount} ativas
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setActiveDialog("unlock_mfa")}
                disabled={recoveryStatus.mfa.lockedOut === false}
              >
                <Unlock className="size-3.5" />
                Desbloquear MFA
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setActiveDialog("generate_codes")}
              >
                <RefreshCw className="size-3.5" />
                Gerar códigos
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                onClick={() => setActiveDialog("force_signout")}
                disabled={recoveryStatus.sessions.activeCount === 0}
              >
                <LogOut className="size-3.5" />
                Forçar sign-out
              </Button>
            </div>

            {/* Códigos gerados */}
            {generatedCodes && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    Códigos gerados — exiba apenas uma vez ao usuário
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                  {generatedCodes.map((code, i) => (
                    <div key={i} className="rounded bg-white px-2 py-1 dark:bg-gray-900">
                      {code}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCodes.join("\n"));
                    toast.success("Códigos copiados");
                  }}
                >
                  Copiar todos
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialog de confirmação */}
      {activeDialog && currentConfig && (
        <Dialog open onOpenChange={() => { setActiveDialog(null); setJustification(""); setGeneratedCodes(null); }}>
          <DialogPopup className="max-w-md">
            <DialogTitle className="flex items-center gap-2">
              {currentConfig.destructive ? (
                <AlertTriangle className="size-5 text-red-600" />
              ) : (
                <Shield className="size-5" />
              )}
              {currentConfig.title}
            </DialogTitle>
            <DialogDescription className="mt-1">{currentConfig.description}</DialogDescription>

            <div className="space-y-3 mt-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>Usuário:</strong> {targetUserName}</p>
                <p><strong>ID:</strong> {targetUserId.slice(0, 8)}...</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="justification">Justificativa (mínimo 10 caracteres)</Label>
                <Input
                  id="justification"
                  placeholder="Descreva o motivo desta ação..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {justification.length}/10 caracteres mínimos
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <DialogClose>
                <Button variant="ghost" disabled={isPending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                variant={currentConfig.destructive ? "destructive" : "default"}
                onClick={currentConfig.onConfirm}
                disabled={isPending || justification.length < 10}
              >
                {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Confirmar
              </Button>
            </div>
          </DialogPopup>
        </Dialog>
      )}
    </>
  );
}
