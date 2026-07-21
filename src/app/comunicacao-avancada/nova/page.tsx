import { getAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMessageAction } from "../actions";

export default async function NovaMensagemPage() {
  const context = await getAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Mensagem"
        description="Envie uma nova mensagem para a equipe ou clientes."
        actions={
          <a
            href="/comunicacao-avancada/mensagens"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Dados da Mensagem</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createMessageAction.bind(null, "/comunicacao-avancada/nova")}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Assunto da mensagem..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteudo *</Label>
              <textarea
                id="content"
                name="content"
                rows={6}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Escreva o conteudo da mensagem..."
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  name="type"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="mensagem">Mensagem</option>
                  <option value="notificacao">Notificacao</option>
                  <option value="aviso">Aviso</option>
                  <option value="lembrete">Lembrete</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibilidade</Label>
                <select
                  id="visibility"
                  name="visibility"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="equipe">Equipe</option>
                  <option value="publica">Publica</option>
                  <option value="privada">Privada</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">Destinatarios</Label>
              <Input
                id="recipients"
                name="recipients"
                placeholder="Separados por virgula (ex: joao@escritorio.com, maria@escritorio.com)"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Enviar Mensagem
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
