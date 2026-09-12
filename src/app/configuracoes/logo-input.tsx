"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LogoInput({ initialLogoUrl }: { initialLogoUrl?: string | null }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl ?? null);

  useEffect(() => {
    setPreviewUrl(initialLogoUrl ?? null);
  }, [initialLogoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setFileName(null);
      setPreviewUrl(initialLogoUrl ?? null);
    }
  };

  return (
    <div className="space-y-3">
      {previewUrl && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-3 w-fit">
          <img 
            src={previewUrl} 
            alt="Pré-visualização da Logo" 
            className="h-12 w-28 object-contain object-left border bg-white p-1 rounded" 
          />
          <div className="text-xs">
            <span className="font-semibold text-foreground">Visualização da Logo</span>
            <p className="text-muted-foreground">Esta imagem aparecerá nos PDFs e na barra superior.</p>
          </div>
        </div>
      )}
      <div className="relative">
        <Input 
          id="logo" 
          name="logo" 
          type="file" 
          accept="image/png,image/jpeg" 
          className="h-9 text-sm pr-40 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          onChange={handleFileChange}
        />
        {fileName && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[var(--chart-2)]">
            <CheckCircle2 className="mr-1.5 size-4" />
            Anexado
          </div>
        )}
      </div>
    </div>
  );
}
