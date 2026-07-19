import { ArrowLeft, BriefcaseBusiness, CalendarDays, FileText, Scale, WalletCards } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { anonymizeClientAction, archiveClientAction } from "@/app/clientes/actions";
import { CommentSection } from "@/components/comment-section";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getClientDetail, getClientRelatedCounts, getClientTimeline } from "@/lib/clients/queries";
import { getFinancialSummaryByClient } from "@/lib/finance/queries";
import { formatDate, formatCurrencyFromCents } from "@/lib/formatters";

function ClientUnavailable({ status }: { status: string }) {
  const message =
    status === "missing-env"
      ? "Configure o Supabase no .env.local para carregar o perfil do cliente."
      : status === "signed-out"
        ? "Entre para acessar o perfil do cliente."
        : "Crie o primeiro escritório antes de acessar clientes.";
  const href = status === "missing-tenant" ? "/onboarding" : "/entrar";
  const action = status === "missing-tenant" ? "Criar escritório" : "Entrar";

  return (
    <AppShell memberName={null}>
      <div className="space-y-6">
        <PageHeader title="Cliente" description="Perfil cadastral e vínculos do cliente." />
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

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return <ClientUnavailable status={context.status} />;
  }

  const { id } = await params;
  const client = await getClientDetail(context.lawFirm.id, id);

  if (!client) {
    notFound();
  }

  const counts = await getClientRelatedCounts(context.lawFirm.id, client.id);
  const timeline = await getClientTimeline(context.lawFirm.id, client.id);
  const financial = await getFinancialSummaryByClient(context.lawFirm.id, client.id);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/clientes">
          <ArrowLeft className="size-4" />
          Voltar para clientes
        </Link>

        <PageHeader
          title={client.name}
          description="Perfil cadastral do cliente. Contratos, processos, prazos e documentos permanecem em fluxos separados."
          actions={
            <>
              <StatusBadge value={client.status} />
              <Link
                href={`/clientes/${client.id}/editar`}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Editar
              </Link>
              <ConfirmSubmitButton
                formId="archive-client-form"
                title="Arquivar cliente"
                description="Tem certeza que deseja arquivar este cliente? Esta ação não pode ser desfeita."
                confirmLabel="Arquivar"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-destructive/30 px-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
              >
                Arquivar
              </ConfirmSubmitButton>
              <form id="archive-client-form" action={archiveClientAction} className="hidden">
                <input type="hidden" name="clientId" value={client.id} />
              </form>
              <Link href={`/api/privacidade/clientes/${client.id}/exportar`} className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted">Exportar dados</Link>
              {can(context.member.role, "configuracoes.administrar") ? <><ConfirmSubmitButton formId="anonymize-client-form" title="Anonimizar dados" description="Os dados pessoais serão removidos ou substituídos. Registros necessários para obrigações legais poderão ser preservados." confirmLabel="Anonimizar" className="inline-flex h-8 items-center justify-center rounded-lg border border-destructive/30 px-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10">Anonimizar</ConfirmSubmitButton><form id="anonymize-client-form" action={anonymizeClientAction} className="hidden"><input type="hidden" name="clientId" value={client.id} /></form></> : null}
            </>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Processos" value={counts.processes} format="integer" detail="Casos judiciais vinculados" />
          <MetricCard label="Contratos" value={counts.contracts} format="integer" detail="Contratos vinculados" />
          <MetricCard label="Prazos" value={counts.deadlines} format="integer" detail="Prazos abertos ou históricos" />
          <MetricCard label="Documentos" value={counts.documents} format="integer" detail="Arquivos no tenant" />
          <MetricCard label="Pagamentos" value={counts.payments} format="integer" detail="Registros financeiros" />
        </section>

        <Tabs defaultValue="cadastro" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="juridico">Jurídico</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro">
            <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Dados cadastrais</CardTitle>
                  <CardDescription>Informações principais do relacionamento.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de pessoa</p>
                    <p className="mt-1">{client.personType === "juridica" ? "Pessoa jurídica" : "Pessoa física"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPF ou CNPJ</p>
                    <p className="mt-1">{client.document ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="mt-1">{client.whatsapp ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="mt-1">{client.phone ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="mt-1">{client.email ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de nascimento</p>
                    <p className="mt-1">{client.birthDate ? formatDate(client.birthDate) : "Não informada"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profissão</p>
                    <p className="mt-1">{client.profession ?? "Não informada"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado civil</p>
                    <p className="mt-1">{client.maritalStatus ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="mt-1">{client.source ?? "Não informada"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Área de interesse</p>
                    <p className="mt-1">{client.interestArea ?? "Não informada"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                  <CardDescription>Notas cadastrais e marcadores.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {client.tags.length > 0 ? (
                        client.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem tags</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="mt-2 text-sm">{client.notes || "Nenhuma observação cadastrada."}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="mt-1">{formatDate(client.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="juridico">
            <Card className="rounded-lg">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Vínculos jurídicos</CardTitle>
                    <CardDescription>Processos e prazos serão criados nos fluxos próprios.</CardDescription>
                  </div>
                  <Link
                    href={`/processos/novo?clientId=${client.id}`}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Novo processo
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <Scale className="size-5 text-muted-foreground" />
                  <p className="mt-3 font-medium">Processos</p>
                  <p className="text-sm text-muted-foreground">{counts.processes} registro(s) vinculado(s).</p>
                </div>
                <div className="rounded-lg border p-4">
                  <CalendarDays className="size-5 text-muted-foreground" />
                  <p className="mt-3 font-medium">Prazos</p>
                  <p className="text-sm text-muted-foreground">{counts.deadlines} registro(s) vinculado(s).</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="space-y-4">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Contratos" value={financial.totalContracts} format="integer" detail="Contratos vinculados" />
                <MetricCard label="Total contratado" value={financial.totalContractAmountCents} format="currency" detail="Valor total dos contratos" />
                <MetricCard label="Pago" value={financial.totalPaidCents} format="currency" detail="Valores já recebidos" />
                <MetricCard label="Em aberto" value={financial.totalPendingCents} format="currency" detail="Saldo a receber" />
              </section>
              {financial.overdueAmountCents > 0 ? (
                <Card className="rounded-lg border-destructive/30 bg-destructive/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <WalletCards className="size-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Inadimplência</p>
                      <p className="text-sm text-destructive/80">
                        {formatCurrencyFromCents(financial.overdueAmountCents)} em parcelas vencidas ({financial.overdueInstallments} parcela(s)).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Resumo financeiro</CardTitle>
                  <CardDescription>Contratos, parcelas e pagamentos vinculados a este cliente.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <FileText className="size-5 text-muted-foreground" />
                    <p className="mt-3 font-medium">Contratos</p>
                    <p className="text-sm text-muted-foreground">{counts.contracts} registro(s) vinculado(s).</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <WalletCards className="size-5 text-muted-foreground" />
                    <p className="mt-3 font-medium">Pagamentos</p>
                    <p className="text-sm text-muted-foreground">{counts.payments} registro(s) vinculado(s).</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Histórico consolidado de movimentações deste cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6">
                    <BriefcaseBusiness className="size-5 text-muted-foreground" />
                    <p className="mt-3 font-medium">Sem movimentações</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Contratos, pagamentos e processos aparecerão aqui conforme forem criados.
                    </p>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                    {timeline.map((event, index) => (
                      <div key={`${event.type}-${event.id}-${index}`} className="relative flex gap-4 py-3">
                        <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                          {event.type === "contrato" ? <FileText className="size-3" /> :
                           event.type === "pagamento" ? <WalletCards className="size-3" /> :
                           event.type === "processo" ? <Scale className="size-3" /> :
                           event.type === "prazo" ? <CalendarDays className="size-3" /> :
                           <BriefcaseBusiness className="size-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{event.title}</p>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                              {event.type}
                            </span>
                          </div>
                          {event.description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                          ) : null}
                          {event.amountCents !== null ? (
                            <p className="mt-0.5 text-xs font-medium">{formatCurrencyFromCents(event.amountCents)}</p>
                          ) : null}
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(event.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comentarios">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Comentários</CardTitle>
                <CardDescription>Discussões e anotações sobre este cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                <CommentSection
                  entityType="client"
                  entityId={client.id}
                  currentMemberId={context.member.id}
                  currentMemberName={context.member.name}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
