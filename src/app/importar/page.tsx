"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { importCsvAction, type ImportActionError } from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { EntityType, CsvColumnMapping } from "@/lib/import/csv-parser";

const ENTITY_OPTIONS: Array<{ value: EntityType; label: string }> = [
  { value: "client", label: "Clientes" },
  { value: "lead", label: "Leads" },
];

const COMMON_MAPPINGS: Record<EntityType, CsvColumnMapping[]> = {
  client: [
    { csvColumn: "name", targetField: "name" },
    { csvColumn: "email", targetField: "email" },
    { csvColumn: "phone", targetField: "phone" },
    { csvColumn: "whatsapp", targetField: "whatsapp" },
    { csvColumn: "document", targetField: "document" },
    { csvColumn: "personType", targetField: "personType" },
    { csvColumn: "address", targetField: "address" },
    { csvColumn: "city", targetField: "city" },
    { csvColumn: "state", targetField: "state" },
    { csvColumn: "notes", targetField: "notes" },
    { csvColumn: "tags", targetField: "tags" },
  ],
  lead: [
    { csvColumn: "name", targetField: "name" },
    { csvColumn: "email", targetField: "email" },
    { csvColumn: "phone", targetField: "phone" },
    { csvColumn: "whatsapp", targetField: "whatsapp" },
    { csvColumn: "interest", targetField: "interest" },
    { csvColumn: "source", targetField: "source" },
    { csvColumn: "notes", targetField: "notes" },
  ],
};

type ImportResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ lineNumber: number; message: string }>;
  importedCount: number;
};

export default function ImportarPage() {
  const [entityType, setEntityType] = useState<EntityType>("client");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<ImportActionError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      const previewRows = lines.slice(0, 6).map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
      );
      setPreview(previewRows);
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    if (!csvContent) return;
    setImporting(true);
    setError(null);

    const mapping = COMMON_MAPPINGS[entityType];
    const response = await importCsvAction(entityType, csvContent, mapping);

    if (response.error) {
      setError(response.error);
    } else if (response.result) {
      setResult(response.result);
    }
    setImporting(false);
  };

  const errorMessages: Record<ImportActionError, string> = {
    ambiente: "Configure o Supabase antes de importar.",
    permissao: "Seu papel não tem permissão para importar.",
    importacao: "Erro durante a importação.",
  };

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Importar Dados"
        description="Importe clientes e leads a partir de arquivos CSV"
        actions={
          <Link href={entityType === "client" ? "/clientes" : "/leads"}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span>{errorMessages[error]}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuração da Importação</CardTitle>
            <CardDescription>Selecione o tipo de entidade e o arquivo CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Dados</Label>
              <div className="flex gap-2 mt-1">
                {ENTITY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={entityType === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setEntityType(opt.value); setResult(null); setPreview([]); setCsvContent(null); }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Arquivo CSV</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {fileName || "Selecionar arquivo"}
              </Button>
            </div>

            {csvContent && (
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importando..." : `Importar ${entityType === "client" ? "Clientes" : "Leads"}`}
              </Button>
            )}
          </CardContent>
        </Card>

        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview do Arquivo</CardTitle>
              <CardDescription>
                {fileName} — {preview.length > 1 ? `${preview.length - 1} linhas de dados (preview)` : "Apenas cabeçalho"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      {preview[0]?.map((cell, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-b last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className={result.importedCount > 0 ? "border-green-200" : "border-destructive"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.importedCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{result.totalRows}</div>
                  <div className="text-sm text-muted-foreground">Total de linhas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{result.importedCount}</div>
                  <div className="text-sm text-muted-foreground">Importados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{result.duplicateRows}</div>
                  <div className="text-sm text-muted-foreground">Duplicados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{result.invalidRows}</div>
                  <div className="text-sm text-muted-foreground">Inválidos</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Erros encontrados:
                  </div>
                  <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <div key={i} className="text-destructive">
                        Linha {err.lineNumber}: {err.message}
                      </div>
                    ))}
                    {result.errors.length > 20 && (
                      <div className="text-muted-foreground">
                        ... e mais {result.errors.length - 20} erros
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
