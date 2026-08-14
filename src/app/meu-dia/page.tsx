import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { MeuDiaClient } from "@/components/solo/meu-dia-client";
import { getSoloOverview } from "@/lib/dashboard/solo-queries";
import { getAppContext } from "@/lib/auth/context";

export default async function MeuDiaPage() {
  const ctx = await getAppContext();

  if (ctx.status === "signed-out") redirect("/entrar");
  if (ctx.status === "missing-tenant") redirect("/onboarding");

  const overview = await getSoloOverview();

  return (
    <AppShell
      memberName={ctx.member?.name ?? null}
      isAuthenticated={ctx.status === "ready"}
      interfaceMode={ctx.lawFirm?.interfaceMode}
    >
      <div className="space-y-6">
        <PageHeader
          title={`Bom dia, ${ctx.member?.name?.split(" ")[0] ?? "advogado"}`}
          description={`${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/clientes/novo"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
              >
                <Plus className="size-4" />
                Novo cliente
              </Link>
              <Link
                href="/solo/novo-caso"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                <Plus className="size-4" />
                Novo processo
              </Link>
            </div>
          }
        />

        <MeuDiaClient overview={overview} memberName={ctx.member?.name ?? ""} />
      </div>
    </AppShell>
  );
}
