import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { getPricingScenarioById, getPricingScenarioVersions, getPricingScenarioEvents, getActivePricingVersion } from "@/lib/pricing/queries";
import { PRICING_STATUS_CONFIG } from "@/lib/pricing/constants";
import type { PricingScenarioStatus } from "@/lib/pricing/types";
import { ScenarioActions } from "./ScenarioActions";
import { ScenarioVersionTable } from "./ScenarioVersionTable";
import { ScenarioEventTimeline } from "./ScenarioEventTimeline";
import { ScenarioMemory } from "./ScenarioMemory";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SimuladorDetailPage({ params }: PageProps) {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm || !ctx.member) {
    redirect("/entrar");
  }

  const { id } = await params;
  const scenario = await getPricingScenarioById(id);

  if (!scenario) {
    notFound();
  }

  const canViewMemory = ctx.member.role === "proprietario";
  const [versions, events, activeVersion] = await Promise.all([
    getPricingScenarioVersions(scenario.id),
    getPricingScenarioEvents(scenario.id, 20),
    canViewMemory && scenario.active_version_id ? getActivePricingVersion(scenario.id) : null,
  ]);

  const statusConfig =
    PRICING_STATUS_CONFIG[scenario.status as PricingScenarioStatus];

  const canManage = ["proprietario", "administrador", "advogado"].includes(ctx.member.role);

  const hasMultipleVersions = versions.length >= 2;

  return (
    <main className="min-w-0 space-y-6">
      {/* Print header - only visible when printing */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold">{scenario.name}</h1>
        {scenario.description && <p className="text-sm text-muted-foreground">{scenario.description}</p>}
      </div>

      <Link
        href="/simulador"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← Voltar para cenários
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="flex-1">
          <PageHeader
            title={scenario.name}
            description={scenario.description ?? undefined}
          />
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig?.color ?? "text-gray-600 bg-gray-50 border-gray-200"}`}
            >
              {statusConfig?.label ?? scenario.status}
            </span>
            {scenario.created_by && (
              <span className="text-xs text-muted-foreground">
                Criado por {scenario.created_by}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <PrintButton />
          {canManage && scenario.active_version_id && (
            <Link href={`/propostas/nova?scenarioId=${scenario.id}&versionId=${scenario.active_version_id}`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              Criar proposta comercial
            </Link>
          )}
          {hasMultipleVersions && ctx.member.role === "proprietario" && (
            <Link
              href={`/simulador/${scenario.id}/comparar`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Comparar versões
            </Link>
          )}
          <ScenarioActions
            scenarioId={scenario.id}
            status={scenario.status}
            canManage={canManage}
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Card label="Valor Total" value={formatCurrency(scenario.total_amount_cents)} />
        <Card
          label="Versão Ativa"
          value={
            scenario.active_version_id
              ? `v${versions.find((v) => v.id === scenario.active_version_id)?.version_number ?? "?"}`
              : "Nenhuma"
          }
        />
        <Card label="Versões" value={String(scenario.versions_count)} />
        <Card label="Eventos" value={String(scenario.events_count)} />
      </div>

      {/* Versões */}
      <div className="print:hidden">
        <ScenarioVersionTable
          scenarioId={scenario.id}
          scenarioStatus={scenario.status}
          versions={versions.map((v) => ({
            id: v.id,
            version_number: v.version_number,
            scenario_type: v.scenario_type,
            total_amount_cents: v.total_amount_cents,
            entry_amount_cents: v.entry_amount_cents,
            installment_count: v.installment_count,
            creation_at: v.created_at,
          }))}
          activeVersionId={scenario.active_version_id}
          canManage={canManage}
        />
      </div>

      {/* Memória de cálculo */}
      <ScenarioMemory
        version={activeVersion}
        canViewMemory={canViewMemory}
      />

      {/* Timeline de eventos */}
      <div className="print:hidden">
        <ScenarioEventTimeline
        events={events}
        />
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
