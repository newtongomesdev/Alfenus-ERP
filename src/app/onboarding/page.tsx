import { redirect } from "next/navigation";

import { createLawFirmAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  ambiente: "Configure as variáveis do Supabase antes de criar o escritório.",
  validacao: "Revise os dados do escritório. O identificador deve conter letras, números ou hífens.",
  criacao: "Não foi possível criar o escritório. Verifique se o identificador já está em uso.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const params = await searchParams;

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-lg rounded-lg">
          <CardHeader>
            <CardTitle>Configure o Supabase</CardTitle>
            <CardDescription>Preencha `.env.local` para criar o escritório proprietário.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: existingMember } = await supabase
    .from("law_firm_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (existingMember) {
    redirect("/dashboard");
  }

  const errorMessage = params.erro ? errorMessages[params.erro] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-2xl rounded-lg">
        <CardHeader>
          <CardTitle>Configure seu escritório</CardTitle>
          <CardDescription>Este será o primeiro tenant do Alfenus. Seu usuário entrará como proprietário.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createLawFirmAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome do escritório</Label>
              <Input id="name" name="name" placeholder="Almeida & Ferraz Advocacia" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador</Label>
              <Input id="slug" name="slug" placeholder="almeida-ferraz" />
              <p className="text-xs text-muted-foreground">Usado internamente para organizar o tenant.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">CPF ou CNPJ</Label>
              <Input id="document" name="document" placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do escritório</Label>
              <Input id="email" name="email" type="email" placeholder="contato@escritorio.com.br" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
            </div>
            {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}
            <div className="sm:col-span-2">
              <Button type="submit">Criar escritório</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
