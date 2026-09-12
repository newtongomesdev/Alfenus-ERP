import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRiskAssessmentAction } from "../../actions";

export default async function NovaAvaliacaoPage() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Avaliacao de Risco"
        description="Registre uma avaliacao de risco processual com classificacao, cenario e valor estimado."
        actions={
          <a
            href="/risco/avaliacoes"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Dados da Avaliacao</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createRiskAssessmentAction.bind(
              null,
              "/risco/avaliacoes"
            )}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classification">Classificacao *</Label>
                <select
                  id="classification"
                  name="classification"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="baixo">Baixo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                  <option value="critico">Critico</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scenario">Cenario *</Label>
                <select
                  id="scenario"
                  name="scenario"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="otimista">Otimista</option>
                  <option value="base">Base</option>
                  <option value="pessimista">Pessimista</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="probability">
                  Probabilidade (%)
                </Label>
                <Input
                  id="probability"
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0 a 100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedValue">
                  Valor Estimado (R$)
                </Label>
                <Input
                  id="estimatedValue"
                  name="estimatedValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseDate">Data Base</Label>
                <Input id="baseDate" name="baseDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimId">ID do Pedido</Label>
                <Input
                  id="claimId"
                  name="claimId"
                  placeholder="UUID do pedido vinculado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justificativa</Label>
              <textarea
                id="justification"
                name="justification"
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Justifique a classificacao e o cenario escolhido."
              />
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              A avaliacao de risco precisa de revisao profissional antes de
              ser considerada definitiva. Nao substitui analise juridica.
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Criar Avaliacao
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
