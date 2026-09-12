import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getModuleOverview } from "@/lib/modules/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { deleteDocumentAction } from "./actions";

const errorMessages: Record<string, string> = {
  entidade_nao_encontrada:
    "A entidade informada não foi encontrada no escritório atual. Verifique o ID e tente novamente.",
  documento_nao_encontrado:
    "Documento não encontrado ou não pertence a este escritório.",
  storage:
    "Não foi possível remover o arquivo do armazenamento. Tente novamente.",
  exclusao:
    "Não foi possível excluir o registro do documento. Tente novamente.",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; excluido?: string; erro?: string }>;
}) {
  const params = await searchParams;

  let context: Awaited<ReturnType<typeof getAppContext>>;
  try {
    context = await getAppContext();
  } catch {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Documentos" description="Arquivos seguros por tenant." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  ) {
    return (
      <AppShell memberName={null}>
        <PageHeader
          title="Documentos"
          description="Arquivos seguros por tenant."
        />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {context.status === "missing-env"
              ? "Configure o Supabase no .env.local para usar documentos."
              : (
                  <Link
                    className="underline"
                    href={
                      context.status === "missing-tenant"
                        ? "/onboarding"
                        : "/entrar"
                    }
                  >
                    {context.status === "missing-tenant"
                      ? "Criar escritório"
                      : "Entrar"}
                  </Link>
                )}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  let overview: Awaited<ReturnType<typeof getModuleOverview>>;
  let rows: Array<{
    id: string;
    name: string;
    entity_type: string;
    entity_id: string | null;
  }>;

  try {
    overview = await getModuleOverview(
      context.lawFirm.id,
      "documentos",
      context.member.id,
    );

    const supabase = await getSupabaseServerClient();
    const documentQuery = supabase
      ? (
          supabase as unknown as {
            from(table: string): {
              select(columns: string): {
                eq(
                  column: string,
                  value: string,
                ): {
                  order(
                    column: string,
                    options: { ascending: boolean },
                  ): Promise<{ data: unknown[] | null }>;
                };
              };
            };
          }
        )
          .from("documents")
          .select("id, name, entity_type, entity_id, created_at")
          .eq("law_firm_id", context.lawFirm.id)
          .order("created_at", { ascending: false })
      : null;

    const { data: documents } = documentQuery
      ? await documentQuery
      : { data: [] as unknown[] };

    rows = (documents ?? []) as Array<{
      id: string;
      name: string;
      entity_type: string;
      entity_id: string | null;
    }>;
  } catch {
    return (
      <AppShell memberName={context.member.name}>
        <PageHeader title="Documentos" description="Arquivos seguros por tenant." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Ocorreu um erro ao carregar os documentos. Tente novamente mais tarde.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const canDelete = can(context.member.role, "equipe.gerenciar");

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader
          title="Documentos"
          description="Armazene arquivos vinculados ao contexto jurídico do escritório."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/documentos/modelos" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
                Modelos
              </Link>
              <Link href="/documentos/gerar" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                Gerar documento
              </Link>
            </div>
          }
        />

        {params.enviado ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              Documento enviado com segurança.
            </CardContent>
          </Card>
        ) : null}

        {params.excluido ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">
              Documento excluído com sucesso.
            </CardContent>
          </Card>
        ) : null}

        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              {errorMessages[params.erro] ??
                "Não foi possível enviar o documento. Confira o arquivo e tente novamente."}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {overview.metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Arquivos recentes</CardTitle>
              <CardDescription>
                Documentos visíveis somente ao tenant atual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  Nenhum documento armazenado.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Vínculo: {row.entity_type}
                          {row.entity_id ? ` · ${row.entity_id}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/api/documentos/${row.id}`}
                          className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                          Abrir
                        </Link>
                        {canDelete ? (
                          <form action={deleteDocumentAction}>
                            <input type="hidden" name="documentId" value={row.id} />
                            <button
                              type="submit"
                              className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                            >
                              Excluir
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Enviar documento</CardTitle>
              <CardDescription>
                O arquivo será guardado no Storage privado do escritório.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm />
            </CardContent>
          </Card>
        </div>

      </div>
    </AppShell>
  );
}
