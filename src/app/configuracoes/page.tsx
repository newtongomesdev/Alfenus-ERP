import { Check, CircleAlert, CircleMinus, Pencil, ExternalLink } from "lucide-react";
import Link from "next/link";

import { updateLawFirmAction, deleteOwnAccountAction } from "@/app/configuracoes/actions";
import { LogoInput } from "./logo-input";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { BillingActions } from "@/components/billing-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can, permissions, roles, type Permission, type Role } from "@/lib/auth/permissions";
import { getAppContext, getLawFirmMembers } from "@/lib/auth/context";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const permissionLabels: Record<Permission, string> = {
  "clientes.visualizar": "Ver clientes",
  "clientes.criar": "Criar clientes",
  "clientes.editar": "Editar clientes",
  "clientes.arquivar": "Arquivar clientes",
  "leads.pipeline": "Ver pipeline",
  "leads.editar": "Editar leads",
  "leads.criar": "Criar leads",
  "leads.visualizar": "Ver leads",
  "processos.visualizar": "Ver processos",
  "processos.criar": "Criar processos",
  "processos.editar": "Editar processos",
  "financeiro.visualizar": "Ver financeiro",
  "contratos.gerenciar": "Gerenciar contratos",
  "pagamentos.registrar": "Registrar pagamentos",
  "prazos.visualizar": "Ver prazos",
  "prazos.criar": "Criar prazos",
  "prazos.editar": "Editar prazos",
  "prazos.concluir": "Concluir prazos",
  "tarefas.gerenciar": "Gerenciar tarefas",
  "despesas.editar": "Editar despesas",
  "agenda.editar": "Editar agenda",
  "equipe.gerenciar": "Gerenciar equipe",
  "relatorios.visualizar": "Ver relatórios",
  "configuracoes.administrar": "Administrar configurações",
};

const roleLabels: Record<Role, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  advogado: "Advogado",
  assistente: "Assistente",
  financeiro: "Financeiro",
  colaborador: "Colaborador",
  visualizador: "Visualizador",
};

