import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { formatDateTime } from "@/lib/formatters";
import { getClientPortalDashboard } from "@/lib/portal/queries";

import { createPortalInviteAction, revokePortalInviteAction } from "./actions";

export default async function ClientPortalAdminPage() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return (
      <AppShell memberName={null}>
        <PageHeader title="Portal do cliente" description="Acesso externo em modo leitura." />
        <Card className="rounded-lg border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>Entrar no escritório</Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const data = await getClientPortalDashboard(context.lawFirm.id);

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <PageHeader title="Portal do cliente" description="Gere links temporários para clientes acompanharem processos, contratos, prazos e documentos." />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Convites</CardTitle>
              <CardDescription>Links de leitura por cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.invites.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum convite criado.</p> : null}
                {data.invites.map((invite) => (
                  <div key={invite.id} className="flex flex-col gap-3 border-b pb-3 last:border-0 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-medium">{invite.clientName}</p>
                      <p className="text-sm text-muted-foreground">{invite.email ?? "Sem e-mail vinculado"} · {invite.status}</p>
                      <Link className="break-all text-sm underline" href={`/portal/${invite.token}`}>{`/portal/${invite.token}`}</Link>
                      <p className="text-xs text-muted-foreground">Criado em {formatDateTime(invite.createdAt)}{invite.lastAccessAt ? ` · último acesso ${formatDateTime(invite.lastAccessAt)}` : ""}</p>
                    </div>
                    {invite.status === "ativo" ? (
                      <form action={revokePortalInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <Button type="submit" variant="outline" size="sm">Revogar</Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-lg">
            <CardHeader>
              <CardTitle>Novo convite</CardTitle>
              <CardDescription>O link abre uma área pública restrita por token.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createPortalInviteAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente</Label>
                  <select id="clientId" name="clientId" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" required>
                    <option value="">Selecione</option>
                    {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail do cliente</Label>
                  <Input id="email" name="email" type="email" placeholder="cliente@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expira em</Label>
                  <Input id="expiresAt" name="expiresAt" type="date" />
                </div>
                <Button type="submit" className="w-full" disabled={data.clients.length === 0}>Gerar link</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
