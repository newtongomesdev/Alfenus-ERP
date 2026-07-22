"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ONBOARDING_STEPS, OnboardingStepKey, TOTAL_STEPS } from "./constants";
import { getOrCreateOnboardingSession } from "./queries";

// ── Client type ──────────────────────────────────────────────────────────────

type ActionClient = {
  from(table: "onboarding_sessions"): {
    select(columns: string): {
      eq(column: string, value: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  from(table: "audit_logs"): {
    insert(values: Record<string, unknown>): PromiseLike<{ error: Error | null }>;
  };
  from(table: "law_firms"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fail(code: string): never {
  redirect(`/onboarding?erro=${code}`);
}

function findStepIndex(stepKey: OnboardingStepKey): number {
  return ONBOARDING_STEPS.findIndex((s) => s.key === stepKey);
}

function findNextIncompleteStep(
  completedSteps: OnboardingStepKey[],
): OnboardingStepKey | null {
  const next = ONBOARDING_STEPS.find(
    (step) => !completedSteps.includes(step.key),
  );
  return next?.key ?? null;
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Cria uma sessão de onboarding e redireciona para a página do perfil.
 */
export async function createOnboardingSessionAction(profile: string) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  const { error } = await client
    .from("onboarding_sessions")
    .update({ profile })
    .eq("id", session.id);

  if (error) fail("atualizar_perfil");

  redirect(`/onboarding/${profile}`);
}

/**
 * Marca o step atual como concluído, avança para o próximo e registra audit log.
 */
export async function advanceOnboardingStepAction(
  profile: string,
  stepKey: OnboardingStepKey,
  data?: Record<string, unknown>,
) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  const completedSteps = [
    ...new Set([...(session.completed_steps ?? []), stepKey]),
  ] as OnboardingStepKey[];
  const nextStep = findNextIncompleteStep(completedSteps);

  const now = new Date().toISOString();

  const { error } = await client
    .from("onboarding_sessions")
    .update({
      completed_steps: completedSteps,
      current_step: nextStep,
      updated_at: now,
    })
    .eq("id", session.id);

  if (error) fail("avancar_step");

  // Buscar REQUIRED_STEPS via require() para evitar import circular
  const { REQUIRED_STEPS } = require("./constants");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_step_concluido",
    entity_type: "onboarding_session",
    entity_id: session.id,
    metadata: {
      step: stepKey,
      required: REQUIRED_STEPS.includes(stepKey),
      data: data ?? {},
      next_step: nextStep,
      total_completed: completedSteps.length,
      total_steps: TOTAL_STEPS,
    },
  });

  revalidatePath("/onboarding");
  revalidatePath(`/onboarding/${profile}`);

  if (nextStep) {
    redirect(`/onboarding/${profile}/${nextStep}`);
  } else {
    redirect(`/onboarding/${profile}/resumo`);
  }
}

/**
 * Pula um step não obrigatório e avança para o próximo.
 */
export async function skipOnboardingStepAction(
  profile: string,
  stepKey: OnboardingStepKey,
) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  // Buscar REQUIRED_STEPS via require() para evitar import circular
  const { REQUIRED_STEPS } = require("./constants");

  if (REQUIRED_STEPS.includes(stepKey)) {
    fail("step_obrigatorio");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  const stepIndex = findStepIndex(stepKey);
  const nextIncomplete = findNextIncompleteStep(
    session.completed_steps ?? [],
  );
  const nextStep =
    nextIncomplete && findStepIndex(nextIncomplete) > stepIndex
      ? nextIncomplete
      : nextIncomplete ?? null;

  const now = new Date().toISOString();

  const { error } = await client
    .from("onboarding_sessions")
    .update({
      current_step: nextStep,
      updated_at: now,
    })
    .eq("id", session.id);

  if (error) fail("pular_step");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_step_pulado",
    entity_type: "onboarding_session",
    entity_id: session.id,
    metadata: { step: stepKey, next_step: nextStep },
  });

  revalidatePath("/onboarding");
  revalidatePath(`/onboarding/${profile}`);

  if (nextStep) {
    redirect(`/onboarding/${profile}/${nextStep}`);
  } else {
    redirect(`/onboarding/${profile}/resumo`);
  }
}

/**
 * Navega para um step específico do onboarding.
 */
export async function goToOnboardingStepAction(
  profile: string,
  stepKey: OnboardingStepKey,
) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const stepExists = ONBOARDING_STEPS.some((s) => s.key === stepKey);
  if (!stepExists) fail("step_invalido");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  const { error } = await client
    .from("onboarding_sessions")
    .update({ current_step: stepKey, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  if (error) fail("navegar_step");

  redirect(`/onboarding/${profile}/${stepKey}`);
}

/**
 * Reabre o fluxo de onboarding (somente proprietário).
 * Remove completed_at para indicar que o onboarding está em andamento novamente.
 */
export async function reopenOnboardingAction(profile: string) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  if (context.member.role !== "proprietario") {
    fail("permissao");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  if (!session.completed_at) {
    redirect(`/onboarding/${profile}`);
  }

  const { error } = await client
    .from("onboarding_sessions")
    .update({ completed_at: null, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  if (error) fail("reabrir_onboarding");

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_reaberto",
    entity_type: "onboarding_session",
    entity_id: session.id,
  });

  revalidatePath("/onboarding");
  redirect(`/onboarding/${profile}`);
}

/**
 * Marca o onboarding como concluído e atualiza law_firms.onboarding_completed_at.
 */
export async function completeOnboardingAction(profile: string) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm)
    redirect("/onboarding");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as ActionClient;

  // Buscar REQUIRED_STEPS via require() para evitar import circular
  const { REQUIRED_STEPS } = require("./constants");

  const session = await getOrCreateOnboardingSession(
    context.member.userId,
    context.lawFirm.id,
  );

  const completedSteps = (session.completed_steps ?? []) as OnboardingStepKey[];
  const allRequiredDone = REQUIRED_STEPS.every((step: OnboardingStepKey) =>
    completedSteps.includes(step),
  );

  if (!allRequiredDone) {
    fail("steps_obrigatorios_pendentes");
  }

  const now = new Date().toISOString();

  const { error } = await client
    .from("onboarding_sessions")
    .update({ completed_at: now, updated_at: now })
    .eq("id", session.id);

  if (error) fail("concluir_onboarding");

  // Atualizar law_firms.onboarding_completed_at
  await client
    .from("law_firms")
    .update({ onboarding_completed_at: now })
    .eq("id", context.lawFirm.id);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_concluido",
    entity_type: "onboarding_session",
    entity_id: session.id,
    metadata: {
      steps_completed: completedSteps.length,
      total_steps: TOTAL_STEPS,
    },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
