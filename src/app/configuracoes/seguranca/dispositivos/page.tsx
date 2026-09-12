import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Smartphone, Monitor, Tablet } from "lucide-react";

import { getAppContext } from "@/lib/auth/context";
import { getTrustedDevices } from "@/lib/security/trusted-devices";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrustedDevicesManager } from "@/components/security/trusted-devices-manager";

export default async function DispositivosConfiaveisPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const devices = await getTrustedDevices(
    context.member!.userId,
    context.member!.lawFirmId,
  );

  const activeCount = devices.filter((d) => d.status === "ativo").length;
  const revokedCount = devices.filter((d) => d.status === "revogado").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispositivos Confiáveis"
        description="Gerencie os dispositivos autorizados a pular a verificação MFA."
      />

      <div className="text-sm">
        <Link
          href="/configuracoes/seguranca"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar à segurança
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">
                {activeCount === 1 ? "Dispositivo ativo" : "Dispositivos ativos"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Monitor className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{devices.length}</p>
              <p className="text-xs text-muted-foreground">
                {devices.length === 1
                  ? "Dispositivo registrado"
                  : "Dispositivos registrados"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <Tablet className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{revokedCount}</p>
              <p className="text-xs text-muted-foreground">
                {revokedCount === 1 ? "Dispositivo revogado" : "Dispositivos revogados"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de dispositivos */}
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Dispositivos Confiáveis
          </CardTitle>
          <CardDescription>
            Dispositivos que não precisam passar por verificação MFA nas próximas
            sessões. A confiança expira automaticamente após 30 dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrustedDevicesManager
            devices={devices}
            currentDeviceHash=""
          />
        </CardContent>
      </Card>
    </div>
  );
}
