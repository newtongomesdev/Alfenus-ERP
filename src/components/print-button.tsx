"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted print:hidden"><Printer className="size-4" /> Imprimir</button>;
}
