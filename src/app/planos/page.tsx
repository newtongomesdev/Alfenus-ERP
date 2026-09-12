import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PlanRecommender } from "@/components/plan-recommender";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const plans = [
  {
    name: "Starter",
    id: "starter",
    description: "Para escritórios que querem organizar a operação desde o primeiro dia.",
    features: ["Clientes e leads", "Processos e prazos", "Agenda e tarefas", "Documentos seguros"],
  },
  {
    name: "Professional",
    id: "professional",
    description: "Para equipes que precisam conectar operação, financeiro e produtividade.",
    features: ["Tudo do Starter", "Contratos e recebimentos", "Relatórios gerenciais", "Gestão de equipe e permissões"],
    featured: true,
  },
  {
    name: "Business",
    id: "business",
    description: "Para operações jurídicas maiores, com mais controle e escala.",
    features: ["Tudo do Professional", "Múltiplos escritórios", "Governança e auditoria", "Atendimento prioritário"],
  },
];

export default async function PlansPage() {
  const supabase = await getSupabaseServerClient();
  const { data: configuredPlans } = supabase ? await (supabase as any).from("plan_settings").select("id,name,description,price_cents").eq("active", true) : { data: [] };
  const displayPlans = plans.map((plan) => {
    const configured = (configuredPlans ?? []).find((item: { id: string }) => item.id === plan.id);
    return { ...plan, name: configured?.name ?? plan.name, description: configured?.description || plan.description, priceCents: configured?.price_cents ?? 0 };
  });
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Alfenus</Link>
          <Link href="/entrar" className="text-sm text-muted-foreground underline underline-offset-4">Entrar</Link>
        </div>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Planos Alfenus</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Escolha o ritmo do seu escritório.</h1>
          <p className="mt-5 text-muted-foreground">Comece com o essencial e evolua conforme sua operação cresce. Todos os planos incluem ambiente seguro e teste inicial.</p>
        </div>
        <PlanRecommender />
        <div className="grid gap-5 lg:grid-cols-3">
          {displayPlans.map((plan) => (
            <article key={plan.name} className={`relative flex flex-col rounded-2xl border p-7 ${plan.featured ? "border-primary bg-primary/[0.04] shadow-lg shadow-primary/10" : "border-border/60 bg-card"}`}>
              {plan.featured ? <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Mais escolhido</span> : null}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
              <p className="mt-5 text-2xl font-bold">{plan.priceCents > 0 ? `R$ ${(plan.priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês` : "Grátis"}</p>
              <div className="mt-7 border-t border-border/60 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inclui</p>
                <ul className="mt-4 space-y-3 text-sm">
                  {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />{feature}</li>)}
                </ul>
              </div>
              <Link href="/cadastrar" className={`mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${plan.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-muted"}`}>Começar agora <ArrowRight className="size-4" /></Link>
            </article>
          ))}
        </div>
        <section className="mt-20">
          <div className="text-center"><h2 className="text-2xl font-bold tracking-tight">Compare o que cada plano inclui</h2><p className="mt-2 text-sm text-muted-foreground">Uma visão rápida para escolher com segurança.</p></div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60 bg-card">
            <table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border/60 bg-muted/30"><tr><th className="px-5 py-4 font-semibold">Recurso</th><th className="px-5 py-4 font-semibold">Starter</th><th className="px-5 py-4 font-semibold">Professional</th><th className="px-5 py-4 font-semibold">Business</th></tr></thead><tbody className="divide-y divide-border/60">{[["Clientes e leads", "Incluído", "Incluído", "Incluído"], ["Processos e prazos", "Incluído", "Incluído", "Incluído"], ["Agenda e tarefas", "Incluído", "Incluído", "Incluído"], ["Contratos e recebimentos", "-", "Incluído", "Incluído"], ["Relatórios gerenciais", "-", "Incluído", "Incluído"], ["Equipe e permissões", "-", "Incluído", "Incluído"], ["Privacidade e auditoria", "Base", "Avançado", "Avançado"]].map(([feature, starter, professional, business]) => <tr key={feature}><td className="px-5 py-3.5 font-medium">{feature}</td><td className="px-5 py-3.5 text-muted-foreground">{starter}</td><td className="px-5 py-3.5 text-muted-foreground">{professional}</td><td className="px-5 py-3.5 text-muted-foreground">{business}</td></tr>)}</tbody></table>
          </div>
        </section>
        <section className="mx-auto mt-20 max-w-3xl"><h2 className="text-center text-2xl font-bold tracking-tight">Perguntas frequentes</h2><div className="mt-8 space-y-3">{[["Posso mudar de plano depois?", "Sim. O plano pode ser ajustado conforme a equipe e a operação do escritório evoluem."], ["Existe período de teste?", "O cadastro inicia a configuração do ambiente. As condições comerciais aparecem antes da contratação."], ["O pagamento é seguro?", "A cobrança é processada pelo Stripe. O Alfenus não armazena dados completos de cartão."], ["Preciso contratar um plano para começar?", "Não. Você pode criar sua conta e conhecer o ambiente antes de escolher a assinatura."]].map(([question, answer]) => <details key={question} className="group rounded-xl border border-border/60 bg-card p-5"><summary className="cursor-pointer list-none font-semibold">{question}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p></details>)}</div></section>
        <p className="mt-10 text-center text-xs text-muted-foreground">Os valores e condições comerciais são apresentados no momento da contratação.</p>
      </div>
    </main>
  );
}
