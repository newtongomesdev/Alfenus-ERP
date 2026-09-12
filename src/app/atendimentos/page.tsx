import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/formatters";
import { PRACTICE_AREAS } from "@/lib/solo/constants";

export default async function AtendimentosPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let forms: any[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase && ctx.lawFirm) {
    const { data } = await supabase
      .from("intake_forms")
      .select("id, consultation_reason, practice_area, urgency, status, has_active_process, created_at")
      .eq("law_firm_id", ctx.lawFirm.id)
      .order("created_at", { ascending: false })
      .limit(50);
    forms = data ?? [];
  }

  const statusColors: Record<string, string> = {
    rascunho: "bg-gray-100 text-gray-800",
    concluido: "bg-blue-100 text-blue-800",
    convertido_cliente: "bg-green-100 text-green-800",
    convertido_caso: "bg-emerald-100 text-emerald-800",
  };

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Fichas de atendimento" description="Registre atendimentos iniciais com clientes." actions={
          <Link href="/atendimentos/novo" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
            <Plus className="size-4" /> Nova ficha
          </Link>
        } />

        {forms.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma ficha de atendimento criada ainda.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {forms.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{f.consultation_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.practice_area ? PRACTICE_AREAS.find(a => a.key === f.practice_area)?.name ?? f.practice_area : "Área não definida"}
                        {f.has_active_process ? " • Processo ativo" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[f.status] ?? ""}`}>{f.status}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(f.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
