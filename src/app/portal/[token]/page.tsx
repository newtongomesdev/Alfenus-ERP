import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { getPublicPortalByToken } from "@/lib/portal/queries";

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
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-muted-foreground">{data.lawFirm?.name ?? "Escritório"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Portal de {data.client?.name ?? "cliente"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Área de acompanhamento em modo leitura. Solicite ao escritório qualquer correção ou documento adicional.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Processos e casos</CardTitle>
            <CardDescription>Resumo do andamento cadastrado pelo escritório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cases.map((item) => {
              const row = item as { id: string; title: string; case_number: string | null; status: string; priority: string; court: string | null };
              return (
                <div key={row.id} className="border-b pb-3 last:border-0">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">{row.case_number ?? "Sem número"} · {row.status} · {row.court ?? "Sem tribunal"}</p>
                </div>
              );
            })}
            {data.cases.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum processo liberado.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Prazos</CardTitle>
            <CardDescription>Próximas datas compartilhadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.deadlines.map((item) => {
              const row = item as { id: string; title: string; due_date: string; due_time: string | null; status: string };
              return (
                <div key={row.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-sm text-muted-foreground">{row.status}</p>
                  </div>
                  <p className="text-sm">{formatDate(row.due_date)}{row.due_time ? ` ${row.due_time}` : ""}</p>
                </div>
              );
            })}
            {data.deadlines.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum prazo compartilhado.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Contratos</CardTitle>
            <CardDescription>Resumo financeiro em leitura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contracts.map((item) => {
              const row = item as { id: string; service_description: string; total_amount_cents: number; status: string };
              return (
                <div key={row.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{row.service_description}</p>
                    <p className="text-sm text-muted-foreground">{row.status}</p>
                  </div>
                  <p className="text-sm">{formatCurrencyFromCents(row.total_amount_cents)}</p>
                </div>
              );
            })}
            {data.contracts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contrato liberado.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>Documentos vinculados ao cadastro do cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.documents.map((item) => {
              const row = item as { id: string; name: string; size_bytes: number; created_at: string };
              return (
                <div key={row.id} className="border-b pb-3 last:border-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-muted-foreground">{Math.round(row.size_bytes / 1024)} KB · {formatDate(row.created_at)}</p>
                </div>
              );
            })}
            {data.documents.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento liberado.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Custos e Despesas</CardTitle>
            <CardDescription>Despesas vinculadas aos seus processos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenses.map((item: any) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.category ? `${item.category} · ` : ""}{item.status}
                    {item.due_date ? ` · Vence: ${formatDate(item.due_date)}` : ""}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatCurrencyFromCents(item.amount_cents)}</p>
              </div>
            ))}
            {data.expenses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Solicitações de Documentos</CardTitle>
            <CardDescription>Documentos solicitados pelo escritório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.documentRequests.map((item: any) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.document_type} · {item.status}
                    {item.priority !== "normal" ? ` · ${item.priority}` : ""}
                  </p>
                </div>
                {item.due_date && <p className="text-sm">{formatDate(item.due_date)}</p>}
              </div>
            ))}
            {data.documentRequests.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
