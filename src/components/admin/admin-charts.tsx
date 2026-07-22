"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie,
  LineChart, Line,
  ResponsiveContainer, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData, type AdminDashboardData } from "@/app/admin/dashboard-actions";

// ── Cores ─────────────────────────────────────────────────────────────────
const BAR_GRADIENTS = [
  { from: "#34d399", to: "#059669" },
  { from: "#60a5fa", to: "#2563eb" },
  { from: "#a78bfa", to: "#7c3aed" },
  { from: "#fbbf24", to: "#d97706" },
  { from: "#fb7185", to: "#e11d48" },
  { from: "#34d399", to: "#059669" },
  { from: "#60a5fa", to: "#2563eb" },
  { from: "#a78bfa", to: "#7c3aed" },
  { from: "#fbbf24", to: "#d97706" },
  { from: "#fb7185", to: "#e11d48" },
  { from: "#2dd4bf", to: "#0d9488" },
  { from: "#818cf8", to: "#4f46e5" },
];

const PLAN_COLORS: Record<string, string> = {
  starter: "#34d399",
  professional: "#60a5fa",
  business: "#a78bfa",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

// ── Tooltips ──────────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} escritório{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: { plan?: string } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="min-w-36 rounded-lg border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{PLAN_LABELS[item.payload?.plan ?? ""] ?? item.name}</p>
      <p className="text-sm font-semibold">{item.value} escritório{item.value !== 1 ? "s" : ""}</p>
    </div>
  );
}

function LineTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-medium text-muted-foreground">Semana de {label}</p>
      <p className="text-sm font-semibold">{payload[0].value} usuário{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export function AdminCharts() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const result = await getAdminDashboardData();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar dados");
          setLoading(false);
        }
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-lg">
            <CardContent className="flex h-72 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-lg">
        <CardContent className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">{error ?? "Sem dados disponíveis"}</p>
        </CardContent>
      </Card>
    );
  }

  // Preparar dados do bar chart com labels legíveis
  const barData = data.tenantsByMonth.map((item) => ({
    ...item,
    label: `${MONTH_LABELS[item.month.slice(5)] ?? item.month.slice(5)}/${item.month.slice(2, 4)}`,
  }));

  // Preparar dados do pie chart com labels
  const pieData = data.planDistribution.map((item) => ({
    ...item,
    name: PLAN_LABELS[item.plan] ?? item.plan,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Bar Chart: Novos escritórios por mês ────────────────────── */}
      <Card className="rounded-lg lg:col-span-2">
        <CardHeader>
          <CardTitle>Novos escritórios por mês</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  {barData.map((_, index) => (
                    <linearGradient key={`bar-grad-${index}`} id={`bar-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BAR_GRADIENTS[index % BAR_GRADIENTS.length].from} stopOpacity={1} />
                      <stop offset="100%" stopColor={BAR_GRADIENTS[index % BAR_GRADIENTS.length].to} stopOpacity={0.85} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="currentColor" className="text-border/60" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground"
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground"
                  width={36}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {barData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#bar-grad-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Pie Chart: Escritórios por plano ────────────────────────── */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Escritórios por plano</CardTitle>
          <CardDescription>Distribuição atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados de planos</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Line Chart: Novos usuários por semana ───────────────────── */}
      <Card className="rounded-lg lg:col-span-3">
        <CardHeader>
          <CardTitle>Novos usuários por semana</CardTitle>
          <CardDescription>Últimas 8 semanas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklySignups} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" className="text-border/60" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground"
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground"
                  width={36}
                />
                <Tooltip content={<LineTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.18 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#line-grad)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--card)", strokeWidth: 2, stroke: "#34d399" }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: "var(--card)", stroke: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
