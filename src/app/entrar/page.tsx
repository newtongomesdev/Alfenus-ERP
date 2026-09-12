import { ArrowLeft, Scale, ShieldCheck, Landmark } from "lucide-react";
import Link from "next/link";

import { sendMagicLinkAction, signInAction } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

const errorMessages: Record<string, string> = {
  ambiente: "Configure as variáveis do Supabase antes de entrar.",
  confirmacao: "O link de confirmação expirou ou já foi utilizado. Solicite um novo acesso.",
  credenciais: "E-mail ou senha incorretos. Por favor, tente novamente.",
  acesso: "Não foi possível verificar o acesso ao escritório. Tente novamente.",
  magic_email: "Informe seu e-mail para receber o link de acesso.",
  magic_link: "Não foi possível enviar o link de acesso. Verifique o e-mail e tente novamente.",
};

const infoMessages: Record<string, string> = {
  confirmacao: "Sua conta foi criada com sucesso! Verifique sua caixa de entrada para confirmar seu e-mail antes de acessar a plataforma.",
  magic_link: "Enviamos um link de acesso para seu e-mail. Verifique também a pasta de spam.",
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
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
              Sua operação jurídica segura e sem atritos.
            </h1>
            <p className="text-base text-slate-700 leading-relaxed">
              Gerencie leads, processos judiciais, prazos críticos e todo o fluxo financeiro do seu escritório em um ambiente isolado de alta performance.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-300">
            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Confidencialidade Garantida</p>
                <p className="mt-1 text-xs text-slate-600">Isolamento rigoroso de informações, garantindo total privacidade para os dados do seu escritório.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <Landmark className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Auditoria e Controle de Permissões</p>
                <p className="mt-1 text-xs text-slate-600">Gerencie perfis de acesso detalhados para advogados, sócios e administrativos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Subtitle/Quote */}
        <div className="relative z-10 border-t border-slate-300 pt-6">
          <p className="text-xs text-slate-600 italic leading-relaxed">
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
                  <PasswordInput 
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

              <div className="my-6 flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>ou entre sem senha</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form action={sendMagicLinkAction} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="magicEmail" className="text-xs font-semibold">E-mail para receber o link</Label>
                  <Input id="magicEmail" name="magicEmail" type="email" autoComplete="email" placeholder="exemplo@escritorio.com.br" required className="h-10" />
                </div>
                <Button variant="outline" className="h-10 w-full font-semibold" type="submit">Enviar link de acesso</Button>
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
