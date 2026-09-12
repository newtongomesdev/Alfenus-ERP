import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ShieldCheck, ShieldOff } from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserSecurityTable } from "./user-security-table";

type AnyClient = { from(table: string): any };

export default async function UsuariosSegurancaPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");
  if (
    context.member?.role !== "proprietario" &&
    context.member?.role !== "administrador"
  ) {
    redirect("/configuracoes/seguranca");
  }

  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;

  let members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    mfaEnabled: boolean;
  }> = [];

  if (adminClient) {
    // Fetch all members for this law firm
    const { data: memberRows } = await adminClient
      .from("law_firm_members")
      .select("id, user_id, name, email, role")
      .eq("law_firm_id", context.lawFirm!.id)
      .eq("status", "ativo")
      .order("name", { ascending: true });

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map((m: any) => m.user_id);

      // Fetch MFA enrollments for all users in one query
      const { data: enrollments } = await adminClient
        .from("mfa_enrollments")
        .select("user_id, verified, enabled")
        .eq("law_firm_id", context.lawFirm!.id)
        .in("user_id", userIds);

      // Build a map of userId -> hasVerifiedMfa
      const mfaMap = new Map<string, boolean>();
      for (const row of memberRows) {
        mfaMap.set(row.user_id, false);
      }
      if (enrollments) {
        for (const e of enrollments) {
          if (e.verified && e.enabled) {
            mfaMap.set(e.user_id, true);
          }
        }
      }

      members = memberRows.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        mfaEnabled: mfaMap.get(m.user_id) ?? false,
      }));
    }
  }

  const totalUsers = members.length;
  const withMfa = members.filter((m) => m.mfaEnabled).length;
  const withoutMfa = totalUsers - withMfa;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguranca dos Usuarios"
        description="Visualize e gerencie o status de MFA de todos os membros do escritorio."
      />

      <div className="text-sm">
        <Link
          href="/configuracoes/seguranca"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar a seguranca
        </Link>
      </div>

      {/* Summary Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usuarios
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Users className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{totalUsers}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalUsers === 1 ? "membro ativo" : "membros ativos"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com MFA
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{withMfa}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalUsers > 0
                ? `${Math.round((withMfa / totalUsers) * 100)}% do total`
                : "nenhum"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sem MFA
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShieldOff className="size-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">{withoutMfa}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalUsers > 0
                ? `${Math.round((withoutMfa / totalUsers) * 100)}% do total`
                : "nenhum"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Users Table */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Usuarios e Status MFA</CardTitle>
          <CardDescription className="mt-1">
            Lista de todos os membros ativos com seu status de autenticacao
            multifator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserSecurityTable
            members={members}
            currentUserId={context.member!.userId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
