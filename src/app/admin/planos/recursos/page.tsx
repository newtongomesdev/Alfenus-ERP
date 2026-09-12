import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PLAN_FEATURES } from "@/lib/admin/billing";
import { RecursosForm } from "./recursos-form";

const PLAN_ORDER = ["starter", "professional", "business"] as const;

// Boolean feature keys from DEFAULT_PLAN_FEATURES (excluding numeric limits)
const BOOLEAN_FEATURE_KEYS = [
  "hasAiFeatures",
  "hasPwa",
  "hasLgpd",
  "hasClm",
  "hasRiskManagement",
  "hasLegalRequests",
  "hasPublicForms",
  "hasPdfTools",
  "hasTicketing",
];

export default async function AdminPlanFeaturesPage() {
  const { adminClient } = await getAdminContext();

  // Load plan settings for feature_overrides
  const { data: planSettingsRows } = await (adminClient as any)
    .from("plan_settings")
    .select("id, feature_overrides")
    .in("id", PLAN_ORDER);

  const planSettingsMap = new Map<string, Record<string, boolean>>(
    (planSettingsRows ?? []).map((row: { id: string; feature_overrides: Record<string, boolean> | null }) => [
      row.id,
      row.feature_overrides ?? {},
    ])
  );

  // Merge defaults with overrides
  const planDefaults: Record<string, Record<string, boolean>> = {};
  for (const planId of PLAN_ORDER) {
    const defaults = DEFAULT_PLAN_FEATURES[planId] ?? {};
    const overrides = planSettingsMap.get(planId) ?? {};
    planDefaults[planId] = {};
    for (const key of BOOLEAN_FEATURE_KEYS) {
      // Override takes precedence over defaults
      if (key in overrides) {
        planDefaults[planId][key] = overrides[key];
      } else if (key in defaults) {
        planDefaults[planId][key] = Boolean((defaults as Record<string, unknown>)[key]);
      } else {
        planDefaults[planId][key] = false;
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos por Plano"
        description="Controle quais funcionalidades estão habilitadas para cada plano da plataforma."
      />

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <RecursosForm
            featureKeys={BOOLEAN_FEATURE_KEYS}
            planDefaults={planDefaults}
          />
        </CardContent>
      </Card>
    </div>
  );
}
