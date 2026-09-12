import { redirect } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { getPricingScenarios } from "@/lib/pricing/queries";
import type { PricingScenarioStatus } from "@/lib/pricing/types";
import { ScenarioFilters } from "./ScenarioFilters";
import { ScenarioTable } from "./ScenarioTable";
import { ScenarioPagination } from "./ScenarioPagination";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    include_archived?: string;
  }>;
}

export default async function SimuladorPage({ searchParams }: PageProps) {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    redirect("/entrar");
  }

  const params = await searchParams;
  const filters = {
    status: params.status as PricingScenarioStatus | undefined,
    search: params.search || undefined,
    page: params.page ? Number(params.page) : 1,
    limit: 20,
    include_archived: params.include_archived === "true",
  };

  const { scenarios, total } = await getPricingScenarios(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  const canCreate = ["proprietario", "administrador", "advogado"].includes(ctx.member.role);

  return (
    <main className="space-y-6">
      <PageHeader
        title="Simulador de Honorários"
        description="Cenários de precificação, comparação de versões e memória de cálculo."
        actions={
          canCreate ? (
            <Link
              href="/simulador/novo"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Novo Cenário
            </Link>
          ) : undefined
        }
      />

      <ScenarioFilters
        currentStatus={filters.status}
        currentSearch={filters.search}
        includeArchived={filters.include_archived}
      />

      <ScenarioTable scenarios={scenarios} />

      <ScenarioPagination
        currentPage={filters.page}
        totalPages={totalPages}
        total={total}
      />
    </main>
  );
}
