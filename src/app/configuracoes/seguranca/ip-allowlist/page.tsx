import { redirect } from "next/navigation";
import Link from "next/link";

import { getAppContext } from "@/lib/auth/context";
import { getSecurityPolicy, getIpAllowlist } from "@/lib/security/policies";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IpAllowlistManager } from "@/components/security/ip-allowlist-manager";

export default async function IpAllowlistPage() {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const [policy, entries] = await Promise.all([
    getSecurityPolicy(context),
    getIpAllowlist(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de IPs Permitidos"
        description="Gerencie os endereços IP autorizados a acessar o sistema."
      />

      <div className="text-sm">
        <Link
          href="/configuracoes/seguranca"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar à segurança
        </Link>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Permissões de IP</CardTitle>
          <CardDescription>
            Adicione, remova ou altere o status dos endereços IP na lista de
            permissões. A restrição de IP deve estar ativada na política de
            segurança para que a lista tenha efeito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IpAllowlistManager
            entries={entries}
            ipRestrictionEnabled={policy.ipRestrictionEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
