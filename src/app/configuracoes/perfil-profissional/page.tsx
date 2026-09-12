import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { ProfessionalProfileForm } from "@/components/solo/professional-profile-form";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function PerfilProfissionalPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let profile = null;
  const supabase = await getSupabaseServerClient();
  if (supabase && ctx.lawFirm) {
    const { data } = await supabase
      .from("professional_profiles")
      .select("*")
      .eq("law_firm_id", ctx.lawFirm.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Perfil profissional" description="Configure seus dados para documentos, recibos e propostas." />
        <ProfessionalProfileForm profile={profile as any} />
      </div>
    </AppShell>
  );
}
