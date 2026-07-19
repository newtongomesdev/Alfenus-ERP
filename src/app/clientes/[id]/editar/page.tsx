import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateClientAction } from "@/app/clientes/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getClientDetail } from "@/lib/clients/queries";

const errorMessages: Record<string, string> = {
  ambiente: "Configure o Supabase antes de editar clientes.",
  permissao: "Seu papel não tem permissão para editar clientes.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível atualizar o cliente. Tente novamente.",
};

function EditClientUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para editar clientes."
      : status === "signed-out"
        ? "Entre para editar clientes."
        : "Crie o primeiro escritório antes de editar clientes.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Editar cliente" description="Atualize os dados cadastrais sem alterar contratos ou processos." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{message}</p>
            {status !== "missing-env" ? (
              <Link
                href={href}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                {action}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const context = await getAppContext();
  const routeParams = await params;
  const query = await searchParams;

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <EditClientUnavailable status={context.status} />;
  }

  const client = await getClientDetail(context.lawFirm.id, routeParams.id);

  if (!client) {
    notFound();
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href={`/clientes/${client.id}`}>
          <ArrowLeft className="size-4" />
          Voltar para o perfil
        </Link>

        <PageHeader title="Editar cliente" description="Atualize apenas os dados cadastrais. Contratos, processos e parcelas continuam em fluxos próprios." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
            <CardDescription>Alterações sensíveis são registradas no log de auditoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateClientAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="clientId" value={client.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do cliente</Label>
                <Input id="name" name="name" defaultValue={client.name} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personType">Tipo de pessoa</Label>
                <select
                  id="personType"
                  name="personType"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={client.personType}
                >
                  <option value="fisica">Pessoa física</option>
                  <option value="juridica">Pessoa jurídica</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF ou CNPJ</Label>
                <Input id="document" name="document" defaultValue={client.document ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input id="birthDate" name="birthDate" type="date" defaultValue={client.birthDate ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input id="profession" name="profession" defaultValue={client.profession ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Estado civil</Label>
                <select
                  id="maritalStatus"
                  name="maritalStatus"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={client.maritalStatus ?? ""}
                >
                  <option value="">Não informado</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União estável</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={client.whatsapp ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <select
                  id="source"
                  name="source"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={client.source ?? ""}
                >
                  <option value="">Não informada</option>
                  <option value="indicação">Indicação</option>
                  <option value="site">Site</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestArea">Área de interesse</Label>
                <Input id="interestArea" name="interestArea" defaultValue={client.interestArea ?? ""} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={client.status === "arquivado" ? "inativo" : client.status}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" name="tags" defaultValue={client.tags.join(", ")} />
                <p className="text-xs text-muted-foreground">Separe tags por vírgula.</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={client.notes ?? ""}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href={`/clientes/${client.id}`}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
