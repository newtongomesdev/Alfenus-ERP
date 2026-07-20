"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LogoInput() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="relative">
      <Input 
        id="logo" 
        name="logo" 
        type="file" 
        accept="image/png,image/jpeg" 
        className="h-9 text-sm pr-40 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
          } else {
            setFileName(null);
          }
        }}
      />
      {fileName && (
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[var(--chart-2)]">
          <CheckCircle2 className="mr-1.5 size-4" />
          Anexado
        </div>
      )}
    </div>
  );
}
