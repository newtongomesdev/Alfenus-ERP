"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  AlertOctagon,
  X,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { OperationalRecommendation } from "@/lib/solo-pro/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/solo-pro/constants";

const PRIORITY_ICONS = {
  informativa: Info,
  atencao: AlertTriangle,
  importante: AlertCircle,
  critica: AlertOctagon,
};

interface RecommendationCardProps {
  recommendation: OperationalRecommendation;
  onDismiss?: (id: string, reason?: string) => void;
  onComplete?: (id: string) => void;
  onOpen?: (recommendation: OperationalRecommendation) => void;
}

export function RecommendationCard({
  recommendation,
  onDismiss,
  onComplete,
  onOpen,
}: RecommendationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const Icon = PRIORITY_ICONS[recommendation.priority] ?? Info;
  const priorityLabel = PRIORITY_LABELS[recommendation.priority] ?? "Prioridade";

  function handleDismiss() {
    startTransition(async () => {
      if (onDismiss) {
        onDismiss(recommendation.id);
      }
    });
  }

  function handleComplete() {
    startTransition(async () => {
      if (onComplete) {
        onComplete(recommendation.id);
      }
    });
  }

  function handleOpen() {
    if (onOpen) {
      onOpen(recommendation);
    }
  }

  const badgeVariants: Record<string, string> = {
    informativa: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    atencao: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    importante: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critica: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const iconColorClass = {
    informativa: "text-blue-500",
    atencao: "text-yellow-500",
    importante: "text-orange-500",
    critica: "text-red-500",
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex-shrink-0 ${iconColorClass[recommendation.priority]}`}>
            <Icon className="size-5" />
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{recommendation.title}</h3>
              <Badge
                variant="outline"
                className={`text-xs font-medium ${badgeVariants[recommendation.priority]}`}
              >
                {priorityLabel}
              </Badge>
              {recommendation.status !== "ativa" && (
                <Badge variant="secondary" className="text-xs">
                  {STATUS_LABELS[recommendation.status] ?? recommendation.status}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {recommendation.description}
            </p>

            {recommendation.reason && (
              <p className="text-xs text-muted-foreground italic">
                <strong>Motivo:</strong> {recommendation.reason}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-shrink-0">
            {recommendation.action_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleOpen}
              >
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <Clock className="size-3.5 mr-1" />
            Adiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDismiss}
            disabled={isPending}
          >
            <X className="size-3.5 mr-1" />
            Dispensar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleComplete}
            disabled={isPending}
          >
            <CheckCircle2 className="size-3.5 mr-1" />
            Concluída
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}