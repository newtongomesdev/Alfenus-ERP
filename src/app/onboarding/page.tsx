import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createLawFirmAction } from "./actions";

const PROFILES = [
  { key: "individual", label: "Advogado(a) independente", icon: "\u{1F464}", description: "Trabalha sozinho, com poucos clientes, no início da carreira. Ativamos o modo simples automaticamente." },
  { key: "small", label: "Pequeno escritório", icon: "\u{1F3E2}", description: "Até 5 profissionais que buscam organização e produtividade." },
  { key: "team", label: "Equipe de advocacia", icon: "\u{1F465}", description: "Equipe de advogados e administrativos que precisam de colaboração." },
  { key: "department", label: "Departamento jurídico", icon: "\u{1F3DB}\uFE0F", description: "Departamento jurídico de empresa que gerencia processos internos e externos." },
] as const;

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-lg rounded-lg">
          <CardHeader>
            <CardTitle>Configure o Supabase</CardTitle>
            <CardDescription>
              Preencha <code>.env.local</code> para continuar com o onboarding.
            </CardDescription>
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Bem-vindo ao Alfenus
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Vamos criar seu escritório e personalizar a experiência. Selecione o perfil
            que melhor descreve sua realidade.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILES.map((profile) => (
            <Card key={profile.key} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-1 text-3xl">{profile.icon}</div>
                <CardTitle className="text-base">{profile.label}</CardTitle>
                <CardDescription className="text-xs">{profile.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createLawFirmAction}>
                  <input type="hidden" name="profile" value={profile.key} />
                  <input type="hidden" name="name" value={user.email?.split("@")[0] ?? "Meu escritório"} />
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/80"
                  >
                    Selecionar este perfil
                  </button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Você poderá alterar as configurações a qualquer momento depois do onboarding.
        </p>
      </div>
    </main>
  );
}
