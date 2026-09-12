import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationPreferences } from "@/components/notification-preferences";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const NOTIFICATION_TYPES = [
  { type: "deadline_reminder", label: "Lembrete de prazo", description: "Receber alerta antes de um prazo vencer" },
  { type: "deadline_overdue", label: "Prazo vencido", description: "Alerta quando um prazo passar da data" },
  { type: "task_assigned", label: "Tarefa atribuída", description: "Notificação quando uma tarefa for atribuída a você" },
  { type: "task_overdue", label: "Tarefa atrasada", description: "Alerta quando uma tarefa estiver atrasada" },
  { type: "payment_received", label: "Pagamento recebido", description: "Notificação ao registrar um pagamento" },
  { type: "payment_overdue", label: "Pagamento atrasado", description: "Alerta quando uma parcela estiver em atraso" },
  { type: "document_received", label: "Documento recebido", description: "Notificação quando um documento for enviado" },
  { type: "mention", label: "Menção", description: "Notificação quando alguém te mencionar em um comentário" },
  { type: "workflow_update", label: "Atualização de workflow", description: "Notificação sobre mudanças em workflows" },
  { type: "client_portal_access", label: "Acesso do portal do cliente", description: "Alerta quando um cliente acessar o portal" },
];

export default async function NotificationPreferencesPage() {
  const context = await getAppContext();
  const supabase = await getSupabaseServerClient();

  if (context.status !== "ready" || !context.member || !supabase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/notificacoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
        <PageHeader
          title="Preferências de Notificação"
          description="Configure quais notificações você deseja receber."
        />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {context.status === "missing-env"
              ? "Configure o Supabase no .env.local para carregar preferências."
              : (
                <Link
                  className="underline"
                  href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}
                >
                  {context.status === "missing-tenant" ? "Criar escritório" : "Entrar"}
                </Link>
              )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { member } = context;

  // Fetch current preferences
  type NotificationPrefRow = { notification_type: string; enabled: boolean };
  const { data: rawPrefs } = await supabase
    .from("notification_preferences")
    .select("notification_type, enabled")
    .eq("member_id", member.id);
  const prefs = (rawPrefs ?? []) as NotificationPrefRow[];

  // Merge with all types (default enabled if no preference exists)
  const preferences = NOTIFICATION_TYPES.map((nt) => {
    const existing = (prefs ?? []).find((p) => p.notification_type === nt.type);
    return {
      notificationType: nt.type,
      label: nt.label,
      description: nt.description,
      enabled: existing?.enabled ?? true,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/notificacoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>

      <PageHeader
        title="Preferências de Notificação"
        description="Configure quais notificações você deseja receber."
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Tipos de notificação</CardTitle>
          <CardDescription>Ative ou desative cada tipo de notificação individualmente.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferences
            lawFirmId={member.lawFirmId}
            memberId={member.id}
            preferences={preferences}
          />
        </CardContent>
      </Card>
    </div>
  );
}
