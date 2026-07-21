"use client";

import { useState, useCallback, useRef } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import {
  Upload,
  FileText,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  Check,
  Merge,
  Scissors,
  FileOutput,
  FileMinus,
  RotateCw,
  Hash,
  Droplets,
  Image,
  Stamp,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  loadPdfFromFile,
  downloadPdf,
  parsePageRanges,
  parsePageRangeGroups,
  formatFileSize,
} from "@/lib/pdf/utils";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

type ToolId =
  | "unir"
  | "separar"
  | "extrair"
  | "remover"
  | "girar"
  | "numeracao"
  | "marca-agua"
  | "imagens"
  | "tarja"
  | "comprimir";

const TOOLS: {
  id: ToolId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    id: "unir",
    icon: Merge,
    title: "Unir PDFs",
    description: "Combine múltiplos arquivos PDF em um único documento.",
  },
  {
    id: "separar",
    icon: Scissors,
    title: "Separar PDF",
    description: "Divida um PDF em vários arquivos por páginas.",
  },
  {
    id: "extrair",
    icon: FileOutput,
    title: "Extrair Páginas",
    description: "Extraia páginas específicas de um PDF.",
  },
  {
    id: "remover",
    icon: FileMinus,
    title: "Remover Páginas",
    description: "Remova páginas específicas de um PDF.",
  },
  {
    id: "girar",
    icon: RotateCw,
    title: "Girar Páginas",
    description: "Rotacione todas as páginas de um PDF.",
  },
  {
    id: "numeracao",
    icon: Hash,
    title: "Inserir Numeração",
    description: "Adicione numeração de páginas ao documento.",
  },
  {
    id: "marca-agua",
    icon: Droplets,
    title: "Marca d'Água",
    description: "Insira texto como marca d'água nas páginas.",
  },
  {
    id: "imagens",
    icon: Image,
    title: "Imagens → PDF",
    description: "Converta imagens JPG, PNG ou WebP em PDF.",
  },
  {
    id: "tarja",
    icon: Stamp,
    title: "Tarja / Carimbo",
    description: "Insira tarjas como 'CONFIDENCIAL' no PDF.",
  },
  {
    id: "comprimir",
    icon: Minimize2,
    title: "Comprimir",
    description: "Reduza o tamanho removendo metadados.",
  },
];

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                      */
/* ------------------------------------------------------------------ */

async function convertToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar contexto de canvas");
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Falha ao converter imagem"));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function getFileExt(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : ".pdf";
}
function getFileName(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(0, idx) : name;
}

/* ------------------------------------------------------------------ */
/*  Shared UI components                                                */
/* ------------------------------------------------------------------ */

