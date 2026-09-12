import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAdminContext } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  aguardando_cliente: "Aguardando cliente",
  aguardando_suporte: "Aguardando suporte",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const STATUS_CLASSES: Record<string, string> = {
  aberto: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
  aguardando_cliente: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  aguardando_suporte: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  em_analise: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  resolvido: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  fechado: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
  cancelado: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_CLASSES: Record<string, string> = {
  baixa: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
  normal: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  alta: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  urgente: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  ticket_criado: "Ticket criado",
  ticket_atribuido: "Ticket atribuído",
  status_alterado: "Status alterado",
  prioridade_alterada: "Prioridade alterada",
  categoria_alterada: "Categoria alterada",
  mensagem_adicionada: "Mensagem adicionada",
  ticket_resolvido: "Ticket resolvido",
  ticket_fechado: "Ticket fechado",
  ticket_reaberto: "Ticket reaberto",
  observacao_interna: "Observação interna",
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  let ticket: any = null;

  try {
    // Buscar ticket com dados relacionados
    const result = await (adminClient as any)
      .from("support_tickets")
      .select(
        "*, category:support_categories(id, name), law_firm:law_firms(id, name, slug), assigned_operator:law_firm_members!support_tickets_assigned_to_fkey(id, name, email), requester:law_firm_members!support_tickets_requester_id_fkey(id, name, email)",
      )
      .eq("id", id)
      .single();

    if (result.error) throw result.error;
    ticket = result.data;
  } catch {
    redirect("/admin/suporte/tickets");
  }

  if (!ticket) {
    redirect("/admin/suporte/tickets");
  }

  // Buscar mensagens do ticket
  let messages: any[] = [];
  try {
    const { data: messagesData } = await (adminClient as any)
      .from("support_messages")
      .select("*, sender:law_firm_members!support_messages_sender_id_fkey(id, name, email)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    messages = (messagesData ?? []) as any[];
  } catch {
    messages = [];
  }

  // Buscar eventos do ticket
  let events: any[] = [];
  try {
    const { data: eventsData } = await (adminClient as any)
      .from("support_events")
      .select("*, actor:law_firm_members!support_events_actor_id_fkey(id, name, email)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    events = (eventsData ?? []) as any[];
  } catch {
    events = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/suporte/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PageHeader
          title={`Ticket ${ticket.protocol}`}
          description={ticket.subject}
        />
        <Badge
          variant="outline"
          className={STATUS_CLASSES[ticket.status] ?? ""}
        >
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
        <Badge
          variant="outline"
          className={PRIORITY_CLASSES[ticket.priority] ?? ""}
        >
          {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
        </Badge>
      </div>

      {/* Informações do Ticket */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Informações do Ticket</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Tenant</p>
            <p className="mt-1 font-medium">
              {ticket.law_firm?.name ?? "—"}
            </p>
            {ticket.law_firm?.slug && (
              <p className="text-xs text-muted-foreground">
                {ticket.law_firm.slug}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoria</p>
            <p className="mt-1 font-medium">
              {ticket.category?.name ? (
                <Badge variant="outline">{ticket.category.name}</Badge>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Solicitante</p>
            <p className="mt-1 font-medium">
              {ticket.requester?.name ?? "—"}
            </p>
            {ticket.requester?.email && (
              <p className="text-xs text-muted-foreground">
                {ticket.requester.email}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Operador responsável
            </p>
            <p className="mt-1 font-medium">
              {ticket.assigned_operator?.name ?? "Não atribuído"}
            </p>
            {ticket.assigned_operator?.email && (
              <p className="text-xs text-muted-foreground">
                {ticket.assigned_operator.email}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Criado em</p>
            <p className="mt-1">{formatDateTime(ticket.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Última atualização
            </p>
            <p className="mt-1">
              {ticket.updated_at
                ? formatDateTime(ticket.updated_at)
                : formatDateTime(ticket.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Thread de Mensagens */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Mensagens</CardTitle>
          <CardDescription>
            {messages.length} mensagem(ns) na conversa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma mensagem registrada.
            </p>
          ) : (
            messages.map((msg: any) => (
              <div
                key={msg.id}
                className="rounded-lg border p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {msg.sender?.name ?? msg.sender_type ?? "Sistema"}
                    </span>
                    {msg.sender_type === "operator" && (
                      <Badge variant="secondary" className="text-xs">
                        Operador
                      </Badge>
                    )}
                    {msg.sender_type === "client" && (
                      <Badge variant="outline" className="text-xs">
                        Cliente
                      </Badge>
                    )}
                    {msg.sender_type === "system" && (
                      <Badge variant="outline" className="text-xs">
                        Sistema
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.is_internal && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    Nota interna — visível apenas para o suporte.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Timeline de Eventos */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
          <CardDescription>
            {events.length} evento(s) registrado(s).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum evento registrado.
            </p>
          ) : (
            <div className="relative ml-3 border-l-2 border-muted pl-6">
              {events.map((event: any) => (
                <div key={event.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-muted bg-background" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    por {event.actor?.name ?? event.actor_type ?? "Sistema"}
                  </p>
                  {event.metadata &&
                    typeof event.metadata === "object" &&
                    Object.keys(event.metadata).length > 0 && (
                      <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                        {JSON.stringify(event.metadata)}
                      </p>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
