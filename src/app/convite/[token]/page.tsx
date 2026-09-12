import Link from "next/link";
import { CheckCircle2, Clock, Mail, Shield, XCircle } from "lucide-react";

import { acceptInvitationAction } from "@/app/convite/[token]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const roleLabels: Record<string, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  advogado: "Advogado",
  assistente: "Assistente",
  financeiro: "Financeiro",
  colaborador: "Colaborador",
  visualizador: "Visualizador",
};

const errorMessages: Record<string, { title: string; description: string }> = {
  invalido: {
    title: "Convite não encontrado",
    description: "Este convite não existe ou já foi utilizado.",
  },
  expirado: {
    title: "Convite expirado",
    description: "Este convite expirou. Solicite um novo convite ao administrador do escritório.",
  },
  email: {
    title: "E-mail não corresponde",
    description: "O e-mail da sua conta não corresponde ao e-mail do convite. Faça login com o e-mail correto.",
  },
  membro: {
    title: "Erro ao aceitar",
    description: "Não foi possível adicioná-lo ao escritório. Tente novamente ou entre em contato com o suporte.",
  },
  ambiente: {
    title: "Configuração necessária",
    description: "O Supabase não está configurado. Entre em contato com o administrador.",
  },
};

type Invitation = {
  id: string;
  law_firm_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const context = await getAppContext();

  // Buscar convite
  const supabase = await getSupabaseServerClient();

  let invitation: Invitation | null = null;
  let firmName = "Escritório";

  if (supabase) {
    const { data } = await (supabase as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null }> } } } })
      .from("team_invitations")
      .select("id, law_firm_id, email, role, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (data) {
      invitation = data as Invitation;

      const { data: firm } = await (supabase as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown | null }> } } } })
        .from("law_firms")
        .select("name")
        .eq("id", invitation.law_firm_id)
        .maybeSingle();

      if (firm) {
        firmName = (firm as { name: string }).name;
      }
    }
  }

  // Erro explícito via query param
  if (erro && errorMessages[erro]) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader className="text-center">
            <XCircle className="mx-auto size-12 text-destructive/60" />
            <CardTitle className="mt-3">{errorMessages[erro].title}</CardTitle>
            <CardDescription>{errorMessages[erro].description}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Ir para o Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Convite não encontrado
  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader className="text-center">
            <XCircle className="mx-auto size-12 text-destructive/60" />
            <CardTitle className="mt-3">Convite não encontrado</CardTitle>
            <CardDescription>Este link de convite não é válido.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Ir para o Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Convite já aceito
  if (invitation.status === "aceito") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-[var(--chart-2)]" />
            <CardTitle className="mt-3">Convite já aceito</CardTitle>
            <CardDescription>Este convite já foi aceito anteriormente.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Ir para o Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Convite expirado
  const isExpired = new Date(invitation.expires_at) < new Date();
  if (isExpired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader className="text-center">
            <Clock className="mx-auto size-12 text-muted-foreground/60" />
            <CardTitle className="mt-3">Convite expirado</CardTitle>
            <CardDescription>Este convite expirou. Solicite um novo ao administrador do escritório.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline">Ir para o Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const roleLabel = roleLabels[invitation.role] ?? invitation.role;

  // Usuário não autenticado
  if (context.status !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader className="text-center">
            <Mail className="mx-auto size-12 text-primary/60" />
            <CardTitle className="mt-3">Convite para {firmName}</CardTitle>
            <CardDescription>
              Você foi convidado para participar como <strong>{roleLabel}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Convidado como</p>
              <p className="font-medium">{invitation.email}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Para aceitar o convite, faça login ou crie uma conta com este e-mail.
            </p>
            <div className="grid gap-2">
              <Link href="/entrar" className="w-full">
                <Button className="w-full">Entrar e aceitar</Button>
              </Link>
              <Link href="/cadastrar" className="w-full">
                <Button variant="outline" className="w-full">Criar conta</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Usuário autenticado — mostrar formulário de aceite
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <Shield className="mx-auto size-12 text-primary/60" />
          <CardTitle className="mt-3">Convite para {firmName}</CardTitle>
          <CardDescription>
            Você foi convidado para participar como <strong>{roleLabel}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Convidado como</p>
            <p className="font-medium">{invitation.email}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Seu papel</p>
                <p className="font-medium">{roleLabel}</p>
              </div>
            </div>
          </div>
          <form action={acceptInvitationAction.bind(null, token)}>
            <Button type="submit" className="w-full">
              Aceitar convite e entrar
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Ao aceitar, você terá acesso ao escritório <strong>{firmName}</strong> no Alfenus.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
