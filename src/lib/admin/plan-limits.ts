import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Admin client not available");
  return client;
}

export type PlanLimit = {
  id: string;
  planId: string;
  limitKey: string;
  limitValue: number;
  createdAt: string;
  updatedAt: string;
};

export async function getPlanLimits(planId?: string): Promise<PlanLimit[]> {
  let query = getAdminClient().from("plan_limits").select("*").order("plan_id");

  if (planId) {
    query = query.eq("plan_id", planId);
  }

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    limitKey: row.limit_key,
    limitValue: row.limit_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getLimitsForPlan(planId: string): Promise<Record<string, number>> {
  const limits = await getPlanLimits(planId);
  const result: Record<string, number> = {};
  for (const limit of limits) {
    result[limit.limitKey] = limit.limitValue;
  }
  return result;
}

export async function checkPlanLimit(
  lawFirmId: string,
  limitKey: string,
  currentValue: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  // Get firm's plan
  const { data: firm } = await getAdminClient()
    .from("law_firms")
    .select("plan")
    .eq("id", lawFirmId)
    .maybeSingle();

  if (!firm) return { allowed: false, limit: 0, current: currentValue };

  const planId = firm.plan;
  const limits = await getLimitsForPlan(planId);
  const limit = limits[limitKey] ?? -1; // -1 = unlimited

  // -1 means unlimited
  if (limit === -1) return { allowed: true, limit: -1, current: currentValue };

  return {
    allowed: currentValue < limit,
    limit,
    current: currentValue,
  };
}

export async function upsertPlanLimit(
  planId: string,
  limitKey: string,
  limitValue: number
): Promise<void> {
  const { error } = await getAdminClient()
    .from("plan_limits")
    .upsert({
      plan_id: planId,
      limit_key: limitKey,
      limit_value: limitValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: "plan_id,limit_key" });

  if (error) throw error;
}

export async function deletePlanLimit(planId: string, limitKey: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("plan_limits")
    .delete()
    .eq("plan_id", planId)
    .eq("limit_key", limitKey);

  if (error) throw error;
}
