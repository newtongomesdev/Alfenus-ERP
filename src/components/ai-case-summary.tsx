"use client";
import { useState } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiCaseSummary({ caseId }: { caseId: string }) {
  const [answer, setAnswer] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function generate() { setLoading(true); setError(""); const response = await fetch(`/api/ai/processos/${caseId}/resumo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const payload = await response.json().catch(() => ({})); if (!response.ok) setError(String(payload.error ?? "Não foi possível gerar o resumo.")); else setAnswer(String(payload.answer ?? "")); setLoading(false); }
  return <section className="rounded-lg border border-border bg-muted/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">Assistente de processo</p><p className="text-xs text-muted-foreground">Resumo baseado nos dados deste processo. Revise antes de usar.</p></div><Button type="button" onClick={generate} disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Bot className="size-4" />}{loading ? "Gerando..." : "Gerar resumo"}</Button></div>{error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}{answer ? <div className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">{answer}</div> : null}</section>;
}
