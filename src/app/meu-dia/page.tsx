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
                Novo caso
              </Link>
            </div>
          }
        />

        {overview.status === "ready" ? (
          <MeuDiaClient overview={overview.data} memberName={ctx.member?.name ?? ""} />
        ) : (
          <section role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="font-medium">Não foi possível carregar o seu dia</h2>
            <p className="mt-1 text-sm text-muted-foreground">{overview.message}</p>
            {overview.status === "error" && <a className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href="/meu-dia">Tentar novamente</a>}
          </section>
        )}
      </div>
    </AppShell>
  );
}
