import { ArrowLeft, CheckCircle2, KeyRound, Scale } from "lucide-react";
import Link from "next/link";

import { requestPasswordResetAction } from "@/app/recuperar-senha/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  ambiente: "Configure as variáveis do Supabase antes de recuperar a senha.",
};

const infoMessages: Record<string, string> = {
  enviado: "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e a pasta de spam.",
};

export default async function RecoverPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.erro ? errorMessages[params.erro] : null;
  const infoMessage = params.mensagem ? infoMessages[params.mensagem] : null;
  const success = params.mensagem === "enviado";

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Premium Branding Panel */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary/95 to-slate-950 text-primary-foreground overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
            <Scale className="size-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Alfenus</span>
        </div>

        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Recupere o acesso à sua conta.
            </h1>
            <p className="text-base text-primary-foreground/80 leading-relaxed">
              Informe o e-mail associado à sua conta e enviaremos um link seguro para redefinir sua senha.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Processo seguro</p>
                <p className="mt-1 text-xs text-primary-foreground/70">O link de redefinição expira automaticamente após 24 horas por segurança.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Verifique o spam</p>
                <p className="mt-1 text-xs text-primary-foreground/70">Caso não encontre o e-mail na caixa principal, chefe a pasta de spam ou lixeira.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-xs text-primary-foreground/60 italic leading-relaxed">
            &ldquo;A confiança e a transparência em nossa plataforma são garantidas por criptografia de dados e práticas de segurança de padrão bancário.&rdquo;
          </p>
        </div>
      </section>

      {/* Right side: Recovery Form */}
      <section className="flex flex-col justify-between p-6 sm:p-12 md:p-16 lg:p-24 bg-muted/20">
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link href="/entrar" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3.5" />
            Voltar para o login
          </Link>
        </div>

        <div className="my-auto w-full max-w-md mx-auto">
          <Card className="border-border/40 shadow-xl shadow-foreground/5 bg-background">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Recuperar Senha</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Informe o e-mail da sua conta para receber o link de redefinição.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs leading-relaxed text-emerald-600 font-medium">
                    {infoMessage}
                  </div>
                  <Link
                    href="/entrar"
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 active:scale-[0.98]"
                  >
                    Voltar para o login
                  </Link>
                </div>
              ) : (
                <form action={requestPasswordResetAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold">E-mail corporativo</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="exemplo@escritorio.com.br"
                      required
                      className="h-10 transition duration-200 focus-visible:ring-primary"
                    />
                  </div>

                  {errorMessage ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive font-medium">
                      {errorMessage}
                    </div>
                  ) : null}

                  <Button className="w-full h-10 mt-2 font-semibold transition active:scale-[0.98]" type="submit">
                    Enviar Link de Recuperação
                  </Button>
                </form>
              )}

              <div className="mt-6 border-t border-border/40 pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Lembrou sua senha?{" "}
                  <Link className="font-semibold text-primary hover:underline underline-offset-4" href="/entrar">
                    Acessar minha conta
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full max-w-md mx-auto mt-8 text-center text-[10px] text-muted-foreground">
          <p>Conexão criptografada via SSL. Alfenus &copy; {new Date().getFullYear()}</p>
        </div>
      </section>
    </main>
  );
}