function EmptyConfigurationState({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar escritório, membros e permissões reais."
      : status === "signed-out"
        ? "Entre para visualizar as configurações do escritório."
        : "Crie o primeiro escritório para ativar as configurações do tenant.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Configurações" description="Escritório, membros, papéis e preferências do Alfenus." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CircleAlert className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Configuração pendente</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const successMessage = params.mensagem === "salvo" ? "Dados do escritório atualizados com sucesso." : null;
  const errorMessage = params.erro
    ? {
        autenticacao: "Faça login para acessar as configurações.",
        permissao: "Você não tem permissão para editar as configurações.",
        validacao: "Revise os campos informados. Nome deve ter pelo menos 2 caracteres.",
        ambiente: "Configure o Supabase antes de salvar.",
        salvar: "Não foi possível salvar. Tente novamente.",
        logo: "A logo deve ser PNG ou JPG com até 2 MB.",
      }[params.erro]
    : null;

  if (context.status !== "ready" || !context.lawFirm || !context.member) {
    return <EmptyConfigurationState status={context.status} />;
  }

  const members = await getLawFirmMembers(context.lawFirm.id);
  const canEdit = can(context.member.role, "configuracoes.administrar");
  const supabase = await getSupabaseServerClient();
  const { data: logoUrlData } = context.lawFirm.logoPath && supabase
    ? await supabase.storage.from("branding").createSignedUrl(context.lawFirm.logoPath, 3600)
    : { data: null };

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Escritório, membros, papéis e permissões iniciais do Alfenus."
        />
        <div className="flex gap-3 text-sm">
          <Link href="/configuracoes/privacidade" className="underline underline-offset-4">Privacidade e LGPD</Link>
          <Link href="/privacidade" className="underline underline-offset-4">Política pública</Link>
        </div>

        {canEdit ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Assinatura Alfenus</CardTitle>
              <CardDescription>Escolha um plano ou gerencie sua cobrança com segurança pelo Stripe.</CardDescription>
            </CardHeader>
            <CardContent>
              <BillingActions />
            </CardContent>
          </Card>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5 p-4 text-sm font-medium">
            {successMessage}
          </div>
        ) : null}
        {params.erro === "confirmacao" ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium">Digite exatamente EXCLUIR MINHA CONTA para confirmar.</div> : null}
        {params.erro === "exclusao" ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium">Não foi possível concluir a exclusão da conta. Nenhum novo acesso foi criado.</div> : null}
        {params.erro === "arquivos" ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium">A exclusão foi interrompida porque não foi possível remover todos os documentos enviados.</div> : null}
        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Escritório</CardTitle>
                  <CardDescription>Dados do tenant ativo.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form action={updateLawFirmAction} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold">Nome</Label>
                    <Input id="name" name="name" defaultValue={context.lawFirm.name} required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground pt-5">Identificador (Slug)</p>
                    <p className="font-mono text-sm h-9 flex items-center">{context.lawFirm.slug}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2 border-t pt-4">
                    <p className="text-xs font-semibold text-slate-700">Link da sua Bio</p>
                    <div className="flex items-center gap-2.5 mt-1">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono">
                        {`/@${context.lawFirm.slug}`}
                      </code>
                      <Link
                        href={`/@${context.lawFirm.slug}`}
                        target="_blank"
                        className="text-xs text-primary underline flex items-center gap-1 hover:text-primary/80 font-medium"
                      >
                        Visualizar página pública <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Divulgue seus contatos, WhatsApp e equipe nas redes sociais (como o link da bio no Instagram) usando este link permanente.</p>
                    <Link
                      href="/configuracoes/link-da-bio"
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-medium text-slate-700 shadow-sm transition"
                    >
                      Configurar Link da Bio
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground pt-5">Plano</p>
                    <p className="font-medium h-9 flex items-center">{context.lawFirm.plan}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground pt-5">Status</p>
                    <div className="h-9 flex items-center">
                      <StatusBadge value={context.lawFirm.status} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold">E-mail</Label>
                    <Input id="email" name="email" type="email" defaultValue={context.lawFirm.email ?? ""} placeholder="contato@escritorio.com.br" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-semibold">Telefone</Label>
                    <Input id="phone" name="phone" defaultValue={context.lawFirm.phone ?? ""} placeholder="(11) 99999-9999" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document" className="text-xs font-semibold">Documento (CNPJ)</Label>
                    <Input id="document" name="document" defaultValue={context.lawFirm.document ?? ""} placeholder="00.000.000/0001-00" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="logo" className="text-xs font-semibold">Logo do escritório</Label>
                    <LogoInput initialLogoUrl={logoUrlData?.signedUrl} />
                    <p className="text-xs text-muted-foreground">PNG ou JPG, até 2 MB. Será usada no Alfenus e nos PDFs gerados.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground pt-5">Criado em</p>
                    <p className="h-9 flex items-center text-sm">{formatDate(context.lawFirm.createdAt)}</p>
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <Button type="submit" size="sm" className="font-semibold">
                      <Pencil className="size-3.5" />
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="mt-1 font-medium">{context.lawFirm.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Identificador</p>
                    <p className="mt-1 font-mono text-sm">{context.lawFirm.slug}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="mt-1 font-medium">{context.lawFirm.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1"><StatusBadge value={context.lawFirm.status} /></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="mt-1">{context.lawFirm.email ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="mt-1">{context.lawFirm.phone ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Documento</p>
                    <p className="mt-1">{context.lawFirm.document ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Logo</p>
                    {logoUrlData?.signedUrl ? <img src={logoUrlData.signedUrl} alt={`Logo de ${context.lawFirm.name}`} className="mt-1 h-10 max-w-40 object-contain object-left" /> : <p className="mt-1">Não configurada</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="mt-1">{formatDate(context.lawFirm.createdAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Meu acesso</CardTitle>
              <CardDescription>Sessão atual e papel dentro do escritório.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Usuário</p>
                <p className="mt-1 font-medium">{context.member.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="mt-1">{context.member.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Papel</p>
                <div className="mt-1">
                  <Badge variant="secondary">{roleLabels[context.member.role]}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Último acesso</p>
                <p className="mt-1">
                  {context.member.lastAccessAt ? formatDateTime(context.member.lastAccessAt) : "Ainda não registrado"}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Membros vinculados ao tenant ativo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[member.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={member.status} />
                    </TableCell>
                    <TableCell>
                      {member.last_access_at ? formatDateTime(member.last_access_at) : "Ainda não registrado"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle>Excluir minha conta</CardTitle>
            <CardDescription>Remove seu acesso, perfil, consentimentos e documentos enviados por você em todos os escritórios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Registros compartilhados do escritório, como processos, contratos e movimentações, permanecem quando necessários à continuidade do serviço ou a obrigações legais. Suas referências pessoais serão desvinculadas.</p>
            <form id="delete-own-account" action={deleteOwnAccountAction}>
              <input type="hidden" name="confirmation" value="EXCLUIR MINHA CONTA" />
              <ConfirmSubmitButton formId="delete-own-account" title="Excluir sua conta e seus dados?" description="Essa ação remove permanentemente sua conta, acesso e documentos enviados por você." confirmationText="EXCLUIR MINHA CONTA" confirmLabel="Excluir conta" className="inline-flex h-9 items-center justify-center rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90">Excluir minha conta</ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Papéis e permissões</CardTitle>
            <CardDescription>Matriz inicial usada pelas guardas de permissão da aplicação.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permissão</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role}>{roleLabels[role]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="font-medium">{permissionLabels[permission]}</TableCell>
                    {roles.map((role) => (
                      <TableCell key={`${role}-${permission}`}>
                        {can(role, permission) ? (
                          <Check className="size-4 text-[var(--chart-2)]" aria-label="Permitido" />
                        ) : (
                          <CircleMinus className="size-4 text-muted-foreground" aria-label="Sem permissão" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
