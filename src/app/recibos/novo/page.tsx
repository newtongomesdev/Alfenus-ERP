import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/solo/receipt-form";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function NovoReciboPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let clientId = "";
  let clientName = "Cliente";
  let clientDocument: string | undefined;
  const supabase = await getSupabaseServerClient();
  if (supabase && ctx.lawFirm) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, document")
      .eq("law_firm_id", ctx.lawFirm.id)
      .eq("status", "ativo")
      .order("name")
      .limit(1)
      .maybeSingle();
    if (data) {
      clientId = (data as any).id;
      clientName = (data as any).name;
      clientDocument = (data as any).document ?? undefined;
    }
  }

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Emitir recibo" description="Preencha os dados para gerar o recibo." />
        {clientId ? (
          <ReceiptForm clientId={clientId} clientName={clientName} clientDocument={clientDocument} />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Cadastre um cliente antes de emitir um recibo.
          </div>
        )}
      </div>
    </AppShell>
  );
}
