"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  verifyMfaLoginAction,
  verifyRecoveryCodeLoginAction,
  type MfaVerifyResult,
} from "@/app/entrar/mfa/actions";

// ---------------------------------------------------------------------------
// Componente do formulário de desafio MFA
// ---------------------------------------------------------------------------

export function MfaChallengeForm() {
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<string | null>(null);

  const [totpState, totpDispatch, totpPending] = useActionState(
    async (_prev: MfaVerifyResult | undefined, formData: FormData) => {
      return verifyMfaLoginAction(code, _prev, formData);
    },
    undefined
  );

  const [recoveryState, recoveryDispatch, recoveryPending] = useActionState(
    async (_prev: MfaVerifyResult | undefined, formData: FormData) => {
      return verifyRecoveryCodeLoginAction(code, _prev, formData);
    },
    undefined
  );

  const currentState = mode === "totp" ? totpState : recoveryState;
  const isPending = mode === "totp" ? totpPending : recoveryPending;

  // Limpar código ao trocar de modo
  useEffect(() => {
    setCode("");
  }, [mode]);

  // Timer de lockout
  useEffect(() => {
    if (!currentState?.lockedOut || !currentState.lockoutExpiresAt) {
      setLockoutTimeLeft(null);
      return;
    }

    function updateTimer() {
      const expiresAt = new Date(currentState!.lockoutExpiresAt!).getTime();
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setLockoutTimeLeft(null);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setLockoutTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentState?.lockedOut, currentState?.lockoutExpiresAt]);

  const isLocked = Boolean(currentState?.lockedOut);
  const codeLength = mode === "totp" ? 6 : 9; // TOTP: 6 dígitos | Recuperação: XXXX-XXXX (9 chars)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "totp") {
      totpDispatch(new FormData());
    } else {
      recoveryDispatch(new FormData());
    }
  }

  return (
    <Card className="border-border/40 shadow-xl shadow-foreground/5 bg-background">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Verificação em duas etapas
            </CardTitle>
            <CardDescription className="text-xs leading-normal">
              {mode === "totp"
                ? "Insira o código de 6 dígitos do seu aplicativo autenticador."
                : "Insira um dos seus códigos de recuperação."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Modo TOTP */}
          {mode === "totp" && (
            <div className="space-y-3">
              <Label htmlFor="mfa-code" className="text-xs font-semibold">
                Código de autenticação
              </Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={isLocked}
                autoFocus
                className="font-mono text-lg tracking-[0.3em] text-center h-12"
              />
              {/* Indicadores visuais dos 6 dígitos */}
              <div className="flex gap-1.5 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex size-9 items-center justify-center rounded-lg border text-sm font-mono font-medium transition-all ${
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
          )}

          {/* Modo Recuperação */}
          {mode === "recovery" && (
            <div className="space-y-3">
              <Label htmlFor="recovery-code" className="text-xs font-semibold">
                Código de recuperação
              </Label>
              <Input
                id="recovery-code"
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
                disabled={isLocked}
                autoFocus
                className="font-mono text-lg tracking-[0.15em] text-center h-12 uppercase"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Formato: XXXX-XXXX (8 caracteres hexadecimais)
              </p>
            </div>
          )}

          {/* Mensagem de lockout */}
          {isLocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Conta temporariamente bloqueada
                  </p>
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                    Excesso de tentativas incorretas. Tente novamente em{" "}
                    <span className="font-mono font-bold">{lockoutTimeLeft}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de erro genérica */}
          {currentState?.error && !currentState?.lockedOut && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive font-medium">
              {currentState.error}
            </div>
          )}

          {/* Botão de envio */}
          <Button
            type="submit"
            className="w-full h-11 font-semibold transition active:scale-[0.98]"
            disabled={code.length < (mode === "totp" ? 6 : 4) || isPending || isLocked}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                Verificando...
              </span>
            ) : (
              "Verificar código"
            )}
          </Button>
        </form>

        {/* Alternar entre TOTP e Recuperação */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {mode === "totp" ? (
            <Button
              variant="ghost"
              className="w-full h-9 text-xs font-medium"
              onClick={() => setMode("recovery")}
              disabled={isLocked}
            >
              <KeyRound className="size-3.5 mr-1.5" />
              Usar código de recuperação
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full h-9 text-xs font-medium"
              onClick={() => setMode("totp")}
              disabled={isLocked}
            >
              <ShieldCheck className="size-3.5 mr-1.5" />
              Usar código do autenticador
            </Button>
          )}
        </div>

        {/* Link cancelar */}
        <div className="mt-5 border-t border-border/40 pt-4 text-center">
          <Link
            href="/entrar"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3" />
            Cancelar e voltar ao login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
