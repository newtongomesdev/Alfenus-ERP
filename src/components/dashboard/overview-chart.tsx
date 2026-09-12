"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardChartPoint } from "@/lib/dashboard/types";
import { brlFormatter } from "@/lib/formatters";

const SERIES = [
  { key: "previsto", label: "Previsto", color: "#60a5fa" },
  { key: "recebido", label: "Recebido", color: "#34d399" },
  { key: "atrasado", label: "Atrasado", color: "#fb7185" },
] as const;

function formatAmount(value: number) {
  return brlFormatter.format(value / 100);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-lg border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => {
          const series = SERIES.find((entry) => entry.key === item.dataKey);
          if (!series) return null;
          return (
            <div key={series.key} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
              <strong>{formatAmount(Number(item.value ?? 0))}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OverviewChart({ data }: { data: DashboardChartPoint[] }) {
  const hasValues = data.some((point) => point.previsto > 0 || point.recebido > 0 || point.atrasado > 0);
  const totals = SERIES.map((series) => ({
    ...series,
    value: data.reduce((total, point) => total + point[series.key], 0),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {totals.map((series) => (
          <div key={series.key} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </div>
            <p className="mt-1 text-sm font-semibold tracking-tight">{formatAmount(series.value)}</p>
          </div>
        ))}
      </div>

      <div className="relative h-64 w-full">
        {!hasValues ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 text-center">
            <p className="text-sm font-medium">Sem movimentações financeiras ainda</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">Os valores previstos, recebidos e atrasados aparecerão aqui.</p>
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map((series) => (
                <linearGradient key={series.key} id={`dashboard-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="currentColor" className="text-border/60" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" width={58} tickFormatter={(value) => formatAmount(Number(value))} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.18 }} />
            {SERIES.map((series) => (
              <Area key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2.5} fill={`url(#dashboard-${series.key})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
