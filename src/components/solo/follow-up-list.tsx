"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters";
import { FOLLOW_UP_TYPES, FOLLOW_UP_STATUSES } from "@/lib/solo/constants";
import { completeFollowUpAction } from "@/lib/solo/actions";
import { CheckCircle2, Clock, CalendarDays } from "lucide-react";

type FollowUp = {
  id: string;
  title: string;
  follow_up_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  priority: string;
  status: string;
  client_name?: string;
  case_title?: string;
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800",
    realizado: "bg-green-100 text-green-800",
    reagendado: "bg-blue-100 text-blue-800",
    cancelado: "bg-gray-100 text-gray-800",
    sem_resposta: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {FOLLOW_UP_STATUSES[status] ?? status}
    </span>
  );
}

export function FollowUpList({ followUps }: { followUps: FollowUp[] }) {
  const [completing, setCompleting] = useState<string | null>(null);

  async function handleComplete(id: string) {
    setCompleting(id);
    await completeFollowUpAction(id);
    setCompleting(null);
  }

  if (followUps.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhum retorno pendente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {followUps.map((fu) => (
        <Card key={fu.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{fu.title}</p>
                  {statusBadge(fu.status)}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(fu.scheduled_date)}
                    {fu.scheduled_time && ` às ${fu.scheduled_time}`}
                  </span>
                  {fu.client_name && <span>{fu.client_name}</span>}
                  <span>{FOLLOW_UP_TYPES[fu.follow_up_type] ?? fu.follow_up_type}</span>
                </div>
              </div>
              {fu.status === "pendente" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleComplete(fu.id)}
                  disabled={completing === fu.id}
                >
                  <CheckCircle2 className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
