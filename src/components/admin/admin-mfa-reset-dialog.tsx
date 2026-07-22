"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminResetMfaAction } from "@/app/admin/usuarios/actions";
import {
  ShieldOff,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type MfaStatus = {
  hasEnrollment: boolean;
  enrollmentEnabled: boolean;
  activeRecoveryCodes: number;
  trustedDevices: number;
  lastUsedAt: string | null;
};

export function AdminMfaResetDialog({
  targetUserId,
  targetUserName,
  mfaStatus,
}: {
  targetUserId: string;
  targetUserName: string;
  mfaStatus: MfaStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState("");

  const isJustificationValid = justification.trim().length >= 10;

  function handleConfirm() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("targetUserId", targetUserId);
        fd.set("justification", justification.trim());
        await adminResetMfaAction(fd);
        toast.success("MFA resetado com sucesso para " + targetUserName);
        setOpen(false);
        setJustification("");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao resetar MFA do usuário."
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30" />}
      >
        <RotateCcw className="size-3.5" />
        Resetar MFA
      </DialogTrigger>

      <DialogPopup className="max-w-lg">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldOff className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>Resetar MFA de {targetUserName}</DialogTitle>
              <DialogDescription>
                Esta ação irá desativar a autenticação de dois fatores e revogar
                todos os dispositivos confiáveis e códigos de recuperação deste
                usuário.
              </DialogDescription>
            </div>
          </div>

          {/* Status atual */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status atual do MFA
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Matrícula: </span>
                <span className="font-medium">
                  {mfaStatus.enrollmentEnabled ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Códigos de recuperação: </span>
                <span className="font-medium">{mfaStatus.activeRecoveryCodes}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dispositivos confiáveis: </span>
                <span className="font-medium">{mfaStatus.trustedDevices}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Último uso: </span>
                <span className="font-medium">
                  {mfaStatus.lastUsedAt
                    ? new Date(mfaStatus.lastUsedAt).toLocaleDateString("pt-BR")
                    : "Nunca"}
                </span>
              </div>
            </div>
          </div>

          {/* Checklist de confirmação */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              O que acontecerá:
            </p>
            <ul className="space-y-1.5 text-sm">
              {[
                "MFA será desativado",
                "Códigos de recuperação serão revogados",
                "Dispositivos confiáveis serão revogados",
                "Usuário será forçado a reconfigurar MFA no próximo login",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="mfa-reset-justification">
              Justificativa <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="mfa-reset-justification"
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              placeholder="Descreva o motivo do reset (mínimo de 10 caracteres)..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {justification.length < 10
                ? `Mínimo de 10 caracteres (${justification.length}/10)`
                : "Justificativa válida"}
            </p>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <DialogClose render={<Button variant="ghost" size="sm" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={!isJustificationValid || isPending}
            >
              {isPending ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
