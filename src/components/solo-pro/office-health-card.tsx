"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Progress indicator (simple div-based) to avoid missing component dependency
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
import type { OfficeHealthOverview } from "@/lib/solo-pro/types";
import { HEALTH_STATUS_CONFIG } from "@/lib/solo-pro/constants";
import { TrendingUp, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface OfficeHealthCardProps {
  health: OfficeHealthOverview;
}

const STATUS_ICONS = {
  organizado: TrendingUp,
  atencao: AlertTriangle,
  pendente: AlertCircle,
  critico: AlertCircle,
};

const STATUS_GRADIENTS = {
  organizado: "from-green-500 to-emerald-600",
  atencao: "from-yellow-500 to-amber-600",
  pendente: "from-orange-500 to-red-500",
  critico: "from-red-500 to-rose-600",
};

export function OfficeHealthCard({ health }: OfficeHealthCardProps) {
  const statusConfig = HEALTH_STATUS_CONFIG[health.status];
  const StatusIcon = STATUS_ICONS[health.status] ?? Info;
  const gradientClass = STATUS_GRADIENTS[health.status];

  const healthMetrics = [
    {
      label: "Casos ativos",
      value: health.casesActive,
      status: health.casesActive > 0 ? "normal" : "attention",
    },
    {
      label: "Prazos atrasados",
      value: health.deadlinesOverdue,
      status: health.deadlinesOverdue > 0 ? "critical" : "normal",
    },
    {
      label: "Tarefas pendentes",
      value: health.tasksPending,
      status: health.tasksPending > 15 ? "attention" : "normal",
    },
    {
      label: "Parcelas atrasadas",
      value: health.overdueAmount > 0 ? 1 : 0,
      status: health.overdueAmount > 0 ? "critical" : "normal",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${gradientClass} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
              <StatusIcon className="size-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Saúde do escritório</p>
              <p className="text-2xl font-bold text-white">{health.score}/100</p>
            </div>
          </div>
          <Badge variant="outline" className="text-white border-white/30 bg-white/10">
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <ProgressBar value={health.score} />

        <div className="grid grid-cols-2 gap-4 pt-2">
          {healthMetrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className={`text-lg font-semibold ${metric.status === "critical" ? "text-red-600" : metric.status === "attention" ? "text-yellow-600" : "text-foreground"}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recebido no mês</span>
            <span className="font-medium text-green-600">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                health.receivedMonth / 100
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Previsto no mês</span>
            <span className="font-medium">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                health.revenueMonth / 100
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Em atraso</span>
            <span className="font-medium text-red-600">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                health.overdueAmount / 100
              )}
            </span>
          </div>
        </div>

        {statusConfig.status !== "organizado" && (
          <div className="rounded-md bg-muted/50 p-3 pt-2">
            <p className="text-xs text-muted-foreground">{statusConfig.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}