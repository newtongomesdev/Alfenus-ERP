import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { TemplateCenter } from "@/components/solo/template-center";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ModelosPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let templates: any[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase
      .from("legal_area_templates")
      .select("area_key, area_label, checklist_items, required_documents, suggested_tasks, suggested_deadlines, intake_questions, case_stages")
      .eq("is_platform_template", true)
      .order("area_label");
    templates = data ?? [];
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Central de modelos" description="Templates de documentos e checklists por área jurídica." />
        <TemplateCenter templates={templates} />
      </div>
    </AppShell>
  );
}
