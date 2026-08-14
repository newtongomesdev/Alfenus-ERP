import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, ShieldCheck, LogIn } from "lucide-react";

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
import { EventLogFilters } from "./event-log-filters";

type AnyClient = { from(table: string): any };

const SECURITY_ACTIONS = [
  "sign_in",
  "sign_in_mfa",
  "sign_out",
  "mfa_challenge_success",
  "mfa_challenge_failure",
  "password_changed",
  "session_revoked",
  "admin_mfa_reset",
];

export default async function EventosSegurancaPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");
  if (
    context.member?.role !== "proprietario" &&
    context.member?.role !== "administrador"
  ) {
    redirect("/configuracoes/seguranca");
  }

  const adminClient = getSupabaseAdminClient() as unknown as AnyClient | null;

  let events: Array<{
    id: string;
    action: string;
    actorName: string;
    actorEmail: string;
    ipAddress: string | null;
    result: string;
    metadata: Record<string, any> | null;
    createdAt: string;
  }> = [];

  if (adminClient) {
    // Fetch security-related audit logs
    const { data: logs } = await adminClient
      .from("audit_logs")
      .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
      .eq("law_firm_id", context.lawFirm!.id)
      .in("action", SECURITY_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(100);

    if (logs && logs.length > 0) {
      // Collect unique actor IDs
      const actorIds = [...new Set(logs.map((l: any) => l.actor_id).filter(Boolean))];

      // Fetch actor info
      let actorMap = new Map<string, { name: string; email: string }>();
      if (actorIds.length > 0) {
        const { data: actors } = await adminClient
          .from("law_firm_members")
          .select("user_id, name, email")
          .in("user_id", actorIds);

        if (actors) {
          for (const a of actors) {
            actorMap.set(a.user_id, { name: a.name, email: a.email });
          }
        }
      }

      events = logs.map((log: any) => {
        const meta = log.metadata ?? {};
        const actor = actorMap.get(log.actor_id) ?? {
          name: "Desconhecido",
          email: "—",
        };

        // Determine result from action type
        let result = "info";
        if (log.action === "mfa_challenge_failure") {
          result = "falha";
        } else if (
          log.action === "sign_in" ||
          log.action === "sign_in_mfa" ||
          log.action === "mfa_challenge_success" ||
          log.action === "password_changed" ||
          log.action === "session_revoked" ||
          log.action === "admin_mfa_reset"
        ) {
          result = "sucesso";
        }

        return {
          id: log.id,
          action: log.action,
          actorName: actor.name,
          actorEmail: actor.email,
          ipAddress: meta.ip_address ?? meta.ip ?? null,
          result,
          metadata: meta,
          createdAt: log.created_at,
        };
      });
    }
  }

  // Compute summary stats
  const totalEvents = events.length;
  const failureCount = events.filter((e) => e.result === "falha").length;
  const recentCount = events.filter((e) => {
    const diff = Date.now() - new Date(e.createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos de Seguranca"
        description="Visualize o registro de auditoria de eventos de seguranca do escritorio."
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
              Total de Eventos
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Activity className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {totalEvents}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Eventos de seguranca registrados
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falhas
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <AlertTriangle className="size-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {failureCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tentativas falhas
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ultimas 24h
            </CardTitle>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {recentCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Eventos recentes
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Events Log */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Registro de Auditoria</CardTitle>
          <CardDescription className="mt-1">
            Eventos de autenticacao, MFA, sessoes e acoes administrativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventLogFilters events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
