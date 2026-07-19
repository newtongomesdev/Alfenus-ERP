import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteLeadAction, getLeadById, updateLeadAction } from "@/app/leads/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

const errorMessages: Record<string, string> = {
  permissao: "Seu papel não tem permissão para editar leads.",
  validacao: "Revise os campos obrigatórios antes de salvar.",
  atualizacao: "Não foi possível salvar as alterações. Tente novamente.",
  ambiente: "Configure o Supabase antes de editar leads.",
  nao_encontrado: "Lead não encontrado.",
};

export default async function EditLeadPage({
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

  if (!can(context.member.role, "clientes.editar")) {
    redirect("/leads?erro=permissao");
  }

  const lead = await getLeadById(context.lawFirm.id, id);

  if (!lead) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <PageHeader title="Lead não encontrado" description="O registro não existe ou não está disponível." />
          <Link href="/leads" className="underline">
            Voltar para leads
          </Link>
        </div>
      </AppShell>
    );
  }

  const errorMessage = query.erro ? errorMessages[query.erro] : null;

  const toDatetimeLocal = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toISOString().slice(0, 16);
  };

  const toCurrencyDisplay = (cents: number) => {
    return cents > 0 ? String(cents) : "";
  };

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/leads">
          ← Voltar para leads
        </Link>

        <PageHeader title={`Editar lead: ${lead.name}`} description="Atualize os dados da oportunidade comercial." />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados do lead</CardTitle>
            <CardDescription>Revise e atualize as informações da oportunidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateLeadAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do lead</Label>
                <Input id="name" name="name" required defaultValue={lead.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="(11) 99999-9999" defaultValue={lead.whatsapp ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 3333-3333" defaultValue={lead.phone ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <select
                  id="source"
                  name="source"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={lead.source ?? ""}
                >
                  <option value="" disabled>
                    Selecione uma origem
                  </option>
                  <option value="indicação">Indicação</option>
                  <option value="site">Site</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="interest">Ação ou área de interesse</Label>
                <Input id="interest" name="interest" placeholder="Ex.: trabalhista, previdenciário, família" required defaultValue={lead.interest} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funnelStage">Etapa do funil</Label>
                <select
                  id="funnelStage"
                  name="funnelStage"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={lead.funnel_stage}
                >
                  <option value="novo">Novo</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="qualificado">Qualificado</option>
                  <option value="proposta_enviada">Proposta enviada</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="probability">Probabilidade</Label>
                <Input id="probability" name="probability" type="number" min={0} max={100} defaultValue={lead.probability} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Valor estimado (centavos)</Label>
                <Input id="estimatedValue" name="estimatedValue" inputMode="numeric" placeholder="0" defaultValue={toCurrencyDisplay(lead.estimated_value_cents)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextContactAt">Próximo contato</Label>
                <Input id="nextContactAt" name="nextContactAt" type="datetime-local" defaultValue={toDatetimeLocal(lead.next_contact_at)} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  defaultValue={lead.notes ?? ""}
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive sm:col-span-2">{errorMessage}</p> : null}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Salvar alterações</Button>
                <Link
                  href="/leads"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de perigo</CardTitle>
            <CardDescription>Arquivar o lead o marca como perdido.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteLeadAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <Button type="submit" variant="destructive">
                Arquivar lead
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
