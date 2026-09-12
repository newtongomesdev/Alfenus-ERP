import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseProposalRepository } from "@/lib/proposals/persistence/supabase-repository";
import { ProposalsList } from "@/components/proposals/proposals-list";

export default async function PropostasPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status !== "ready" || !ctx.member || !ctx.lawFirm) redirect("/onboarding");
  const client = await getSupabaseServerClient();
  if (!client) return <Card><CardContent>Serviço temporariamente indisponível.</CardContent></Card>;
  const role = ctx.member.role === "proprietario" ? "owner" : ["assistente", "colaborador"].includes(ctx.member.role) ? "restricted" : "lawyer";
  let proposals = [];
  try { proposals = await new SupabaseProposalRepository(client, role).list(); } catch { return <AppShell memberName={ctx.member.name} isAuthenticated interfaceMode={ctx.lawFirm.interfaceMode}><Card><CardContent>Não foi possível carregar as propostas.</CardContent></Card></AppShell>; }
  const canWrite = ["proprietario", "administrador", "advogado"].includes(ctx.member.role);
  return <AppShell memberName={ctx.member.name} isAuthenticated interfaceMode={ctx.lawFirm.interfaceMode}><div className="space-y-6"><PageHeader title="Propostas comerciais" description="Monte, revise e acompanhe propostas do escritório." actions={canWrite ? <Link href="/propostas/nova" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"><Plus className="size-4" /> Nova proposta</Link> : undefined} /><ProposalsList proposals={proposals} /></div></AppShell>;
}
