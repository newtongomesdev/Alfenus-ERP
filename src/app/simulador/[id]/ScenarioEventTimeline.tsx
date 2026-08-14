"use client";

import { PRICING_EVENT_TYPE_CONFIG } from "@/lib/pricing/constants";
import type { PricingScenarioEventRow } from "@/lib/pricing/types";

interface ScenarioEventTimelineProps {
  events: PricingScenarioEventRow[];
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function getEventLabel(eventType: string): string {
  const config = PRICING_EVENT_TYPE_CONFIG.find((c) => c.value === eventType);
  return config?.label ?? eventType;
}

function getEventCategoryColor(category: string): string {
  switch (category) {
    case "cenario":
      return "bg-blue-500";
    case "versao":
      return "bg-emerald-500";
    case "memoria":
      return "bg-violet-500";
    case "conversao":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

export function ScenarioEventTimeline({
  events,
}: ScenarioEventTimelineProps) {
  if (events.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Histórico</h2>
        <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-medium">Histórico</h2>
      <ul className="space-y-3">
        {events.map((e) => {
          const config = PRICING_EVENT_TYPE_CONFIG.find((c) => c.value === e.event_type);
          const dotColor = config
            ? getEventCategoryColor(config.category)
            : "bg-muted-foreground/40";
          return (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
              />
              <div className="flex-1">
                <span className="font-medium">{getEventLabel(e.event_type)}</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDateTime(e.created_at)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
