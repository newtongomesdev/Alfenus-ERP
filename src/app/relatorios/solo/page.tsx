import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { SoloReports } from "@/components/solo/solo-reports";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function SoloReportsPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  const supabase = await getSupabaseServerClient();

  let metrics = {
    newContacts: 0,
    consultationsDone: 0,
    proposalsSent: 0,
    contractsClosed: 0,
    conversionRate: 0,
    contractedRevenue: 0,
    receivedRevenue: 0,
    averageTicket: 0,
    clientsWithoutFollowUp: 0,
    overdueTasks: 0,
    pendingDocuments: 0,
    upcomingDeadlines: 0,
  };

  if (supabase && ctx.lawFirm) {
    const firmId = ctx.lawFirm.id;

    const [leadsResult, consultationsResult, proposalsResult, contractsResult, paymentsResult, tasksResult, deadlinesResult] =
      await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId),
        supabase.from("intake_forms").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId),
        supabase.from("fee_proposals").select("id, status, total_amount_cents").eq("law_firm_id", firmId),
        supabase.from("contracts").select("id, total_amount_cents, status").eq("law_firm_id", firmId).eq("status", "ativo"),
        supabase.from("payments").select("id, amount_cents").eq("law_firm_id", firmId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId).in("status", ["atrasada", "vencida"]),
        supabase.from("deadlines").select("id", { count: "exact", head: true }).eq("law_firm_id", firmId).in("status", ["pendente", "em_andamento"]),
      ]);

    const totalLeads = leadsResult.count ?? 0;
    const proposalsSent = (proposalsResult.data ?? []).length;
    const contractsClosed = (contractsResult.data ?? []).length;
    const totalContracts = contractsClosed;
    const contractedRevenue = (contractsResult.data ?? []).reduce((sum, c) => sum + ((c.total_amount_cents as number) ?? 0), 0);
    const receivedRevenue = (paymentsResult.data ?? []).reduce((sum, p) => sum + ((p.amount_cents as number) ?? 0), 0);

    metrics = {
      newContacts: totalLeads,
      consultationsDone: consultationsResult.count ?? 0,
      proposalsSent,
      contractsClosed,
      conversionRate: totalLeads > 0 ? Math.round((totalContracts / totalLeads) * 100) : 0,
      contractedRevenue,
      receivedRevenue,
      averageTicket: totalContracts > 0 ? Math.floor(contractedRevenue / totalContracts) : 0,
      clientsWithoutFollowUp: 0,
      overdueTasks: tasksResult.count ?? 0,
      pendingDocuments: 0,
      upcomingDeadlines: deadlinesResult.count ?? 0,
    };
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Relatórios" description="Indicadores para início de carreira e organização." />
        <SoloReports metrics={metrics} />
      </div>
    </AppShell>
  );
}
