import Link from "next/link";
import {
  Plus,
  Pencil,
  ArrowRightLeft,
  MessageSquare,
  FileText,
  DollarSign,
  Clock,
  CheckSquare,
  AtSign,
  Inbox,
} from "lucide-react";

import { TimelineBadge } from "@/components/timeline-badge";
import { Separator } from "@/components/ui/separator";

type ActivityEvent = {
  id: string;
  actorName: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type ActivityTimelineProps = {
  events: ActivityEvent[];
  emptyMessage?: string;
};

const iconByEventType: Record<string, React.ElementType> = {
  created: Plus,
  updated: Pencil,
  status_changed: ArrowRightLeft,
  comment: MessageSquare,
  document: FileText,
  payment: DollarSign,
  deadline: Clock,
  task: CheckSquare,
  mention: AtSign,
};

const entityPathMap: Record<string, string> = {
  client: "/clientes",
  lead: "/leads",
  legal_case: "/processos",
  contract: "/contratos",
  installment: "/contratos",
  payment: "/contratos",
  task: "/tarefas",
  deadline: "/prazos",
  document: "/documentos",
  expense: "/despesas",
  time_entry: "/horas",
  workflow: "/workflows",
};

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora";
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? "s" : ""}`;
  if (diffHour < 24) return `há ${diffHour} hora${diffHour > 1 ? "s" : ""}`;
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `${diffDay} dias atrás`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} semana${weeks > 1 ? "s" : ""} atrás`;
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function buildEntityHref(entityType: string, entityId: string): string | null {
  const basePath = entityPathMap[entityType];
  if (!basePath) return null;
  return `${basePath}/${entityId}`;
}

export function ActivityTimeline({
  events,
  emptyMessage = "Nenhuma atividade registrada.",
}: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Inbox className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const Icon = iconByEventType[event.eventType] ?? Plus;
        const entityHref = buildEntityHref(event.entityType, event.entityId);

        return (
          <div key={event.id}>
            <div className="flex gap-3 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TimelineBadge eventType={event.eventType} />
                  {event.actorName ? (
                    <span className="text-sm font-medium">{event.actorName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sistema</span>
                  )}
                </div>

                {event.description ? (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {entityHref && event.entityTitle ? (
                    <Link
                      href={entityHref}
                      className="truncate font-medium underline-offset-4 hover:underline"
                    >
                      {event.entityTitle}
                    </Link>
                  ) : event.entityTitle ? (
                    <span className="truncate font-medium">{event.entityTitle}</span>
                  ) : null}

                  <span>·</span>
                  <time dateTime={event.createdAt}>{getRelativeTime(event.createdAt)}</time>
                </div>
              </div>
            </div>

            {index < events.length - 1 ? <Separator /> : null}
          </div>
        );
      })}
    </div>
  );
}
