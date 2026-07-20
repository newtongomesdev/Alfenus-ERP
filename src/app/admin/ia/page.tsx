import { getAdminContext } from "@/lib/admin/auth";
import { getAiSettings, getOpenRouterModels } from "@/lib/ai/openrouter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAiSettings } from "./actions";
import { ModelCombobox } from "@/components/admin/model-combobox";

export default async function AdminAiPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const { adminClient } = await getAdminContext();
  const [models, settings] = await Promise.all([getOpenRouterModels(), getAiSettings()]);
  const { data: usage } = await (adminClient as any).from("ai_usage_logs").select("law_firm_id, model, operation, total_tokens, cost_usd, created_at").order("created_at", { ascending: false }).limit(500);
  const usageRows = (usage ?? []) as Array<{ law_firm_id: string | null; model: string; operation: string; total_tokens: number; cost_usd: number; created_at: string }>;
  const totalCost = usageRows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0);
  const totalTokens = usageRows.reduce((sum, row) => sum + Number(row.total_tokens || 0), 0);
  const textModels = models.filter((model) => model.id).slice(0, 500);
  const params = await searchParams;
  return <div className="space-y-6">
    <PageHeader title="IA e RAG" description="Escolha os modelos OpenRouter e acompanhe os custos do Alfenus." />
    {params.salvo === "1" ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">Configuração salva com sucesso.</div> : null}
    <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Custo registrado</p><p className="mt-1 text-2xl font-semibold">US$ {totalCost.toFixed(4)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Tokens processados</p><p className="mt-1 text-2xl font-semibold">{totalTokens.toLocaleString("pt-BR")}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Chamadas</p><p className="mt-1 text-2xl font-semibold">{usageRows.length}</p></CardContent></Card></div>
    <Card className="relative z-30 overflow-visible"><CardHeader><CardTitle>Configuração global</CardTitle><CardDescription>O modelo escolhido será usado pelos assistentes do Alfenus.</CardDescription></CardHeader><CardContent className="relative z-30"><form action={saveAiSettings} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><ModelCombobox models={textModels.map((model) => ({ id: String(model.id), name: model.name ? String(model.name) : undefined }))} value={settings.active_model} /><select name="embeddingModel" defaultValue={settings.embedding_model} className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option value="openai/text-embedding-3-small">Modelo de embeddings</option><option value="openai/text-embedding-3-small">OpenAI Embeddings 3 Small</option></select><label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> Ativar IA</label><button className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground md:col-span-3 md:w-fit">Salvar configuração</button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Modelos disponíveis ({textModels.length})</CardTitle><CardDescription>Catálogo atual da OpenRouter, com preços por token.</CardDescription></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-2">{textModels.map((model) => { const pricing = model.pricing as Record<string, string> | undefined; return <div key={String(model.id)} className="rounded-lg border border-border p-3"><p className="font-medium">{String(model.name ?? model.id)}</p><p className="text-xs text-muted-foreground">{String(model.id)}</p><p className="mt-2 text-xs text-muted-foreground">Entrada: {pricing?.prompt ?? "-"} · Saída: {pricing?.completion ?? "-"}</p></div>; })}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Uso recente</CardTitle><CardDescription>Custos registrados por chamada, modelo e escritório.</CardDescription></CardHeader><CardContent><div className="space-y-2">{usageRows.slice(0, 30).map((row, index) => <div key={`${row.created_at}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"><span>{row.operation} · {row.model}</span><span className="text-muted-foreground">{row.total_tokens.toLocaleString("pt-BR")} tokens · US$ {Number(row.cost_usd).toFixed(6)}</span></div>)}{usageRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma chamada registrada.</p> : null}</div></CardContent></Card>
  </div>;
}