function DropZone({
  onFiles,
  accept,
  multiple = false,
  label = "Arraste arquivos aqui ou clique para selecionar",
  sublabel,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onFiles(dropped);
    },
    [onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 0) onFiles(selected);
      e.target.value = "";
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
    >
      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

function FileInfoBar({
  file,
  pageCount,
  onReset,
}: {
  file: File;
  pageCount?: number;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{file.name}</span>
        <Badge variant="secondary" className="shrink-0">
          {formatFileSize(file.size)}
        </Badge>
        {pageCount != null && (
          <Badge variant="outline" className="shrink-0">
            {pageCount} {pageCount === 1 ? "página" : "páginas"}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          onReset();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SuccessBanner({ message = "Arquivo processado com sucesso!" }: {
  message?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
      <Check className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function OptionGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 1 — Unir PDFs                                                 */
/* ------------------------------------------------------------------ */

function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = useCallback((newFiles: File[]) => {
    setError(null);
    setSuccess(false);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = newFiles.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  }, []);

  const moveFile = useCallback((index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const src = await loadPdfFromFile(file);
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      }
      await downloadPdf(merged, "unido.pdf");
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao unir os PDFs."
      );
    } finally {
      setProcessing(false);
    }
  }, [files]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Merge className="h-5 w-5" />
          Unir PDFs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DropZone
          onFiles={handleFiles}
          accept=".pdf,application/pdf"
          multiple
          sublabel="Selecione dois ou mais arquivos PDF"
        />

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Arquivos selecionados ({files.length})
            </p>
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${file.size}-${i}`}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <span className="font-medium text-muted-foreground w-6 text-center text-xs">
                    {i + 1}º
                  </span>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === 0}
                    onClick={() => moveFile(i, -1)}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === files.length - 1}
                    onClick={() => moveFile(i, 1)}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFile(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={handleProcess}
              disabled={processing || files.length < 2}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Merge className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Unir PDFs"}
            </Button>
          </div>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 2 — Separar PDF                                               */
/* ------------------------------------------------------------------ */

function SplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [mode, setMode] = useState<"range" | "each">("range");
  const [rangeInput, setRangeInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setRangeInput("");
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const pageCount = doc.getPageCount();
      const baseName = getFileName(file.name);

      if (mode === "each") {
        for (let i = 0; i < pageCount; i++) {
          const newDoc = await PDFDocument.create();
          const copied = await newDoc.copyPages(doc, [i]);
          newDoc.addPage(copied[0]);
          await downloadPdf(newDoc, `${baseName}_pag${i + 1}.pdf`);
          if (i < pageCount - 1)
            await new Promise((r) => setTimeout(r, 300));
        }
      } else {
        if (!rangeInput.trim()) {
          setError("Informe as faixas de páginas (ex: 1-3, 5, 7-10).");
          setProcessing(false);
          return;
        }
        const groups = parsePageRangeGroups(rangeInput, pageCount);
        if (groups.length === 0) {
          setError("Nenhuma página válida encontrada no intervalo informado.");
          setProcessing(false);
          return;
        }
        for (let g = 0; g < groups.length; g++) {
          const group = groups[g];
          const newDoc = await PDFDocument.create();
          const indices = group.map((p) => p - 1);
          const copied = await newDoc.copyPages(doc, indices);
          copied.forEach((p) => newDoc.addPage(p));
          const rangeStr =
            group.length === 1
              ? `${group[0]}`
              : `${group[0]}-${group[group.length - 1]}`;
          await downloadPdf(newDoc, `${baseName}_pag${rangeStr}.pdf`);
          if (g < groups.length - 1)
            await new Promise((r) => setTimeout(r, 300));
        }
      }
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao separar o PDF."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, mode, rangeInput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Separar PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />

            <div className="space-y-3">
              <Label>Modo de separação</Label>
              <OptionGroup
                options={[
                  { value: "range", label: "Por faixa" },
                  { value: "each", label: "Cada página" },
                ]}
                value={mode}
                onChange={(v) => setMode(v as "range" | "each")}
              />
              {mode === "range" && (
                <div className="space-y-1.5">
                  <Label htmlFor="split-range">
                    Faixas de páginas
                  </Label>
                  <Input
                    id="split-range"
                    placeholder="Ex: 1-3, 5, 7-10"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe vírgulas para faixas distintas. Cada faixa gera um
                    PDF separado.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleProcess}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Separar"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message="PDFs separados com sucesso!" />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 3 — Extrair Páginas                                           */
/* ------------------------------------------------------------------ */

function ExtractTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [pagesInput, setPagesInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setPagesInput("");
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const pages = parsePageRanges(pagesInput, doc.getPageCount());
      if (pages.length === 0) {
        setError("Informe páginas válidas (ex: 1, 3, 5-8).");
        setProcessing(false);
        return;
      }
      const newDoc = await PDFDocument.create();
      const indices = pages.map((p) => p - 1);
      const copied = await newDoc.copyPages(doc, indices);
      copied.forEach((p) => newDoc.addPage(p));
      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_extraido.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao extrair páginas."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, pagesInput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileOutput className="h-5 w-5" />
          Extrair Páginas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-1.5">
              <Label htmlFor="extract-pages">
                Páginas a extrair
              </Label>
              <Input
                id="extract-pages"
                placeholder="Ex: 1, 3, 5-8"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use vírgulas para páginas avulsas e hífens para intervalos.
              </p>
            </div>
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileOutput className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Extrair Páginas"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 4 — Remover Páginas                                           */
/* ------------------------------------------------------------------ */

function RemoveTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [pagesInput, setPagesInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setPagesInput("");
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const toRemove = parsePageRanges(pagesInput, doc.getPageCount());
      if (toRemove.length === 0) {
        setError("Informe páginas válidas para remover.");
        setProcessing(false);
        return;
      }
      const removeSet = new Set(toRemove.map((p) => p - 1));
      const keep = doc.getPageIndices().filter((i) => !removeSet.has(i));
      if (keep.length === 0) {
        setError("Não é possível remover todas as páginas.");
        setProcessing(false);
        return;
      }
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, keep);
      copied.forEach((p) => newDoc.addPage(p));
      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_sem_paginas.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao remover páginas."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, pagesInput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileMinus className="h-5 w-5" />
          Remover Páginas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-1.5">
              <Label htmlFor="remove-pages">
                Páginas a remover
              </Label>
              <Input
                id="remove-pages"
                placeholder="Ex: 2, 4, 6-8"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                As páginas informadas serão removidas do documento final.
              </p>
            </div>
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileMinus className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Remover Páginas"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 5 — Girar Páginas                                             */
/* ------------------------------------------------------------------ */

function RotateTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [rotation, setRotation] = useState<number>(90);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => newDoc.addPage(p));
      for (const page of newDoc.getPages()) {
        page.setRotation(degrees(rotation));
      }
      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_${rotation}graus.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao girar páginas."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, rotation]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCw className="h-5 w-5" />
          Girar Páginas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-3">
              <Label>Rotação (sentido horário)</Label>
              <OptionGroup
                options={[
                  { value: "90", label: "90°" },
                  { value: "180", label: "180°" },
                  { value: "270", label: "270°" },
                ]}
                value={String(rotation)}
                onChange={(v) => setRotation(Number(v))}
              />
            </div>
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Girar Páginas"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 6 — Inserir Numeração                                          */
/* ------------------------------------------------------------------ */

function NumberingTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState(12);
  const [prefix, setPrefix] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => newDoc.addPage(p));
      const font = await newDoc.embedFont(StandardFonts.Helvetica);
      const pages = newDoc.getPages();
      const margin = 30;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const text = `${prefix}${i + 1}`;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x: number;
        let y: number;

        switch (position) {
          case "bottom-right":
            x = width - textWidth - margin;
            y = margin;
            break;
          case "top-center":
            x = (width - textWidth) / 2;
            y = height - margin - fontSize;
            break;
          default:
            x = (width - textWidth) / 2;
            y = margin;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_numerado.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao inserir numeração."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, position, fontSize, prefix]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Inserir Numeração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Posição</Label>
                <OptionGroup
                  options={[
                    { value: "bottom-center", label: "Inferior centro" },
                    { value: "bottom-right", label: "Inferior direita" },
                    { value: "top-center", label: "Superior centro" },
                  ]}
                  value={position}
                  onChange={setPosition}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="num-size">Tamanho da fonte</Label>
                  <Input
                    id="num-size"
                    type="number"
                    min={6}
                    max={36}
                    value={fontSize}
                    onChange={(e) =>
                      setFontSize(Math.max(6, Math.min(36, Number(e.target.value))))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="num-prefix">Prefixo</Label>
                  <Input
                    id="num-prefix"
                    placeholder="Ex: Página "
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Inserir Numeração"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 7 — Marca d'Água                                              */
/* ------------------------------------------------------------------ */

function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [text, setText] = useState("CONFIDENCIAL");
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file || !text.trim()) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => newDoc.addPage(p));
      const font = await newDoc.embedFont(StandardFonts.HelveticaBold);

      for (const page of newDoc.getPages()) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(0.6, 0.6, 0.6),
          opacity,
          rotate: degrees(rotation),
        });
      }

      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_marca_agua.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao inserir marca d'água."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, text, fontSize, opacity, rotation]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Marca d&apos;Água
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wm-text">Texto da marca d&apos;água</Label>
                <Input
                  id="wm-text"
                  placeholder="Ex: CONFIDENCIAL"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wm-size">Tamanho</Label>
                  <Input
                    id="wm-size"
                    type="number"
                    min={12}
                    max={200}
                    value={fontSize}
                    onChange={(e) =>
                      setFontSize(Math.max(12, Math.min(200, Number(e.target.value))))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-opacity">Opacidade</Label>
                  <Input
                    id="wm-opacity"
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) =>
                      setOpacity(
                        Math.max(0.05, Math.min(1, Number(e.target.value)))
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wm-rotation">Rotação (°)</Label>
                  <Input
                    id="wm-rotation"
                    type="number"
                    min={-180}
                    max={180}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleProcess}
              disabled={processing || !text.trim()}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Droplets className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Aplicar Marca d'Água"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 8 — Converter Imagens para PDF                                 */
/* ------------------------------------------------------------------ */

function ImagesTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = useCallback((newFiles: File[]) => {
    setError(null);
    setSuccess(false);
    const imageFiles = newFiles.filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      setError("Selecione arquivos de imagem (JPG, PNG ou WebP).");
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = imageFiles.filter(
        (f) => !existing.has(f.name + f.size)
      );
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const newDoc = await PDFDocument.create();

      for (const file of files) {
        let imageBytes = new Uint8Array(await file.arrayBuffer());
        let image;

        if (
          file.type === "image/jpeg" ||
          file.type === "image/jpg"
        ) {
          image = await newDoc.embedJpg(imageBytes);
        } else if (file.type === "image/png") {
          image = await newDoc.embedPng(imageBytes);
        } else {
          const pngBytes = await convertToPng(file);
          image = await newDoc.embedPng(pngBytes);
        }

        const page = newDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      await downloadPdf(newDoc, "imagens.pdf");
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao converter imagens."
      );
    } finally {
      setProcessing(false);
    }
  }, [files]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Converter Imagens para PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DropZone
          onFiles={handleFiles}
          accept="image/jpeg,image/png,image/webp"
          multiple
          sublabel="JPG, PNG ou WebP — cada imagem vira uma página"
        />

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Imagens selecionadas ({files.length})
            </p>
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${file.size}-${i}`}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFile(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={handleProcess}
              disabled={processing || files.length === 0}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image className="h-4 w-4" />
              )}
              {processing
                ? "Convertendo…"
                : `Converter ${files.length} ${files.length === 1 ? "imagem" : "imagens"}`}
            </Button>
          </div>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message="PDF gerado com sucesso!" />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 9 — Tarja / Carimbo                                            */
/* ------------------------------------------------------------------ */

function StampTool() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [text, setText] = useState("CONFIDENCIAL");
  const [color, setColor] = useState("red");
  const [stampPosition, setStampPosition] = useState("diagonal");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setDoc(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setFile(f);
    try {
      setDoc(await loadPdfFromFile(f));
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!doc || !file || !text.trim()) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, doc.getPageIndices());
      copied.forEach((p) => newDoc.addPage(p));
      const font = await newDoc.embedFont(StandardFonts.HelveticaBold);

      const colorMap: Record<string, [number, number, number]> = {
        red: [0.85, 0, 0],
        blue: [0, 0, 0.8],
        black: [0.1, 0.1, 0.1],
      };
      const [r, g, b] = colorMap[color] || colorMap.red;
      const fontSize = 60;

      for (const page of newDoc.getPages()) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: 0.3,
          rotate: stampPosition === "diagonal" ? degrees(45) : degrees(0),
        });
      }

      await downloadPdf(
        newDoc,
        `${getFileName(file.name)}_carimbado.pdf`
      );
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao aplicar tarja."
      );
    } finally {
      setProcessing(false);
    }
  }, [doc, file, text, color, stampPosition]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stamp className="h-5 w-5" />
          Tarja / Carimbo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              pageCount={doc?.getPageCount()}
              onReset={reset}
            />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="stamp-text">Texto da tarja</Label>
                <Input
                  id="stamp-text"
                  placeholder="Ex: CONFIDENCIAL"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <OptionGroup
                  options={[
                    { value: "red", label: "Vermelho" },
                    { value: "blue", label: "Azul" },
                    { value: "black", label: "Preto" },
                  ]}
                  value={color}
                  onChange={setColor}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Posição</Label>
                <OptionGroup
                  options={[
                    { value: "diagonal", label: "Diagonal" },
                    { value: "center", label: "Centro" },
                  ]}
                  value={stampPosition}
                  onChange={setStampPosition}
                />
              </div>
            </div>
            <Button
              onClick={handleProcess}
              disabled={processing || !text.trim()}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stamp className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Aplicar Tarja"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool 10 — Comprimir                                                 */
