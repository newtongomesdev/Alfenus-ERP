import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext } from "@/lib/auth/context";
import { getClientPortalDashboard } from "@/lib/portal/queries";
import { InvitesTable } from "./invites-table";
import { createPortalInviteAction } from "./actions";

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
        <PageHeader 
          title="Portal do Cliente" 
          description="Gere links temporários e gerencie o acesso de seus clientes para acompanhamento de casos, contratos e prazos." 
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Acessos Compartilhados</h2>
            <InvitesTable invites={data.invites} />
          </div>

          <div className="space-y-6">
            <Card className="h-fit rounded-xl border border-slate-200/60 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b rounded-t-xl py-4">
                <CardTitle className="text-base">Novo acesso</CardTitle>
                <CardDescription>Gere um link temporário exclusivo de acesso rápido.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <form action={createPortalInviteAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-xs font-semibold text-slate-600">Cliente</Label>
                    <select id="clientId" name="clientId" className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" required>
                      <option value="">Selecione um cliente</option>
                      {data.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.phone ? `(${client.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-600">E-mail do cliente</Label>
                    <Input id="email" name="email" type="email" placeholder="cliente@email.com" className="h-9 rounded-lg" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt" className="text-xs font-semibold text-slate-600">Data de expiração</Label>
                    <Input id="expiresAt" name="expiresAt" type="date" className="h-9 rounded-lg" />
                    <p className="text-[10px] text-muted-foreground">Deixe em branco para acesso permanente.</p>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600">Opções de compartilhamento</p>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notifyWhatsapp"
                        name="notifyWhatsapp"
                        defaultChecked
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="notifyWhatsapp" className="text-xs font-normal text-slate-600 cursor-pointer">
                        Preparar convite para WhatsApp
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notifyEmail"
                        name="notifyEmail"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="notifyEmail" className="text-xs font-normal text-slate-600 cursor-pointer">
                        Registrar preferência de E-mail
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-2 rounded-lg" disabled={data.clients.length === 0}>
                    Gerar link de acesso
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
