import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getLimitsForPlan } from "@/lib/admin/plan-limits";

export type PlanFeatures = {
  maxMembers: number;
  maxClients: number;
  maxDocumentsStorageMb: number;
  maxContracts: number;
  maxCases: number;
  hasAiFeatures: boolean;
  hasPwa: boolean;
  hasLgpd: boolean;
  hasClm: boolean;
  hasRiskManagement: boolean;
  hasLegalRequests: boolean;
  hasPublicForms: boolean;
  hasPdfTools: boolean;
  hasTicketing: boolean;
};

export const DEFAULT_PLAN_FEATURES: Record<string, Partial<PlanFeatures>> = {
  starter: {
    maxMembers: 5,
    maxClients: 50,
    maxDocumentsStorageMb: 500,
    maxContracts: 100,
    maxCases: 100,
    hasAiFeatures: false,
    hasPwa: false,
    hasLgpd: false,
    hasClm: false,
    hasRiskManagement: false,
    hasLegalRequests: false,
    hasPublicForms: false,
    hasPdfTools: true,
    hasTicketing: false,
  },
  professional: {
    maxMembers: 15,
    maxClients: 500,
    maxDocumentsStorageMb: 5000,
    maxContracts: -1,
    maxCases: -1,
    hasAiFeatures: true,
    hasPwa: true,
    hasLgpd: true,
    hasClm: true,
    hasRiskManagement: true,
    hasLegalRequests: true,
    hasPublicForms: true,
    hasPdfTools: true,
    hasTicketing: false,
  },
  business: {
    maxMembers: -1,
    maxClients: -1,
    maxDocumentsStorageMb: -1,
    maxContracts: -1,
    maxCases: -1,
    hasAiFeatures: true,
    hasPwa: true,
    hasLgpd: true,
    hasClm: true,
    hasRiskManagement: true,
    hasLegalRequests: true,
    hasPublicForms: true,
    hasPdfTools: true,
    hasTicketing: true,
  },
};

export async function getPlanFeatures(lawFirmId: string): Promise<PlanFeatures> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return DEFAULT_PLAN_FEATURES.starter as PlanFeatures;

  const { data: firm } = await supabase
    .from("law_firms")
    .select("plan")
    .eq("id", lawFirmId)
    .single();

  const plan = firm?.plan ?? "starter";
  const defaults = DEFAULT_PLAN_FEATURES[plan] ?? DEFAULT_PLAN_FEATURES.starter;
  const planLimits = await getLimitsForPlan(plan);

  return {
    ...defaults,
    maxMembers: planLimits.max_members ?? (defaults as PlanFeatures).maxMembers ?? 5,
    maxClients: planLimits.max_clients ?? (defaults as PlanFeatures).maxClients ?? 50,
    maxDocumentsStorageMb: planLimits.max_documents_storage_mb ?? (defaults as PlanFeatures).maxDocumentsStorageMb ?? 500,
    maxContracts: planLimits.max_contracts ?? (defaults as PlanFeatures).maxContracts ?? 100,
  } as PlanFeatures;
}

export async function hasFeature(lawFirmId: string, featureKey: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("id, enabled_by_default")
    .eq("key", featureKey)
    .single();

  if (!flag) return false;

  const { data: override } = await supabase
    .from("feature_flag_overrides")
    .select("enabled")
    .eq("flag_id", flag.id)
    .eq("law_firm_id", lawFirmId)
    .single();

  return override ? override.enabled : flag.enabled_by_default;
}

export async function checkLimit(
  lawFirmId: string,
  limitKey: string,
  currentValue: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { allowed: false, limit: 0, current: currentValue };

  const { data: firm } = await supabase
    .from("law_firms")
    .select("plan, id")
    .eq("id", lawFirmId)
    .single();

  if (!firm) return { allowed: false, limit: 0, current: currentValue };

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return { allowed: false, limit: 0, current: currentValue };
  const { data: override } = await adminClient
    .from("tenant_limit_overrides")
    .select("override_value")
    .eq("law_firm_id", lawFirmId)
    .eq("limit_key", limitKey)
    .single();

  const planLimits = await getLimitsForPlan(firm.plan);
  const limit = override?.override_value ?? planLimits[limitKey] ?? 0;
  if (limit === -1) return { allowed: true, limit: -1, current: currentValue };

  return { allowed: currentValue < limit, limit, current: currentValue };
}

export async function getUsage(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const [members, clients, contracts, cases] = await Promise.all([
    supabase.from("law_firm_members").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("legal_cases").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
  ]);

  return {
    members: members.count ?? 0,
    clients: clients.count ?? 0,
    contracts: contracts.count ?? 0,
    cases: cases.count ?? 0,
  };
}
