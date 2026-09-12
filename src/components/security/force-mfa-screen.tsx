"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Shield,
  ShieldCheck,
  QrCode,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
} from "lucide-react";

export function ForceMfaScreen({
  reason,
  deadline,
}: {
  reason: string;
  deadline?: string;
}) {
  const router = useRouter();
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  function handleStartSetup() {
    router.push("/configuracoes/seguranca");
  }

  function handleRecoveryCode() {
    if (recoveryCode.length < 8) {
      return;
    }
    // Submit recovery code - in a real implementation this would call a server action
    // For now, redirect to the security settings page
    router.push("/configuracoes/seguranca?recovery=true");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.03),transparent_70%)]" />

      <div className="relative z-10 mx-4 w-full max-w-lg space-y-8 text-center">
        {/* Icone principal */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <Shield className="size-10 text-primary" />
            </div>
            <div className="absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full bg-red-500 shadow-lg">
              <Lock className="size-4 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Configuracao Obrigatoria
            </h1>
            <h2 className="text-lg font-semibold text-foreground">
              Autenticacao de Dois Fatores (MFA)
            </h2>
          </div>
        </div>

        {/* Mensagem de explicacao */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {reason || "Seu escritorio exige MFA para acessar o sistema."}
              </p>
              {deadline && (
                <p className="text-xs text-muted-foreground">
                  Prazo:{" "}
                  {new Date(deadline).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                O acesso ao ERP Juridico sera bloqueado ate que a configuracao seja concluida.
              </p>
            </div>
          </div>
        </div>

        {/* Passo a passo */}
        <div className="space-y-3 text-left">
          <h3 className="text-sm font-semibold text-foreground">
            Como configurar:
          </h3>
          <ol className="space-y-2">
            {[
              {
                step: 1,
                icon: QrCode,
                text: "Baixe um aplicativo autenticador (Google Authenticator, Authy, etc.)",
              },
              {
                step: 2,
                icon: QrCode,
                text: "Escaneie o codigo QR que sera exibido na tela de configuracao",
              },
              {
                step: 3,
                icon: KeyRound,
                text: "Insira o codigo de verificacao de 6 digitos gerado pelo aplicativo",
              },
              {
                step: 4,
                icon: CheckCircle2,
                text: "Salve os codigos de recuperacao em local seguro",
              },
            ].map(({ step, icon: StepIcon, text }) => (
              <li key={step} className="flex items-start gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step}
                </div>
                <div className="flex items-start gap-2 pt-0.5">
                  <StepIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Botoes de acao */}
        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={handleStartSetup}>
            <ShieldCheck className="size-5" />
            Iniciar configuracao
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowRecoveryInput(true)}
          >
            <KeyRound className="size-4" />
            Usar codigo de recuperacao
          </Button>

          <Button
            variant="link"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              const subject = encodeURIComponent("Suporte MFA - Solicitacao de ajuda");
              const body = encodeURIComponent(
                `Ola,\n\nPreciso de ajuda para configurar a autenticacao de dois fatores (MFA).\n\nMotivo: ${reason}\n\nObrigado.`
              );
              window.open(`mailto:suporte@juridico.com?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            <ExternalLink className="size-3.5" />
            Contatar administrador
          </Button>
        </div>

        {/* Nota de seguranca */}
        <p className="text-[11px] text-muted-foreground/60">
          A autenticacao de dois fatores protege sua conta contra acessos nao autorizados.
          E uma camada adicional de seguranca exigida pelo administrador do escritorio.
        </p>
      </div>

      {/* Dialog para codigo de recuperacao */}
      <Dialog open={showRecoveryInput} onOpenChange={setShowRecoveryInput}>
        <DialogPopup className="max-w-sm">
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="size-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Codigo de recuperacao</DialogTitle>
                <DialogDescription>
                  Insira um dos seus codigos de recuperacao para acessar o sistema.
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-code-input">Codigo</Label>
              <Input
                id="recovery-code-input"
                type="text"
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && recoveryCode.length >= 8) {
                    handleRecoveryCode();
                  }
                }}
                autoFocus
                className="font-mono text-center text-lg tracking-widest uppercase"
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground text-center">
                O codigo tem o formato XXXX-XXXX (8 caracteres).
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <DialogClose render={<Button variant="ghost" size="sm" />}>
                Cancelar
              </DialogClose>
              <Button
                size="sm"
                onClick={handleRecoveryCode}
                disabled={recoveryCode.length < 8}
              >
                Usar codigo
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
