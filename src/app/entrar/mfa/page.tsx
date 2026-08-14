import { redirect } from "next/navigation";
import { Scale, ShieldCheck } from "lucide-react";

import { getPendingMfaState } from "@/app/entrar/mfa/pending-state";
import { MfaChallengeForm } from "./mfa-challenge-form";

/**
 * Página de desafio MFA durante o login.
 *
 * Server component que:
 * 1. Verifica se existe estado pendente de MFA no cookie
 * 2. Se não existir ou expirou → redireciona para /entrar
 * 3. Se existir → renderiza o formulário de verificação MFA
 */
export default async function MfaChallengePage() {
  const pendingState = await getPendingMfaState();

  if (!pendingState) {
    redirect("/entrar");
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Branding */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-slate-50 via-white to-slate-200 text-slate-900 overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-slate-300/40 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Scale className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-950">Alfenus</span>
        </div>

        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 leading-tight">
              Verificação de segurança
            </h1>
            <p className="text-base text-slate-700 leading-relaxed">
              Para proteger sua conta, precisamos confirmar sua identidade.
              Insira o código do seu aplicativo autenticador para continuar.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-300">
            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Autenticação de Dois Fatores</p>
                <p className="mt-1 text-xs text-slate-600">
                  Uma camada extra de segurança para garantir que apenas você possa acessar sua conta.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-slate-300 pt-6">
          <p className="text-xs text-slate-600 italic leading-relaxed">
            &ldquo;A confiança e a transparência em nossa plataforma são garantidas por criptografia de dados e práticas de segurança de padrão bancário.&rdquo;
          </p>
        </div>
      </section>

      {/* Right side: MFA Form */}
      <section className="flex flex-col justify-center p-6 sm:p-12 md:p-16 lg:p-24 bg-muted/20">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile branding */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Scale className="size-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">Alfenus</span>
          </div>

          <MfaChallengeForm />

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-muted-foreground">
            <p>Conexão criptografada via SSL. Alfenus &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
