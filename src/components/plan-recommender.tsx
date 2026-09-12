"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const planLabels = { starter: "Starter", professional: "Professional", business: "Business" } as const;

export function PlanRecommender() {
  const [processes, setProcesses] = useState(20);
  const [team, setTeam] = useState("1");
  const [needsFinance, setNeedsFinance] = useState(false);
  const [needsGovernance, setNeedsGovernance] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const recommendation = useMemo(() => {
    if (needsGovernance || team === "6+") return "business";
    if (needsFinance || team === "3-5" || processes > 100) return "professional";
    return "starter";
  }, [needsFinance, needsGovernance, processes, team]);

  function reset() {
    setProcesses(20); setTeam("1"); setNeedsFinance(false); setNeedsGovernance(false); setSubmitted(false);
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-4" /> Calculadora inteligente</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Descubra o plano ideal para sua rotina.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Responda quatro perguntas rápidas. A recomendação é uma orientação inicial e pode ser ajustada no checkout.</p>
        </div>
        {submitted ? <Button type="button" variant="outline" size="sm" onClick={reset}><RotateCcw className="size-4" /> Refazer</Button> : null}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Processos ativos
          <span className="flex items-center justify-between text-xs font-normal text-muted-foreground"><span>Até 20</span><strong className="text-foreground">{processes} processos</strong><span>500+</span></span>
          <input type="range" min="20" max="500" step="10" value={processes} onChange={(event) => setProcesses(Number(event.target.value))} className="w-full accent-primary" />
        </label>
        <label className="space-y-2 text-sm font-medium">Tamanho da equipe
          <select value={team} onChange={(event) => setTeam(event.target.value)} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="1">Somente eu</option><option value="2">2 pessoas</option><option value="3-5">3 a 5 pessoas</option><option value="6+">Mais de 5 pessoas</option>
          </select>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-sm"><input type="checkbox" checked={needsFinance} onChange={(event) => setNeedsFinance(event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Financeiro integrado</strong><span className="text-xs text-muted-foreground">Contratos, parcelas, pagamentos e relatórios.</span></span></label>
        <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 text-sm"><input type="checkbox" checked={needsGovernance} onChange={(event) => setNeedsGovernance(event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Governança avançada</strong><span className="text-xs text-muted-foreground">Equipe, permissões, auditoria e privacidade.</span></span></label>
      </div>
      {!submitted ? <Button type="button" className="mt-7" onClick={() => setSubmitted(true)}>Ver meu plano <ArrowRight className="size-4" /></Button> : <div className="mt-7 flex flex-col gap-4 rounded-xl border border-primary/20 bg-background p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Recomendação personalizada</p><p className="mt-1 text-xl font-bold">Plano {planLabels[recommendation]}</p><p className="mt-1 text-sm text-muted-foreground">Esse plano acompanha melhor o volume e a estrutura informados.</p></div><a className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90" href="/cadastrar">Começar agora <ArrowRight className="size-4" /></a></div>}
    </section>
  );
}
