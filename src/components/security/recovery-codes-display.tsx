"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy, Download, CheckCircle2, KeyRound } from "lucide-react";

export function RecoveryCodesDisplay({
  codes,
  batchId,
}: {
  codes: string[];
  batchId: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyAll() {
    navigator.clipboard.writeText(codes.join("\n")).then(() => {
      setCopied(true);
      toast.success("Codigos copiados para a area de transferencia!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const content = [
      "========================================",
      "  CODIGOS DE RECUPERACAO - ERP JURIDICO",
      "========================================",
      "",
      "Guarde estes codigos em local seguro.",
      "Cada codigo pode ser usado apenas uma vez.",
      "",
      ...codes.map((c, i) => `  ${i + 1}. ${c}`),
      "",
      `Total de codigos: ${codes.length}`,
      "",
      "========================================",
      "IMPORTANTE: Estes codigos nao serao",
      "exibidos novamente. Se voce perder",
      "todos, precisara contatar o administrador.",
      "========================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codigos-recuperacao-${batchId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado com sucesso!");
  }

  return (
    <div className="space-y-4">
      {/* Header com aviso */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Estes codigos nao serao exibidos novamente.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Guarde estes codigos em local seguro. Cada codigo pode ser usado apenas uma vez.
            </p>
          </div>
        </div>
      </div>

      {/* Contador de codigos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {codes.length} codigo{codes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {codes.length} disponivel{codes.length !== 1 ? "eis" : ""}
        </Badge>
      </div>

      {/* Grid de codigos */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {codes.map((code, i) => (
          <div
            key={`${batchId}-${i}`}
            className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">
                {i + 1}.
              </span>
              <code className="font-mono text-sm font-medium tracking-wide">
                {code}
              </code>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success(`Codigo ${code} copiado!`);
              }}
              title={`Copiar codigo ${code}`}
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Botoes de acao */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopyAll}
        >
          {copied ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copiado!" : "Copiar todos"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="size-3.5" />
          Baixar
        </Button>
      </div>
    </div>
  );
}
