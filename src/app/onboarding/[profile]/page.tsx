import { notFound, redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ONBOARDING_STEPS,
  GROUP_LABELS,
  PROFILE_LABELS,
  REQUIRED_STEPS,
  type OnboardingProfile,
  type OnboardingStepKey,
} from "@/lib/onboarding/constants";
import { getOrCreateOnboardingSession } from "@/lib/onboarding/queries";
import { OnboardingChecklist } from "./onboarding-checklist";

const VALID_PROFILES: OnboardingProfile[] = [
  "individual",
  "small",
  "team",
  "department",
];

export default async function OnboardingProfilePage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;

  if (!VALID_PROFILES.includes(profile as OnboardingProfile)) {
    notFound();
  }

  const typedProfile = profile as OnboardingProfile;

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/onboarding");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: member } = await supabase
    .from("law_firm_members")
    .select("id, law_firm_id")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!member) {
    redirect("/onboarding");
  }

  const session = await getOrCreateOnboardingSession(
    user.id,
    member.law_firm_id,
  );

  const completedSteps = (session.completed_steps ?? []) as OnboardingStepKey[];
  const completedCount = completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;
  const percentage =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const requiredCompletedCount = REQUIRED_STEPS.filter((step) =>
    completedSteps.includes(step),
  ).length;

  return (
    <main className="min-h-screen bg-muted/30">
      <OnboardingChecklist
        session={{
          ...session,
          completed_steps: completedSteps,
          current_step: session.current_step,
        }}
        progress={{
          completed_count: completedCount,
          required_completed: requiredCompletedCount,
          required_total: REQUIRED_STEPS.length,
          total_steps: totalSteps,
          percentage,
        }}
        profile={typedProfile}
        profileLabel={PROFILE_LABELS[typedProfile]}
        groupLabels={GROUP_LABELS}
        steps={ONBOARDING_STEPS}
      />
    </main>
  );
}
