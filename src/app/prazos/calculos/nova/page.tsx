import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCalculationAction } from "../actions";

export default async function NewCalculationPage() {
  const context = await getAppContext();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Calculação de Prazo"
        description="Calcule um prazo jurídico com base em dias úteis, feriados e suspensões."
        actions={
          <a
            href="/prazos/calculos"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Parâmetros do Cálculo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCalculationAction} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tribunal">Tribunal *</Label>
                <Input
                  id="tribunal"
                  name="tribunal"
                  placeholder="Ex.: TJSP, TRT2, STJ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdition">Jurisdição</Label>
                <Input
                  id="jurisdition"
                  name="jurisdition"
                  placeholder="Ex.: São Paulo"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="procedureType">Tipo de Procedimento</Label>
                <select
                  id="procedureType"
                  name="procedureType"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="civel">Cível</option>
                  <option value="criminal">Criminal</option>
                  <option value="trabalhista">Trabalhista</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="tributario">Tributário</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendarId">Calendário</Label>
                <select
                  id="calendarId"
                  name="calendarId"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Nenhum (dias corridos apenas)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Regra Processual</Label>
              <textarea
                id="ruleDescription"
                name="ruleDescription"
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Ex.: Art. 219 do CPC — contagem em dias úteis"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="disponibilizedAt">Data de Disponibilização</Label>
                <Input
                  id="disponibilizedAt"
                  name="disponibilizedAt"
                  type="date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishedAt">Data de Publicação</Label>
                <Input id="publishedAt" name="publishedAt" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledgeAt">Data de Ciência</Label>
                <Input id="knowledgeAt" name="knowledgeAt" type="date" />
              </div>
            </div>

            <hr className="border-border" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={15}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <select
                  id="unit"
                  name="unit"
                  defaultValue="dias"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="dias">Dias</option>
                  <option value="horas">Horas</option>
                  <option value="meses">Meses</option>
                  <option value="anos">Anos</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="businessDays"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 rounded border-input"
                />
                Dias úteis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="includeStartDate"
                  value="true"
                  className="h-4 w-4 rounded border-input"
                />
                Incluir data inicial
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="includeEndDate"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 rounded border-input"
                />
                Incluir data final
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Justificativa, referências ou detalhes adicionais."
              />
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              O cálculo automático precisa de revisão profissional antes de
              ser considerado definitivo. Não substitui análise jurídica.
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Calcular e Salvar
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
