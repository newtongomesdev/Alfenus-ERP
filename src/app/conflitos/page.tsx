import Form from "next/form";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getConflictCheck } from "@/lib/conflicts/queries";

export default async function ConflictCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Conflict check" description="Checagem básica de conflito de interesse." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>Entrar no escritório</Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const result = await getConflictCheck(context.lawFirm.id, params.q ?? "");

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader title="Conflict check" description="Pesquise nomes, documentos, e-mails, partes contrárias e números de processo antes de aceitar um caso." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Pesquisar possível conflito</CardTitle>
            <CardDescription>Busca básica no histórico interno do escritório.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form action="/conflitos" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="q">Nome, documento, e-mail ou número</Label>
                <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Ex.: Maria Silva, 123.456.789-00" />
              </div>
              <Button type="submit" className="self-end">Verificar</Button>
            </Form>
          </CardContent>
        </Card>

        {result.query.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-lg">
              <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.clients.map((item) => {
                  const row = item as { id: string; name: string; document: string | null; email: string | null; status: string };
                  return <div key={row.id} className="border-b pb-3 last:border-0"><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">{row.document ?? "Sem documento"} · {row.email ?? "Sem e-mail"} · {row.status}</p></div>;
                })}
                {result.clients.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p> : null}
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardHeader><CardTitle>Partes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.parties.map((item) => {
                  const row = item as { id: string; name: string; party_role: string; document: string | null; legal_case_id: string };
                  return <div key={row.id} className="border-b pb-3 last:border-0"><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">{row.party_role} · {row.document ?? "Sem documento"}</p><Link className="text-sm underline" href={`/processos/${row.legal_case_id}`}>Abrir processo</Link></div>;
                })}
                {result.parties.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma parte encontrada.</p> : null}
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardHeader><CardTitle>Processos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.cases.map((item) => {
                  const row = item as { id: string; title: string; case_number: string | null; opposing_party: string | null; status: string };
                  return <div key={row.id} className="border-b pb-3 last:border-0"><p className="font-medium">{row.title}</p><p className="text-sm text-muted-foreground">{row.case_number ?? "Sem número"} · {row.opposing_party ?? "Sem parte contrária"} · {row.status}</p><Link className="text-sm underline" href={`/processos/${row.id}`}>Abrir processo</Link></div>;
                })}
                {result.cases.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum processo encontrado.</p> : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
