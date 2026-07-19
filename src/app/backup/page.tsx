"use client";

import { useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

import { getErrorMessage } from "@/lib/utils";
import { generateBackup, type BackupData } from "./actions";

function downloadJSON(data: BackupData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup_alfenus_${data.lawFirm?.slug ?? "tenant"}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function countRecords(data: BackupData) {
  return {
    clientes: data.clients.length,
    leads: data.leads.length,
    processos: data.legalCases.length,
    contratos: data.contracts.length,
    pagamentos: data.payments.length,
    despesas: data.expenses.length,
    prazos: data.deadlines.length,
    tarefas: data.tasks.length,
    documentos: data.documents.length,
    correspondentes: data.correspondents.length,
    procuracoes: data.powersOfAttorney.length,
    camposPersonalizados: data.customFields.length,
    workflows: data.workflowTemplates.length,
  };
}

export default function BackupPage() {
  const [isPending, startTransition] = useTransition();
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        setError(null);
        setDownloaded(false);
        const data = await generateBackup();
        setBackupData(data);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  };

  const handleDownload = () => {
    if (!backupData) return;
    downloadJSON(backupData);
    setDownloaded(true);
  };

  const stats = backupData ? countRecords(backupData) : null;
  const totalRecords = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Backup de Dados"
        description="Exporte uma cópia completa dos dados do seu escritório"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {downloaded && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Backup baixado com sucesso!
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Gerar Backup Completo</h3>
          <p className="text-xs text-muted-foreground">
            O backup inclui todos os dados do escritório: clientes, leads, processos, contratos,
            pagamentos, despesas, prazos, tarefas, documentos, correspondentes, procurações,
            campos personalizados e workflows. Os dados são exportados em formato JSON.
          </p>
        </div>

        {!backupData ? (
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Gerando backup..." : "Gerar Backup"}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(stats!).map(([key, count]) => (
                <div key={key} className="rounded border p-2 text-center">
                  <p className="text-lg font-semibold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{key}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">{totalRecords} registros no total</p>
                <p className="text-xs text-muted-foreground">
                  Exportado em {new Date(backupData.exportedAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isPending}>
                  Regenerar
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  Baixar JSON
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Sobre o Backup</p>
        <p>O backup é exportado em formato JSON e pode ser usado para migração ou recuperação de dados.</p>
        <p>Recomenda-se gerar backups regularmente e armazená-los em local seguro.</p>
        <p>Os dados incluem somente informações do tenant atual, sem dados de outros escritórios.</p>
      </div>
    </AppShell>
  );
}
