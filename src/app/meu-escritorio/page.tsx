import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth/context";
import { getMeuEscritorioOverview } from "@/lib/solo-pro/queries";
import { MeuEscritorio } from "@/components/solo-pro/meu-escritorio";

export default async function MeuEscritorioPage() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/entrar");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { data: member } = await supabase
    .from("law_firm_members")
    .select("id, law_firm_id, name")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!member) {
    redirect("/onboarding");
  }

  const overview = await getMeuEscritorioOverview(member.law_firm_id);
  if (!overview) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <MeuEscritorio
          overview={overview}
        />
      </div>
    </div>
  );
}