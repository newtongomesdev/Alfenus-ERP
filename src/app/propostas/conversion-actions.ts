"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { convertAcceptedProposalService } from "@/lib/contracts/conversion";

export async function convertAcceptedProposalAction(formData: FormData) {
  const proposalId = String(formData.get("proposalId") ?? "");
  if (!proposalId) redirect("/propostas?erro=conversao");
  const context = await getAppContext();
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!can(context.member.role, "contratos.gerenciar")) redirect(`/propostas/${proposalId}?erro=conversao-permissao`);
  const client = await getSupabaseServerClient();
  if (!client) redirect(`/propostas/${proposalId}?erro=conversao-ambiente`);
  let result: Awaited<ReturnType<typeof convertAcceptedProposalService>>;
  try {
    result = await convertAcceptedProposalService(client, proposalId, `proposal-contract-${proposalId}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "commercial_proposal_contract_conversion_failed", proposalId, detail: error instanceof Error ? error.message : "unknown" }));
    redirect(`/propostas/${proposalId}?erro=conversao`);
  }
  {
    revalidatePath(`/propostas/${proposalId}`);
    revalidatePath(`/contratos/${result.contractId}`);
    revalidatePath("/contratos");
    redirect(`/contratos/${result.contractId}?convertido=1`);
  }
}
