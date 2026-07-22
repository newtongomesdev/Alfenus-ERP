import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { OnboardingStepKey } from './constants';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OnboardingSession {
  id: string;
  user_id: string;
  organization_id: string;
  current_step: OnboardingStepKey | null;
  completed_steps: OnboardingStepKey[];
  profile: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface OnboardingProgress {
  session: OnboardingSession;
  total_steps: number;
  completed_count: number;
  required_completed: number;
  required_total: number;
  percentage: number;
  next_step: OnboardingStepKey | null;
}

/** Supabase typed client alias */
type QueryClient = SupabaseClient;

// ── Helpers ────────────────────────────────────────────────────────────────────

function castClient(supabase: ReturnType<typeof getSupabaseServerClient>): QueryClient {
  return supabase as unknown as QueryClient;
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Retrieves the existing onboarding session for the given user/organization,
 * or creates a new one if none exists.
 */
export async function getOrCreateOnboardingSession(
  userId: string,
  organizationId: string,
): Promise<OnboardingSession> {
  const supabase = getSupabaseServerClient();
  const client = castClient(supabase);

  const { data: existing, error: fetchError } = await client
    .from('onboarding_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (!fetchError && existing) {
    return existing as unknown as OnboardingSession;
  }

  const { data: created, error: createError } = await client
    .from('onboarding_sessions')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      current_step: 'office_data',
      completed_steps: [],
      profile: null,
    })
    .select('*')
    .single();

  if (createError) {
    throw new Error(`Falha ao criar sessão de onboarding: ${createError.message}`);
  }

  return created as unknown as OnboardingSession;
}

/**
 * Fetches the onboarding progress for a given session, including percentage
 * and next recommended step.
 */
export async function getOnboardingProgress(
  sessionId: string,
): Promise<OnboardingProgress> {
  const supabase = getSupabaseServerClient();
  const client = castClient(supabase);

  const { data: session, error } = await client
    .from('onboarding_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    throw new Error(`Sessão de onboarding não encontrada: ${sessionId}`);
  }

  return calculateProgress(session as unknown as OnboardingSession);
}

/**
 * Calculates progress metrics from an onboarding session without hitting
 * the database. Dynamically imports REQUIRED_STEPS to avoid circular deps.
 */
export async function calculateProgress(
  session: OnboardingSession,
): Promise<OnboardingProgress> {
  const { REQUIRED_STEPS, ONBOARDING_STEPS } = await import('./constants');

  const completedSteps = (session.completed_steps ?? []) as OnboardingStepKey[];
  const totalSteps = ONBOARDING_STEPS.length;
  const completedCount = completedSteps.length;

  const requiredTotal = REQUIRED_STEPS.length;
  const requiredCompleted = REQUIRED_STEPS.filter((step) =>
    completedSteps.includes(step),
  ).length;

  const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const nextStep: OnboardingStepKey | null = ONBOARDING_STEPS.find(
    (step) => !completedSteps.includes(step.key),
  )?.key ?? null;

  return {
    session,
    total_steps: totalSteps,
    completed_count: completedCount,
    required_completed: requiredCompleted,
    required_total: requiredTotal,
    percentage,
    next_step: nextStep,
  };
}
