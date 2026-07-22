"use client";

import { useState, useRef, useTransition } from "react";
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
} from "@/app/configuracoes/seguranca/actions";
import { Shield, ShieldCheck } from "lucide-react";

type EnrollmentStep = "idle" | "qr" | "verifying" | "done";

export function MfaSetupDialog({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<EnrollmentStep>("idle");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const enrollmentRef = useRef<{ secret: string; qrUri: string; enrollmentId: string } | null>(null);

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && step === "idle" && !mfaEnabled) {
      startEnrollment();
    }
    if (!isOpen) {
      setStep("idle");
      setCode("");
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
        setStep("done");
        toast.success("MFA ativado com sucesso!");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Codigo invalido. Tente novamente.");
        setStep("qr");
      }
    });
  }

  if (mfaEnabled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            MFA ativado
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Sua conta esta protegida com autenticacao de dois fatores.
          </p>
        </div>
      </div>
    );
  }

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
        {step === "qr" && enrollmentRef.current && (
          <div className="space-y-5">
            <div>
              <DialogTitle>Configurar autenticacao de dois fatores</DialogTitle>
              <DialogDescription>
                Escaneie o codigo QR abaixo com seu aplicativo autenticador
                (Google Authenticator, Authy, etc.).
              </DialogDescription>
            </div>

            {/* QR Code via API publica */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border border-border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enrollmentRef.current.qrUri)}`}
                  alt="QR Code para MFA"
                  width={200}
                  height={200}
                  className="block"
                />
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
              />
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

        {step === "verifying" && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">Verificando codigo...</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <ShieldCheck className="size-10 text-emerald-600" />
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
