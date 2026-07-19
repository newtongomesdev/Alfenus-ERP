"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyFromCents, formatDateTime } from "@/lib/formatters";
import { downloadCSV, type ExportResult } from "@/lib/export/csv";

import { getAppContext } from "@/lib/auth/context";

type TimeEntry = {
  id: string;
  description: string;
  durationMinutes: number;
  amountCents: number;
  billable: boolean;
  startedAt: string;
  memberName: string;
  clientName: string | null;
  caseTitle: string | null;
};

function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function HorasRelatorioPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [billableOnly, setBillableOnly] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Buscar todos os registros (limit 500)
      const res = await fetch("/api/entities?type=time_entry&module=time_entries&limit=500");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.items ?? []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtrar
  const filtered = entries.filter((e) => {
    if (dateFrom && new Date(e.startedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.startedAt) > new Date(dateTo + "T23:59:59")) return false;
    if (memberFilter && e.memberName !== memberFilter) return false;
    if (clientFilter && e.clientName !== clientFilter) return false;
    if (billableOnly && !e.billable) return false;
    return true;
  });

  // Totais
  const totalMinutes = filtered.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = filtered.filter((e) => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalAmount = filtered.filter((e) => e.billable).reduce((sum, e) => sum + e.amountCents, 0);

  // Valores únicos para filtros
  const members = [...new Set(entries.map((e) => e.memberName))].sort();
  const clients = [...new Set(entries.map((e) => e.clientName).filter(Boolean))].sort() as string[];

  // Exportar
  const handleExport = () => {
    const result: ExportResult = {
      headers: ["Data", "Responsável", "Cliente", "Processo", "Descrição", "Minutos", "Horas", "Faturável", "Valor"],
      rows: filtered.map((e) => [
        e.startedAt, e.memberName, e.clientName ?? "", e.caseTitle ?? "",
        e.description, e.durationMinutes, hoursLabel(e.durationMinutes),
        e.billable ? "Sim" : "Não", e.billable ? e.amountCents / 100 : 0,
      ]),
      filename: "relatorio_horas",
      totalRows: filtered.length,
    };
    downloadCSV(result);
  };

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Relatório de Horas"
        description={`${filtered.length} registros • ${hoursLabel(totalMinutes)} total`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || filtered.length === 0}>
            Exportar CSV
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 rounded-lg border bg-muted/30 p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="h-8 w-full rounded border bg-transparent px-2 text-sm">
              <option value="">Todos</option>
              {members.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-8 w-full rounded border bg-transparent px-2 text-sm">
              <option value="">Todos</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={billableOnly} onChange={(e) => setBillableOnly(e.target.checked)} className="rounded" />
              Somente faturáveis
            </label>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{hoursLabel(totalMinutes)}</p>
        </div>
        <div className="rounded border p-3 text-center">
          <p className="text-xs text-muted-foreground">Faturáveis</p>
          <p className="text-lg font-semibold">{hoursLabel(billableMinutes)}</p>
        </div>
        <div className="rounded border p-3 text-center">
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="text-lg font-semibold">{formatCurrencyFromCents(totalAmount)}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Responsável</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Processo</th>
                <th className="px-3 py-2 text-left font-medium">Descrição</th>
                <th className="px-3 py-2 text-right font-medium">Horas</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{formatDateTime(entry.startedAt)}</td>
                  <td className="px-3 py-2">{entry.memberName}</td>
                  <td className="px-3 py-2">{entry.clientName ?? "-"}</td>
                  <td className="px-3 py-2">{entry.caseTitle ?? "-"}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{entry.description}</td>
                  <td className="px-3 py-2 text-right font-medium">{hoursLabel(entry.durationMinutes)}</td>
                  <td className="px-3 py-2 text-right">
                    {entry.billable ? formatCurrencyFromCents(entry.amountCents) : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-3 py-2" colSpan={5}>Total ({filtered.length} registros)</td>
                <td className="px-3 py-2 text-right">{hoursLabel(totalMinutes)}</td>
                <td className="px-3 py-2 text-right">{formatCurrencyFromCents(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </AppShell>
  );
}
