import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { createPublication } from "@/lib/controladoria/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovaPublicacaoPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  async function handleCreate(formData: FormData) {
    "use server";
    const ctx = await getAppContext();
    if (ctx.status !== "ready") redirect("/entrar");

    await createPublication(ctx, {
      tribunal: String(formData.get("tribunal") ?? ""),
      diario: String(formData.get("diario") ?? "") || undefined,
      caseNumber: String(formData.get("caseNumber") ?? "") || undefined,
      disponibilizedAt: String(formData.get("disponibilizedAt") ?? "") || undefined,
      publishedAt: String(formData.get("publishedAt") ?? "") || undefined,
      content: String(formData.get("content") ?? "") || undefined,
      summary: String(formData.get("summary") ?? "") || undefined,
      publicationType: String(formData.get("publicationType") ?? "despacho"),
      priority: String(formData.get("priority") ?? "normal"),
    });

    redirect("/controladoria/publicacoes");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nova Publicacao" description="Registrar uma nova publicacao processual." />

      <Card className="rounded-lg max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da Publicacao</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Tribunal *</span>
                <input name="tribunal" required className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="TJSP, TRT, STJ..." />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Diario</span>
                <input name="diario" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="DOU, DJE..." />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Tipo</span>
                <select name="publicationType" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="despacho">Despacho</option>
                  <option value="intimacao">Intimacao</option>
                  <option value="decisao">Decisao</option>
                  <option value="sentenca">Sentenca</option>
                  <option value="acordao">Acordao</option>
                  <option value="citacao">Citacao</option>
                  <option value="publicacao_administrativa">Publ. Administrativa</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Prioridade</span>
                <select name="priority" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="normal">Normal</option>
                  <option value="baixa">Baixa</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Numero do Processo</span>
                <input name="caseNumber" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Data de Disponibilizacao</span>
                <input name="disponibilizedAt" type="date" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Data de Publicacao</span>
                <input name="publishedAt" type="date" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Resumo</span>
              <textarea name="summary" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Conteudo Integral</span>
              <textarea name="content" rows={6} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-3">
              <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
                Criar Publicacao
              </button>
              <a href="/controladoria/publicacoes" className="h-9 inline-flex items-center rounded-lg border border-input px-4 text-sm font-medium transition hover:bg-accent">
                Cancelar
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
