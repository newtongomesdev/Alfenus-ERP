import { ArrowLeft, Scale, ShieldCheck, Landmark } from "lucide-react";
import Link from "next/link";

import { signInAction } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  ambiente: "Configure as variáveis do Supabase antes de entrar.",
  credenciais: "E-mail ou senha incorretos. Por favor, tente novamente.",
};

const infoMessages: Record<string, string> = {
  confirmacao: "Sua conta foi criada com sucesso! Verifique sua caixa de entrada para confirmar seu e-mail antes de acessar a plataforma.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.erro ? errorMessages[params.erro] : null;
  const infoMessage = params.mensagem ? infoMessages[params.mensagem] : null;

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Premium Branding Panel */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary/95 to-slate-950 text-primary-foreground overflow-hidden">
        {/* Glow decorative element */}
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
        
        {/* Top Header/Brand */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
            <Scale className="size-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Alfenus</span>
        </div>

        {/* Center: Pitch & Value proposition */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Sua operação jurídica segura e sem atritos.
            </h1>
            <p className="text-base text-primary-foreground/80 leading-relaxed">
              Gerencie leads, processos judiciais, prazos críticos e todo o fluxo financeiro do seu escritório em um ambiente isolado de alta performance.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Confidencialidade Garantida</p>
                <p className="mt-1 text-xs text-primary-foreground/70">Isolamento rigoroso de informações, garantindo total privacidade para os dados do seu escritório.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white">
                <Landmark className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Auditoria e Controle de Permissões</p>
                <p className="mt-1 text-xs text-primary-foreground/70">Gerencie perfis de acesso detalhados para advogados, sócios e administrativos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Subtitle/Quote */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-xs text-primary-foreground/60 italic leading-relaxed">
            &ldquo;A confiança e a transparência em nossa plataforma são garantidas por criptografia de dados e práticas de segurança de padrão bancário.&rdquo;
          </p>
        </div>
      </section>

      {/* Right side: Login Form */}
      <section className="flex flex-col justify-between p-6 sm:p-12 md:p-16 lg:p-24 bg-muted/20">
        {/* Back Link */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3.5" />
            Voltar para o site
          </Link>
          <Link
            href="/cadastrar"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
          >
            Criar conta
          </Link>
        </div>

        {/* Card wrapper */}
        <div className="my-auto w-full max-w-md mx-auto">
          <Card className="border-border/40 shadow-xl shadow-foreground/5 bg-background">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Acessar Conta</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Insira suas credenciais abaixo para entrar na plataforma do seu escritório.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signInAction} className="space-y-4">
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
                    <Link href="/recuperar-senha" className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">Esqueci minha senha</Link>
                  </div>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    autoComplete="current-password" 
                    required 
                    className="h-10 transition duration-200 focus-visible:ring-primary"
                  />
                </div>
                
                {infoMessage ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs leading-relaxed text-emerald-600 font-medium">
                    {infoMessage}
                  </div>
                ) : null}
                
                {errorMessage ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive font-medium">
                    {errorMessage}
                  </div>
                ) : null}

                <Button className="w-full h-10 mt-2 font-semibold transition active:scale-[0.98]" type="submit">
                  Entrar no Painel
                </Button>
              </form>
              
              <div className="mt-6 border-t border-border/40 pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Ainda não possui uma conta?{" "}
                  <Link className="font-semibold text-primary hover:underline underline-offset-4" href="/cadastrar">
                    Cadastre-se gratuitamente
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mx-auto mt-8 text-center text-[10px] text-muted-foreground">
          <p>Conexão criptografada via SSL. Alfenus &copy; {new Date().getFullYear()}</p>
        </div>
      </section>
    </main>
  );
}
