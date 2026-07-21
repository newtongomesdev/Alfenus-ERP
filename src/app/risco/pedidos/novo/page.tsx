import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClaimAction } from "../../actions";

export default async function NovoPedidoPage() {
  const context = await getAppContext();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Pedido Processual"
        description="Registre um novo pedido de valor processual com dados do caso e valores."
        actions={
          <a
            href="/risco/pedidos"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createClaimAction.bind(null, "/risco/pedidos")}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="description">Descricao *</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Descreva o pedido processual..."
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <select
                  id="category"
                  name="category"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="tributario">Tributario</option>
                  <option value="civil">Civil</option>
                  <option value="trabalhista">Trabalhista</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="penal">Penal</option>
                  <option value="ambiental">Ambiental</option>
                  <option value="consumidor">Consumidor</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="indexName">Indice de Correcao</Label>
                <select
                  id="indexName"
                  name="indexName"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Nenhum</option>
                  <option value="IPCA">IPCA</option>
                  <option value="IGPM">IGP-M</option>
                  <option value="INPC">INPC</option>
                  <option value="TR">TR</option>
                  <option value="SELIC">SELIC</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originalValue">Valor Original (R$)</Label>
                <Input
                  id="originalValue"
                  name="originalValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="updatedValue">Valor Atualizado (R$)</Label>
                <Input
                  id="updatedValue"
                  name="updatedValue"
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
                <Label htmlFor="legalCaseId">ID do Processo</Label>
                <Input
                  id="legalCaseId"
                  name="legalCaseId"
                  placeholder="UUID do processo vinculado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observacoes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Detalhes adicionais sobre o pedido."
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Criar Pedido
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
