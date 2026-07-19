"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardChartPoint } from "@/lib/dashboard/types";
import { brlFormatter } from "@/lib/formatters";

export function OverviewChart({ data }: { data: DashboardChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => brlFormatter.format(Number(value) / 100)} />
          <Tooltip formatter={(value) => brlFormatter.format(Number(value) / 100)} contentStyle={{ borderRadius: 8 }} />
          <Bar dataKey="previsto" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Previsto" />
          <Bar dataKey="recebido" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="Recebido" />
          <Bar dataKey="atrasado" fill="var(--chart-3)" radius={[4, 4, 0, 0]} name="Atrasado" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
