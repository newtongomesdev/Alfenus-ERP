import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getWorkflowApplyOptions, getWorkflowTemplates } from "@/lib/workflows/queries";

import { applyWorkflowTemplateAction } from "./actions";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Workflows" description="Templates automáticos de tarefas e prazos." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>Entrar no escritório</Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const [templates, options] = await Promise.all([
    getWorkflowTemplates(context.lawFirm.id),
    getWorkflowApplyOptions(context.lawFirm.id),
  ]);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader title="Workflows" description="Aplique rotinas padronizadas para abrir tarefas e prazos sem retrabalho." />

        {params.erro ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">Não foi possível aplicar o workflow.</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="rounded-lg">
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description ?? "Template do escritório"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{item.type === "deadline" ? "Prazo" : "Tarefa"}</p>
                          <p>D+{item.offsetDays}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="h-fit rounded-lg">
            <CardHeader>
              <CardTitle>Aplicar template</CardTitle>
              <CardDescription>Cria tarefas e prazos vinculados ao processo selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={applyWorkflowTemplateAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateId">Template</Label>
                  <select id="templateId" name="templateId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" required>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalCaseId">Processo</Label>
                  <select id="legalCaseId" name="legalCaseId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" required>
                    <option value="">Selecione</option>
                    {options.legalCases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsibleMemberId">Responsável</Label>
                  <select id="responsibleMemberId" name="responsibleMemberId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                    {options.members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={templates.length === 0 || options.legalCases.length === 0}>Aplicar workflow</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
