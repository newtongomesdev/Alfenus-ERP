"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { FUNNEL_STAGES, type FunnelStageId } from "@/lib/pipeline/pipeline-utils";

import { getErrorMessage } from "@/lib/utils";
import { type PipelineColumn, getPipelineData, moveLeadToStage } from "./actions";

function LeadCard({ lead }: { lead: PipelineColumn["leads"][number] }) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight">{lead.name}</h4>
        {lead.probability > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {lead.probability}%
          </span>
        )}
      </div>
      {lead.interest && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.interest}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrencyFromCents(lead.estimatedValueCents)}</span>
        {lead.responsibleName && <span className="truncate ml-2">{lead.responsibleName}</span>}
      </div>
      {lead.nextContactAt && (
        <p className="mt-1 text-xs text-amber-600">Próximo contato: {formatDate(lead.nextContactAt)}</p>
      )}
    </Link>
  );
}

function MoveDropdown({ leadId, currentStage, onMove }: { leadId: string; currentStage: string; onMove: (leadId: string, stage: FunnelStageId) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        className="rounded p-1 text-muted-foreground hover:bg-muted"
        title="Mover lead"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border bg-white py-1 shadow-lg">
            {FUNNEL_STAGES.filter((s) => s.id !== currentStage).map((stage) => (
              <button
                key={stage.id}
                onClick={(e) => { e.preventDefault(); onMove(leadId, stage.id as FunnelStageId); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className={`inline-block h-2 w-2 rounded-full ${stage.color.split(" ")[0]}`} />
                {stage.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPipelineData();
      setColumns(data);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMove = useCallback((leadId: string, newStage: FunnelStageId) => {
    startTransition(async () => {
      try {
        await moveLeadToStage(leadId, newStage);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const totalLeads = columns.reduce((sum, col) => sum + col.leads.length, 0);
  const totalValue = columns.reduce((sum, col) => sum + col.totalValue, 0);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Pipeline de Vendas"
        description={`${totalLeads} leads • Valor total: ${formatCurrencyFromCents(totalValue)}`}
        actions={
          <Link href="/leads/novo" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted">
            Novo Lead
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando pipeline...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.stage.id} className="flex min-w-[260px] flex-1 flex-col">
              {/* Header do estágio */}
              <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-full ${col.stage.color.split(" ")[0]}`} />
                  <h3 className="text-sm font-semibold">{col.stage.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {col.leads.length}
                  </span>
                </div>
                {col.totalValue > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatCurrencyFromCents(col.totalValue)}
                  </span>
                )}
              </div>

              {/* Cards dos leads */}
              <div className="flex flex-1 flex-col gap-2 rounded-lg border border-dashed p-2">
                {col.leads.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded border border-dashed p-4 text-xs text-muted-foreground">
                    Nenhum lead
                  </div>
                ) : (
                  col.leads.map((lead) => (
                    <div key={lead.id} className="group relative">
                      <LeadCard lead={lead} />
                      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <MoveDropdown
                          leadId={lead.id}
                          currentStage={lead.funnelStage}
                          onMove={handleMove}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground shadow-lg">
          Movendo lead...
        </div>
      )}
    </AppShell>
  );
}
