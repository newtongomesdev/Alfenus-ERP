import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRequestAction } from "../../actions";

export default async function NovoPedidoPage() {
  const context = await getAppContext();
  const canCreate = can(context.member?.role ?? "visualizador", "prazos.criar");

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title="Nova Solicitação" description="Você não tem permissão para criar solicitações." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-muted-foreground">
              Seu papel não possui permissão para criar solicitações.
            </p>
            <Link
              href="/solicitacoes-avancado/pedidos"
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Voltar
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Solicitação"
        description="Preencha os dados para criar uma nova solicitação."
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Dados da Solicitação</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRequestAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex.: RG do cliente, Contrato de prestação"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de Documento</Label>
                <select
                  id="documentType"
                  name="documentType"
                  defaultValue="outro"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="Comprovante de Residência">
                    Comprovante de Residência
                  </option>
                  <option value="Certidão">Certidão</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Procuração">Procuração</option>
                  <option value="Petição">Petição</option>
                  <option value="Sentença">Sentença</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="normal"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Prazo</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Detalhes da solicitação, documentos necessários, instruções para a equipe..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Criar Solicitação
              </button>
              <Link
                href="/solicitacoes-avancado/pedidos"
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
