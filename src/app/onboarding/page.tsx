import { redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROFILE_LABELS,
  PROFILE_DESCRIPTIONS,
  type OnboardingProfile,
} from "@/lib/onboarding/constants";

const PROFILES: OnboardingProfile[] = [
  "individual",
  "small",
  "team",
  "department",
];

const PROFILE_ICONS: Record<OnboardingProfile, string> = {
  individual: "\u{1F464}",
  small: "\u{1F3E2}",
  team: "\u{1F465}",
  department: "\u{1F3DB}\uFE0F",
};

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
        {/* Cabeçalho */}
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Bem-vindo ao Alfenus
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Vamos personalizar sua experiência. Selecione o perfil que melhor
            descreve sua realidade para configurarmos o sistema de forma
            otimizada.
          </p>
        </div>

        {/* Seleção de perfil */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILES.map((profile) => (
            <Card
              key={profile}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-1 text-3xl">{PROFILE_ICONS[profile]}</div>
                <CardTitle>{PROFILE_LABELS[profile]}</CardTitle>
                <CardDescription>{PROFILE_DESCRIPTIONS[profile]}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/onboarding/${profile}`}
                  className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/80"
                >
                  Selecionar este perfil
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Nota de rodapé */}
        <p className="text-center text-xs text-muted-foreground">
          Você poderá alterar as configurações a qualquer momento depois do
          onboarding.
        </p>
      </div>
    </main>
  );
}
