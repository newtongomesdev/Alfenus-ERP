"use client";

import { useState, useRef } from "react";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadClientDocumentFromPortalAction } from "./actions";

interface PortalDocumentUploadProps {
  token: string;
  requestId: string;
  title: string;
}

export function PortalDocumentUpload({ token, requestId, title }: PortalDocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadClientDocumentFromPortalAction(token, requestId, formData);

      if (result.error) {
        toast.error("Erro no envio", { description: result.error });
      } else {
        toast.success("Documento enviado", { description: "Sua solicitação foi concluída com sucesso." });
        setFile(null);
      }
    } catch (error) {
      toast.error("Erro inesperado", { description: "Não foi possível enviar o documento." });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed p-4 text-center">
      {!file ? (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Anexar documento</p>
          <p className="text-xs text-muted-foreground">Envie o documento solicitado ({title})</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
            Selecionar arquivo
          </Button>
          <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md bg-muted p-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{file.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFile(null)} disabled={isUploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {file && (
        <Button className="mt-3 w-full" onClick={handleUpload} disabled={isUploading}>
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? "Enviando..." : "Enviar documento"}
        </Button>
      )}
    </div>
  );
}
