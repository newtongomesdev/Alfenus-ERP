import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteExpenseAction, getExpenseById, updateExpenseAction } from "@/app/despesas/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar despesas.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar despesas.",
};

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  if (!can(context.member.role, "despesas.editar")) {
    redirect("/despesas?erro=permissao");
  }

  const expense = await getExpenseById(context.lawFirm.id, id);

  if (!expense) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Despesa não encontrada" description="O registro não existe ou não está disponível." />
          <Link href="/despesas" className="underline">
            Voltar para despesas
          </Link>
        </div>
      </AppShell>
    );
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/despesas">
          ← Voltar para despesas
        </Link>

        <PageHeader title={`Editar despesa`} description="Atualize os dados da despesa registrada." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados da despesa</CardTitle>
            <CardDescription>Revise e atualize as informações de valor, categoria e vencimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateExpenseAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="expenseId" value={expense.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" name="description" required defaultValue={expense.description} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={expense.category}
                >
                  <option value="" disabled>
                    Selecione uma categoria
                  </option>
                  <option value="aluguel">Aluguel</option>
                  <option value="salarios">Salários</option>
                  <option value="encargos">Encargos</option>
                  <option value="material">Material</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="marketing">Marketing</option>
                  <option value="contabilidade">Contabilidade</option>
                  <option value="judicial">Despesas judiciais</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" name="amount" inputMode="decimal" placeholder="0,00" required defaultValue={String(expense.amount_cents / 100).replace(".", ",")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input id="dueDate" name="dueDate" type="date" defaultValue={expense.due_date ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={expense.notes ?? ""}
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href="/despesas"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {expense.status !== "cancelado" ? (
          <Card className="rounded-lg border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Cancelar a despesa a remove do fluxo de caixa.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteExpenseAction}>
                <input type="hidden" name="expenseId" value={expense.id} />
                <Button type="submit" variant="destructive">
                  Cancelar despesa
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
