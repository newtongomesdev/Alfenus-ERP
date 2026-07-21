import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRequestAction } from "../../actions";

export default async function NovaSolicitacaoPage() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Solicitacao de Contrato"
        description="Registre uma nova solicitacao de contrato com categoria, tipo e prioridade."
      />

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Dados da Solicitacao</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createRequestAction.bind(null, "/clm/solicitacoes")}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Contrato de prestacao de servicos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Descreva brevemente o objeto do contrato."
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
                  <option value="juridico">Juridico</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="empresarial">Empresarial</option>
                  <option value="trabalhista">Trabalhista</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Tipo de Contrato</Label>
                <Input
                  id="contractType"
                  name="contractType"
                  placeholder="Ex: Prestacao de servicos, Locacao"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade *</Label>
                <select
                  id="priority"
                  name="priority"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="baixa">Baixa</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="necessaryDate">Data Necessaria</Label>
                <Input id="necessaryDate" name="necessaryDate" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientId">ID do Cliente</Label>
                <Input
                  id="clientId"
                  name="clientId"
                  placeholder="UUID do cliente vinculado"
                />
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

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Criar Solicitacao
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
