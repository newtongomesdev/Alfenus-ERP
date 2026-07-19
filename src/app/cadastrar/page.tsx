import { ArrowLeft, CheckCircle2, LockKeyhole, Scale, Sparkles } from "lucide-react";
import Link from "next/link";

import { signUpAction } from "@/app/cadastrar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  ambiente: "Configure as variáveis do Supabase antes de criar uma conta.",
  validacao: "Revise seu nome, e-mail e senha. A senha deve ter pelo menos 8 caracteres.",
  cadastro: "Não foi possível criar sua conta. Por favor, verifique se o e-mail é válido e tente novamente.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.erro ? errorMessages[params.erro] : null;

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Premium Branding Panel */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-slate-50 via-white to-slate-200 text-slate-900 overflow-hidden">
        {/* Glow decorative element */}
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-slate-300/40 blur-3xl" />
        
        {/* Top Header/Brand */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Scale className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-950">Alfenus</span>
        </div>

        {/* Center: Pitch & Value proposition */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <Sparkles className="size-3" />
              <span>14 dias de teste gratuito</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
              Comece a transformar seu escritório hoje mesmo.
            </h1>
            <p className="text-base text-slate-700 leading-relaxed">
              Crie seu perfil operacional de forma simples e segura, e acesse ferramentas integradas feitas sob medida para a rotina da advocacia moderna.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-300">
            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Configuração rápida</p>
                <p className="mt-1 text-xs text-slate-600">Ative sua conta e configure sua equipe em poucos cliques.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <LockKeyhole className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Privacidade e conformidade</p>
                <p className="mt-1 text-xs text-slate-600">Infraestrutura em conformidade com as diretrizes de proteção de dados.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Subtitle/Quote */}
        <div className="relative z-10 border-t border-slate-300 pt-6">
          <p className="text-xs text-slate-600 italic leading-relaxed">
            Sem compromissos. Não solicitamos cartão de crédito para testar.
          </p>
        </div>
      </section>

      {/* Right side: Register Form */}
      <section className="flex flex-col justify-between p-6 sm:p-12 md:p-16 lg:p-24 bg-muted/20">
        {/* Back Link */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3.5" />
            Voltar para o site
          </Link>
          <Link
            href="/entrar"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
          >
            Entrar
          </Link>
        </div>

        {/* Card wrapper */}
        <div className="my-auto w-full max-w-md mx-auto">
          <Card className="border-border/40 shadow-xl shadow-foreground/5 bg-background">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Criar Conta</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Preencha os campos abaixo para iniciar o seu teste gratuito de 14 dias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signUpAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold">Nome completo</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    autoComplete="name" 
                    placeholder="Ex: Dra. Ana Paula Silva"
                    required 
                    className="h-10 transition duration-200 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">E-mail de trabalho</Label>
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
                  <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    autoComplete="new-password" 
                    minLength={8} 
                    required 
                    className="h-10 transition duration-200 focus-visible:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Sua senha deve conter pelo menos 8 caracteres.</p>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="privacyAccepted" required className="mt-0.5 size-4 rounded border-input" />
                  <span>Li e aceito a <Link href="/privacidade" className="font-medium text-primary underline">Política de Privacidade</Link> e autorizo o tratamento dos dados necessários para criar minha conta.</span>
                </label>
                
                {errorMessage ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive font-medium">
                    {errorMessage}
                  </div>
                ) : null}

                <Button className="w-full h-10 mt-2 font-semibold transition active:scale-[0.98]" type="submit">
                  Começar Teste Grátis
                </Button>
              </form>
              
              <div className="mt-6 border-t border-border/40 pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Já possui uma conta ativa?{" "}
                  <Link className="font-semibold text-primary hover:underline underline-offset-4" href="/entrar">
                    Acessar minha conta
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mx-auto mt-8 text-center text-[10px] text-muted-foreground">
          <p>Ao se cadastrar, você concorda com nossos Termos de Uso e Política de Privacidade. Alfenus &copy; {new Date().getFullYear()}</p>
        </div>
      </section>
    </main>
  );
}
