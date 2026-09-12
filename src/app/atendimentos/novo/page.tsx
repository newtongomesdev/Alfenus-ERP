import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { IntakeForm } from "@/components/solo/intake-form";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function NovaFichaPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  // Get a sample template's intake questions
  let templateQuestions: string[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data } = await (supabase as any)
      .from("legal_area_templates")
      .select("intake_questions")
      .eq("is_platform_template", true)
      .limit(1)
      .maybeSingle();
    if ((data as any)?.intake_questions) {
      templateQuestions = (data as any).intake_questions as string[];
    }
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Nova ficha de atendimento" description="Registre os dados iniciais da consulta." />
        <IntakeForm templateQuestions={templateQuestions} />
      </div>
    </AppShell>
  );
}
