"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DataJudLookup() {
  const [tribunal, setTribunal] = useState("tjsp");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true); setMessage(""); setResult(null);
    const response = await fetch("/api/datajud/consultar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tribunal, numeroProcesso }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(String(payload.error ?? "Não foi possível consultar o processo."));
    else if (!payload.results?.length) setMessage("Nenhum processo encontrado no DataJud.");
    else setResult(payload.results[0]);
    setLoading(false);
  }

  return <div className="rounded-lg border border-border bg-muted/20 p-4"><div className="mb-3"><p className="font-medium">Consultar no DataJud</p><p className="text-xs text-muted-foreground">Pesquisa sob demanda nos metadados públicos do tribunal.</p></div><div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end"><div className="space-y-2"><Label htmlFor="datajudTribunal">Tribunal</Label><Input id="datajudTribunal" value={tribunal} onChange={(event) => setTribunal(event.target.value)} placeholder="tjsp" /></div><div className="space-y-2"><Label htmlFor="datajudNumber">Número do processo</Label><Input id="datajudNumber" value={numeroProcesso} onChange={(event) => setNumeroProcesso(event.target.value)} placeholder="0000000-00.0000.0.00.0000" /></div><Button type="button" onClick={search} disabled={loading}><Search className="size-4" />{loading ? "Consultando..." : "Consultar"}</Button></div>{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}{result ? <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm"><p className="font-medium">Processo encontrado</p><p className="mt-1 text-muted-foreground">{String(result.numeroProcesso ?? result.numero ?? numeroProcesso)}</p><p className="text-xs text-muted-foreground">Confira os dados antes de preencher o cadastro.</p></div> : null}</div>;
}
