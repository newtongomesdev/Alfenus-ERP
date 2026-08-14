"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, FileText, DollarSign, Target, AlertTriangle } from "lucide-react";
import { formatCurrencyFromCents } from "@/lib/formatters";

type SoloMetrics = {
  newContacts: number;
  consultationsDone: number;
  proposalsSent: number;
  contractsClosed: number;
  conversionRate: number;
  contractedRevenue: number;
  receivedRevenue: number;
  averageTicket: number;
  clientsWithoutFollowUp: number;
  overdueTasks: number;
  pendingDocuments: number;
  upcomingDeadlines: number;
};

export function SoloReports({ metrics }: { metrics: SoloMetrics }) {
  return (
    <div className="space-y-6">
      {/* Indicadores comerciais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" />
            Indicadores comerciais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <MetricBox icon={<Users className="size-4 text-blue-500" />} label="Novos contatos" value={metrics.newContacts} />
            <MetricBox icon={<FileText className="size-4 text-purple-500" />} label="Propostas enviadas" value={metrics.proposalsSent} />
            <MetricBox icon={<Target className="size-4 text-green-500" />} label="Contratos fechados" value={metrics.contractsClosed} />
            <MetricBox icon={<TrendingUp className="size-4 text-emerald-500" />} label="Taxa de conversão" value={`${metrics.conversionRate}%`} />
            <MetricBox icon={<DollarSign className="size-4 text-green-600" />} label="Receita contratada" value={formatCurrencyFromCents(metrics.contractedRevenue)} isText />
            <MetricBox icon={<DollarSign className="size-4 text-green-500" />} label="Receita recebida" value={formatCurrencyFromCents(metrics.receivedRevenue)} isText />
            <MetricBox icon={<DollarSign className="size-4 text-blue-500" />} label="Ticket médio" value={formatCurrencyFromCents(metrics.averageTicket)} isText />
            <MetricBox icon={<FileText className="size-4 text-purple-500" />} label="Consultas realizadas" value={metrics.consultationsDone} />
          </div>
        </CardContent>
      </Card>

      {/* Indicadores de organização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Indicadores de organização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <MetricBox
              icon={<Users className="size-4 text-orange-500" />}
              label="Clientes sem retorno"
              value={metrics.clientsWithoutFollowUp}
              accent={metrics.clientsWithoutFollowUp > 0}
            />
            <MetricBox
              icon={<AlertTriangle className="size-4 text-red-500" />}
              label="Tarefas atrasadas"
              value={metrics.overdueTasks}
              accent={metrics.overdueTasks > 0}
            />
            <MetricBox
              icon={<FileText className="size-4 text-yellow-500" />}
              label="Documentos pendentes"
              value={metrics.pendingDocuments}
              accent={metrics.pendingDocuments > 0}
            />
            <MetricBox
              icon={<AlertTriangle className="size-4 text-purple-500" />}
              label="Prazos próximos"
              value={metrics.upcomingDeadlines}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({
  icon,
  label,
  value,
  isText,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isText?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-red-200 dark:border-red-800" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`font-semibold ${isText ? "text-sm" : "text-xl"}`}>{value}</p>
    </div>
  );
}
