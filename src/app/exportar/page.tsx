"use client";

import { useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

import { getErrorMessage } from "@/lib/utils";
import { exportClients, exportLeads, exportCases, exportPayments } from "./actions";
import { downloadCSV, type ExportResult } from "@/lib/export/csv";

const EXPORT_OPTIONS = [
  { key: "clients", label: "Clientes", description: "Nome, e-mail, telefone, documento, tipo, status", fn: exportClients },
  { key: "leads", label: "Leads", description: "Nome, e-mail, telefone, interesse, estágio, valor estimado", fn: exportLeads },
  { key: "cases", label: "Processos", description: "Título, número, tipo, foro, status, prioridade", fn: exportCases },
  { key: "payments", label: "Pagamentos", description: "Valor, método, data, status", fn: exportPayments },
];

export default function ExportarPage() {
  const [isPending, startTransition] = useTransition();
  const [lastExport, setLastExport] = useState<{ name: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = (option: (typeof EXPORT_OPTIONS)[number]) => {
    startTransition(async () => {
      try {
        setError(null);
        const result = await option.fn();
        downloadCSV(result);
        setLastExport({ name: option.label, count: result.totalRows });
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  };

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Exportar Dados"
        description="Exporte dados do sistema em formato CSV para uso em planilhas"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {lastExport && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {lastExport.name} exportado com sucesso ({lastExport.count} registros).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {EXPORT_OPTIONS.map((option) => (
          <div key={option.key} className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm">
            <h3 className="text-sm font-semibold">{option.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(option)}
                disabled={isPending}
              >
                {isPending ? "Exportando..." : "Exportar CSV"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Formato CSV</p>
        <p>Os arquivos são exportados em formato CSV com separador vírgula e codificação UTF-8 com BOM (compatível com Excel).</p>
        <p>Valores monetários são exportados em reais (R$) com duas casas decimais.</p>
      </div>
    </AppShell>
  );
}
