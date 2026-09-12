import { redirect } from "next/navigation";

import { getAppContext, type AppContext } from "@/lib/auth/context";

const proposalWriteRoles = new Set(["proprietario", "administrador", "advogado"]);

export function canCreateCommercialProposal(role: string | null | undefined) {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  return proposalWriteRoles.has(normalizedRole);
}

export async function requireProposalWriteAccess(): Promise<AppContext & { status: "ready"; member: NonNullable<AppContext["member"]>; lawFirm: NonNullable<AppContext["lawFirm"]> }> {
  const context = await getAppContext();
  const rawRole = context.member?.role == null ? null : String(context.member.role);
  const allowed = context.status === "ready" && Boolean(context.member && context.lawFirm) && canCreateCommercialProposal(rawRole);

  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");
  if (!allowed) redirect("/propostas");

  return context as AppContext & { status: "ready"; member: NonNullable<AppContext["member"]>; lawFirm: NonNullable<AppContext["lawFirm"]> };
}
