"use client";

import { useState, useRef, useTransition, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  startMfaEnrollmentAction,
  verifyMfaEnrollmentAction,
  disableMfaAction,
  regenerateRecoveryCodesAction,
  getActiveEnrollmentIdAction,
} from "@/app/configuracoes/seguranca/actions";
import {
  Shield,
  ShieldCheck,
  QrCode,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Download,
} from "lucide-react";

type EnrollmentStep = "idle" | "qr" | "verifying" | "recovery" | "done";

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Escanear QR", icon: QrCode },
    { num: 2, label: "Inserir codigo", icon: KeyRound },
    { num: 3, label: "Codigos de recuperacao", icon: Download },
    { num: 4, label: "Concluido", icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((s, i) => {
        const isActive = s.num === currentStep;
        const isCompleted = s.num < currentStep;
        return (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="size-3" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.num}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-px w-4 sm:w-8 ${
                  isCompleted ? "bg-emerald-300 dark:bg-emerald-700" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MfaSetupDialog({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<EnrollmentStep>("idle");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const enrollmentRef = useRef<{ secret: string; qrUri: string; enrollmentId: string } | null>(null);

  // Disable MFA state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, startDisableTransition] = useTransition();
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<string | null>(null);

  useEffect(() => {
    if (mfaEnabled) {
      getActiveEnrollmentIdAction().then(setActiveEnrollmentId);
    }
  }, [mfaEnabled]);

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && step === "idle" && !mfaEnabled) {
      startEnrollment();
    }
    if (!isOpen) {
      setStep("idle");
      setCode("");
      setRecoveryCodes([]);
      enrollmentRef.current = null;
    }
  }

  function startEnrollment() {
    startTransition(async () => {
      try {
        const result = await startMfaEnrollmentAction();
        enrollmentRef.current = {
          secret: result.secret,
          qrUri: result.qrUri,
          enrollmentId: result.enrollmentId,
        };
        setStep("qr");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao iniciar enrollment MFA.");
        setOpen(false);
      }
    });
  }

  function handleVerify() {
    if (code.length !== 6 || !enrollmentRef.current) {
      toast.error("Digite o codigo de 6 digitos.");
      return;
    }
    startTransition(async () => {
      try {
        setStep("verifying");
        const fd = new FormData();
        fd.set("enrollmentId", enrollmentRef.current!.enrollmentId);
        fd.set("token", code);
        await verifyMfaEnrollmentAction(fd);
        // Gerar codigos de recuperacao apos verificacao
        const result = await regenerateRecoveryCodesAction();
        setRecoveryCodes(result.codes);
        setStep("recovery");
        toast.success("MFA ativado com sucesso!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Codigo invalido. Tente novamente.");
        setStep("qr");
      }
    });
  }

  function handleDisableMfa(enrollmentId: string) {
    if (disableCode.length !== 6) {
      toast.error("Digite o codigo de verificacao de 6 digitos.");
      return;
    }
    startDisableTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("enrollmentId", enrollmentId);
        fd.set("token", disableCode);
        await disableMfaAction(fd);
        toast.success("MFA desativado com sucesso!");
        setShowDisableDialog(false);
        setDisableCode("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao desativar MFA.");
      }
    });
  }

  // --- MFA HABILITADO: exibir status e opcao de desativar ---
  if (mfaEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              MFA ativado
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Sua conta esta protegida com autenticacao de dois fatores.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDisableDialog(true)}
          >
            <Lock className="size-3.5" />
            Desativar MFA
          </Button>
        </div>

        {/* Dialog de confirmacao para desativar MFA */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogPopup className="max-w-md">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <DialogTitle>Desativar MFA</DialogTitle>
                  <DialogDescription>
                    Para desativar a autenticacao de dois fatores, insira o codigo
                    atual do seu aplicativo autenticador. Esta acao reduzira a
                    seguranca da sua conta.
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disable-code">Codigo de verificacao</Label>
                <Input
                  id="disable-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && disableCode.length === 6 && !isDisabling && activeEnrollmentId) {
                      handleDisableMfa(activeEnrollmentId);
                    }
                  }}
                  autoFocus
                  className="font-mono text-lg tracking-[0.3em] text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Abra seu aplicativo autenticador e insira o codigo atual.
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <DialogClose render={<Button variant="ghost" size="sm" />}>
                  Cancelar
                </DialogClose>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => activeEnrollmentId && handleDisableMfa(activeEnrollmentId)}
                  disabled={disableCode.length !== 6 || isDisabling || !activeEnrollmentId}
                >
                  {isDisabling ? "Desativando..." : "Desativar MFA"}
                </Button>
              </div>
            </div>
          </DialogPopup>
        </Dialog>
      </div>
    );
  }

  // --- MFA DESABILITADO: dialog de configuracao ---
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <Shield className="size-4" />
        Configurar MFA
      </DialogTrigger>

      <DialogPopup className="max-w-md">
        {/* Step 1: QR Code */}
        {step === "qr" && enrollmentRef.current && (
          <div className="space-y-5">
            <div>
              <DialogTitle>Configurar autenticacao de dois fatores</DialogTitle>
              <DialogDescription>
                Escaneie o codigo QR abaixo com seu aplicativo autenticador
                (Google Authenticator, Authy, etc.).
              </DialogDescription>
            </div>

            <StepIndicator currentStep={1} />

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative rounded-xl border-2 border-dashed border-border bg-white p-6 shadow-sm dark:bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enrollmentRef.current.qrUri)}`}
                  alt="QR Code para MFA"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <QrCode className="size-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Escanear com Google Authenticator
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Se nao conseguir escanear, copie a chave manualmente:
              </p>
              <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs break-all">
                {enrollmentRef.current.secret.match(/.{1,4}/g)?.join(" ")}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfa-code">Codigo de verificacao</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && code.length === 6 && !isPending) {
                      handleVerify();
                    }
                  }}
                  autoFocus
                  className="font-mono text-lg tracking-[0.3em] text-center"
                />
              </div>
              <div className="flex gap-1.5 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex size-8 items-center justify-center rounded-md border text-sm font-mono font-medium transition-all ${
                      code[i]
                        ? "border-primary bg-primary/5 text-foreground"
                        : i === code.length
                          ? "border-primary/50"
                          : "border-border"
                    }`}
                  >
                    {code[i] || ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose
                render={<Button variant="ghost" size="sm" />}
              >
                Cancelar
              </DialogClose>
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={code.length !== 6 || isPending}
              >
                {isPending ? "Verificando..." : "Ativar MFA"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verificando */}
        {step === "verifying" && (
          <div className="space-y-4 py-6 text-center">
            <StepIndicator currentStep={2} />
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">Verificando codigo...</p>
          </div>
        )}

        {/* Step 3: Codigos de recuperacao */}
        {step === "recovery" && (
          <div className="space-y-5">
            <StepIndicator currentStep={3} />
            <div>
              <DialogTitle>Codigos de recuperacao</DialogTitle>
              <DialogDescription>
                Estes codigos podem ser usados para acessar sua conta caso voce
                perca o acesso ao aplicativo autenticador.
              </DialogDescription>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Estes codigos nao serao exibidos novamente. Guarde-os em local seguro.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              {recoveryCodes.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-sm text-center"
                >
                  {c}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join("\n"));
                  toast.success("Codigos copiados para a area de transferencia!");
                }}
              >
                Copiar todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const content = [
                    "========================================",
                    "  CODIGOS DE RECUPERACAO - ERP JURIDICO",
                    "========================================",
                    "",
                    "Guarde estes codigos em local seguro.",
                    "Cada codigo pode ser usado apenas uma vez.",
                    "",
                    ...recoveryCodes.map((c, i) => `  ${i + 1}. ${c}`),
                    "",
                    "========================================",
                    "IMPORTANTE: Estes codigos nao serao",
                    "exibidos novamente.",
                    "========================================",
                  ].join("\n");
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "codigos-recuperacao-mfa.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Arquivo baixado com sucesso!");
                }}
              >
                <Download className="size-3.5" />
                Baixar
              </Button>
            </div>

            <div className="flex justify-center">
              <DialogClose
                render={<Button size="sm" />}
              >
                Concluir
              </DialogClose>
            </div>
          </div>
        )}

        {/* Step 4: Concluido */}
        {step === "done" && (
          <div className="space-y-4 py-4">
            <StepIndicator currentStep={4} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="size-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                  <CheckCircle2 className="size-4 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle>MFA ativado!</DialogTitle>
                <DialogDescription>
                  Sua conta agora esta protegida com autenticacao de dois fatores.
                  Voce precisara do codigo do seu autenticador a cada login.
                </DialogDescription>
              </div>
            </div>
            <div className="flex justify-center">
              <DialogClose
                render={<Button size="sm" />}
              >
                Concluir
              </DialogClose>
            </div>
          </div>
        )}

        {/* Idle loading */}
        {step === "idle" && isPending && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">Preparando configuracao...</p>
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}
