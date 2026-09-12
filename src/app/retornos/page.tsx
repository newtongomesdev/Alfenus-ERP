import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FollowUpList } from "@/components/solo/follow-up-list";

export default async function RetornosPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let followUps: any[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase && ctx.lawFirm) {
    const { data } = await supabase
      .from("follow_ups")
      .select("id, title, follow_up_type, scheduled_date, scheduled_time, priority, status, clients(name), legal_cases(title)")
      .eq("law_firm_id", ctx.lawFirm.id)
      .order("scheduled_date", { ascending: true })
      .limit(50);
    followUps = (data ?? []).map((fu: any) => ({
      ...fu,
      client_name: fu.clients?.name,
      case_title: fu.legal_cases?.title,
    }));
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Retornos e follow-up" description="Acompanhe retornos pendentes com clientes." />
        <FollowUpList followUps={followUps} />
      </div>
    </AppShell>
  );
}
