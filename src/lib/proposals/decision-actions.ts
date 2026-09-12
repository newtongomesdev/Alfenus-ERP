"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSafeProposalError } from "./application/errors";
import { decidePublicProposalService } from "./application/decision-services";
import type { ProposalDecisionInput } from "./application/schemas";

export async function decidePublicProposalAction(input: ProposalDecisionInput) {
  try {
    const client = await getSupabaseServerClient();
    if (!client) return { error: { code: "PROPOSAL_DECISION_PERSISTENCE_ERROR", message: "Nao foi possivel registrar a decisao." } };
    const data = await decidePublicProposalService(client, input);
    revalidatePath(`/p/${input.token}`);
    return { data };
  } catch (error) {
    const safe = toSafeProposalError(error);
    console.error(JSON.stringify({ event: "proposal_decision_action_failed", action: input.decisionType, code: safe.code }));
    return { error: safe };
  }
}
