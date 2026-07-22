"use server";

import { getAdminContext } from "@/lib/admin/auth";

export type AdminDashboardData = {
  tenantsByMonth: Array<{ month: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
  weeklySignups: Array<{ week: string; count: number }>;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { adminClient } = await getAdminContext();

  const [firmsResult, authUsersResult] = await Promise.all([
    adminClient.from("law_firms").select("id, plan, created_at"),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (authUsersResult.error) {
    throw new Error(`Falha ao carregar dados: ${authUsersResult.error.message}`);
  }

  const firms = firmsResult.data ?? [];
  const users = authUsersResult.data.users;
  const now = new Date();

  // ── Novos escritórios por mês (últimos 12 meses) ──────────────────────
  const tenantsByMonth: Array<{ month: string; count: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = firms.filter((f) => f.created_at?.startsWith(monthKey)).length;
    tenantsByMonth.push({ month: monthKey, count });
  }

  // ── Escritórios por plano ─────────────────────────────────────────────
  const planCounts = new Map<string, number>();
  for (const f of firms) {
    const plan = f.plan ?? "starter";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }
  const planDistribution = [...planCounts.entries()]
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count);

  // ── Novos usuários por semana (últimas 8 semanas) ──────────────────────
  const weekCounts = new Map<string, number>();
  for (const u of users) {
    const created = new Date(u.created_at);
    // Get the Monday of the week
    const day = created.getDay();
    const diff = created.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(created);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toISOString().slice(0, 10);
    weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
  }

  // Get last 8 weeks
  const weeklySignups: Array<{ week: string; count: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toISOString().slice(0, 10);
    const label = `${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")}`;
    weeklySignups.push({ week: label, count: weekCounts.get(weekKey) ?? 0 });
  }

  return { tenantsByMonth, planDistribution, weeklySignups };
}
