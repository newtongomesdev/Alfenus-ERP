import Link from "next/link";
import { FileText, Calendar, DollarSign, Folder, CheckCircle, Scale, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { getPublicPortalByToken } from "@/lib/portal/queries";
import { PortalDocumentUpload } from "./portal-document-upload";

export default async function PublicClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicPortalByToken(token);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <Card className="w-full rounded-lg border-dashed">
          <CardHeader>
            <CardTitle>Portal indisponível</CardTitle>
            <CardDescription>O link expirou, foi revogado ou não existe.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm underline" href="/">Voltar para Alfenus</Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Premium */}
      <section className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">{data.lawFirm?.name ?? "Escritório"}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Portal de {data.client?.name ?? "Cliente"}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Acompanhe seus processos, contratos e documentos em tempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Acesso Ativo
            </Badge>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-slate-200/60 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Scale className="h-4 w-4" />
                <span className="text-sm font-medium">Processos</span>
              </div>
              <p className="text-2xl font-bold">{data.cases.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200/60 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Prazos Ativos</span>
              </div>
              <p className="text-2xl font-bold">{data.deadlines.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200/60 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Pendências</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{data.documentRequests.filter((r: any) => r.status !== 'concluido').length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200/60 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Folder className="h-4 w-4" />
                <span className="text-sm font-medium">Documentos</span>
              </div>
              <p className="text-2xl font-bold">{data.documents.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-4 lg:grid-cols-2">
        {/* Solicitações de Documentos */}
        <Card className="rounded-xl shadow-sm border-slate-200/60 lg:col-span-2">
          <CardHeader className="bg-slate-50/50 border-b rounded-t-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-lg">Solicitações de Documentos</CardTitle>
                <CardDescription>Envie os documentos solicitados pelo escritório.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.documentRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente no momento.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.documentRequests.map((item: any) => (
                  <div key={item.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-base">{item.title}</p>
                          <Badge variant={item.status === "concluido" ? "default" : "secondary"}>
                            {item.status === "concluido" ? "Concluído" : "Pendente"}
                          </Badge>
                          {item.priority === "urgente" && <Badge variant="destructive">Urgente</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Tipo: {item.document_type} {item.due_date ? `· Prazo: ${formatDate(item.due_date)}` : ""}
                        </p>
                      </div>
                      
                      {item.status !== "concluido" && (
                        <div className="w-full md:w-80 shrink-0">
                          <PortalDocumentUpload token={token} requestId={item.id} title={item.title} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b rounded-t-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-lg">Processos e Casos</CardTitle>
                <CardDescription>Andamentos cadastrados pelo escritório.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.cases.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum processo liberado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.cases.map((item) => {
                  const row = item as { id: string; title: string; case_number: string | null; status: string; priority: string; court: string | null };
                  return (
                    <div key={row.id} className="p-6 transition-colors hover:bg-slate-50/50">
                      <p className="font-semibold">{row.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="bg-white">{row.status}</Badge>
                        <span className="flex items-center text-xs">
                          {row.case_number ?? "Sem número"} · {row.court ?? "Sem tribunal"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b rounded-t-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <div>
                <CardTitle className="text-lg">Próximos Prazos</CardTitle>
                <CardDescription>Datas importantes compartilhadas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.deadlines.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum prazo compartilhado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.deadlines.map((item) => {
                  const row = item as { id: string; title: string; due_date: string; due_time: string | null; status: string };
                  return (
                    <div key={row.id} className="p-6 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/50">
                      <div>
                        <p className="font-medium">{row.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{row.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatDate(row.due_date)}</p>
                        {row.due_time && <p className="text-xs text-muted-foreground">{row.due_time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b rounded-t-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <CardTitle className="text-lg">Financeiro</CardTitle>
                <CardDescription>Resumo de contratos e despesas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.contracts.length === 0 && data.expenses.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma informação financeira liberada.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.contracts.map((item) => {
                  const row = item as { id: string; service_description: string; total_amount_cents: number; status: string };
                  return (
                    <div key={row.id} className="p-6 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-100">Contrato</Badge>
                          <p className="font-medium">{row.service_description}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{row.status}</p>
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap">{formatCurrencyFromCents(row.total_amount_cents)}</p>
                    </div>
                  );
                })}
                {data.expenses.map((item: any) => (
                  <div key={item.id} className="p-6 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Despesa</Badge>
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.category ? `${item.category} · ` : ""}{item.status}
                        {item.due_date ? ` · Vence: ${formatDate(item.due_date)}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">{formatCurrencyFromCents(item.amount_cents)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b rounded-t-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-lg">Documentos</CardTitle>
                <CardDescription>Arquivos vinculados ao seu cadastro.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.documents.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum documento liberado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.documents.map((item) => {
                  const row = item as { id: string; name: string; size_bytes: number; created_at: string };
                  return (
                    <div key={row.id} className="p-4 md:p-6 flex items-center gap-3 transition-colors hover:bg-slate-50/50">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{row.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{Math.round(row.size_bytes / 1024)} KB · {formatDate(row.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