/* ------------------------------------------------------------------ */

function CompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [newSize, setNewSize] = useState<number | null>(null);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setOriginalSize(0);
    setNewSize(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFile = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setSuccess(false);
    setNewSize(null);
    setFile(f);
    setOriginalSize(f.size);
    try {
      await loadPdfFromFile(f);
    } catch {
      setError("Não foi possível ler o arquivo PDF.");
      setFile(null);
      setOriginalSize(0);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setSuccess(false);
    setNewSize(null);
    try {
      const doc = await loadPdfFromFile(file);
      if (stripMetadata) {
        doc.setTitle("");
        doc.setAuthor("");
        doc.setSubject("");
        doc.setKeywords([]);
        doc.setProducer("");
        doc.setCreator("");
      }
      const pdfBytes = await doc.save({ useObjectStreams: true });
      setNewSize(pdfBytes.length);

      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getFileName(file.name)}_comprimido.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao comprimir o PDF."
      );
    } finally {
      setProcessing(false);
    }
  }, [file, stripMetadata]);

  const savings =
    originalSize > 0 && newSize != null
      ? Math.round(((originalSize - newSize) / originalSize) * 100)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minimize2 className="h-5 w-5" />
          Comprimir PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <DropZone onFiles={handleFile} accept=".pdf,application/pdf" />
        ) : (
          <>
            <FileInfoBar
              file={file}
              onReset={reset}
            />

            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamanho original:</span>
                <span className="font-medium">{formatFileSize(originalSize)}</span>
              </div>
              {newSize != null && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Novo tamanho:</span>
                    <span className="font-medium">{formatFileSize(newSize)}</span>
                  </div>
                  {savings != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Redução:</span>
                      <span
                        className={cn(
                          "font-medium",
                          savings > 0
                            ? "text-green-600 dark:text-green-400"
                            : savings < 0
                              ? "text-amber-600 dark:text-amber-400"
                              : ""
                        )}
                      >
                        {savings > 0 ? `${savings}%` : savings === 0 ? "—" : `+${Math.abs(savings)}%`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={stripMetadata}
                onCheckedChange={setStripMetadata}
              />
              <Label className="cursor-pointer">
                Remover metadados (título, autor, produtor, etc.)
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Nota: o pdf-lib reorganiza objetos internos, mas não realiza
              compressão de imagens. A principal redução vem da remoção de
              metadados e reestruturação do arquivo.
            </p>

            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
              {processing ? "Processando…" : "Comprimir"}
            </Button>
          </>
        )}

        {error && <ErrorBanner message={error} />}
        {success && (
          <SuccessBanner
            message={
              savings != null && savings > 0
                ? `PDF comprimido! Redução de ${savings}%.`
                : "PDF processado com sucesso!"
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main PdfTools Component                                             */
/* ------------------------------------------------------------------ */

export function PdfTools() {
  const [activeTool, setActiveTool] = useState<ToolId>("unir");

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <nav className="space-y-0.5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                  activeTool === tool.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tool.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {activeTool === "unir" && <MergeTool />}
        {activeTool === "separar" && <SplitTool />}
        {activeTool === "extrair" && <ExtractTool />}
        {activeTool === "remover" && <RemoveTool />}
        {activeTool === "girar" && <RotateTool />}
        {activeTool === "numeracao" && <NumberingTool />}
        {activeTool === "marca-agua" && <WatermarkTool />}
        {activeTool === "imagens" && <ImagesTool />}
        {activeTool === "tarja" && <StampTool />}
        {activeTool === "comprimir" && <CompressTool />}
      </main>
    </div>
  );
}
