import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

export default async function RecibosPage() {
  const ctx = await getAppContext();
  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  let receipts: any[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase && ctx.lawFirm) {
    const { data } = await supabase
      .from("receipts")
      .select("id, receipt_number, client_name, service_description, amount_cents, payment_method, payment_date, status, created_at")
      .eq("law_firm_id", ctx.lawFirm.id)
      .order("created_at", { ascending: false })
      .limit(50);
    receipts = data ?? [];
  }

  const statusColors: Record<string, string> = {
    emitido: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
    segunda_via: "bg-blue-100 text-blue-800",
  };

  return (
    <AppShell memberName={ctx.member?.name ?? null} isAuthenticated={ctx.status === "ready"} interfaceMode={ctx.lawFirm?.interfaceMode}>
      <div className="space-y-6">
        <PageHeader title="Recibos" description="Recibos emitidos para clientes." actions={
          <Link href="/recibos/novo" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
            <Plus className="size-4" /> Emitir recibo
          </Link>
        } />

        {receipts.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum recibo emitido ainda.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {receipts.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Recibo #{r.receipt_number} — {r.client_name}</p>
                      <p className="text-xs text-muted-foreground">{r.service_description} • {r.payment_method}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrencyFromCents(r.amount_cents)}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? ""}`}>{r.status}</span>
                      <span className="text-xs text-muted-foreground">{r.payment_date}</span>
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
