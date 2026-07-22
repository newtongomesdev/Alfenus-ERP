import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_LABELS: Record<string, string> = {
  view: "Visualização",
  download: "Download",
  edit: "Edição",
  share: "Compartilhamento",
};

const ACTION_COLORS: Record<string, string> = {
  view: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  download: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  edit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  share: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

/**
 * Parseia um User-Agent em componentes legíveis.
 */
function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  device: string;
} {
  if (!ua) {
    return { browser: "—", os: "—", device: "—" };
  }

  let browser = "Desconhecido";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Desconhecido";
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";

  return { browser, os, device };
}

export default async function AdminDocumentAccessLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: log } = (await (adminClient as any)
      .from("document_access_logs")
      .select(
        "id, law_firm_id, user_id, document_id, action, ip_address, user_agent, metadata, created_at, document:documents(name, file_path), profile:profiles(full_name, email), law_firm:law_firms(name, slug)",
      )
      .eq("id", id)
      .single()) as {
      data: {
        id: string;
        law_firm_id: string;
        user_id: string;
        document_id: string;
        action: string;
        ip_address: string | null;
        user_agent: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
        document: { name: string; file_path: string } | null;
        profile: { full_name: string | null; email: string | null } | null;
        law_firm: { name: string; slug: string } | null;
      } | null;
    };

    if (!log) {
      redirect("/admin/seguranca/documentos");
    }

    const uaParsed = parseUserAgent(log.user_agent);
    const metadataEntries = log.metadata
      ? Object.entries(log.metadata)
      : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/seguranca/documentos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader
          title="Detalhe do Acesso"
          description={`${log.document?.name ?? "Documento"} — ${ACTION_LABELS[log.action] ?? log.action}`}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {/* Informações do Acesso */}
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Informações do Acesso</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Ação</p>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={`gap-1 ${ACTION_COLORS[log.action] ?? ""}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data e hora</p>
                  <p className="mt-1 font-medium">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endereço IP</p>
                  <p className="mt-1 font-medium font-mono text-sm">
                    {log.ip_address ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Escritório</p>
                  <p className="mt-1 font-medium">
                    {log.law_firm?.name ?? "—"}
                  </p>
                  {log.law_firm?.slug && (
                    <p className="text-xs text-muted-foreground">
                      {log.law_firm.slug}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Documento (ID)
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {log.document_id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Metadados */}
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Metadados</CardTitle>
              </CardHeader>
              <CardContent>
                {metadataEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum metadado registrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {metadataEntries.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {key}
                        </span>
                        <span className="font-mono text-sm break-all">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Usuário */}
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="mt-1 font-medium">
                    {log.profile?.full_name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm">
                    {log.profile?.email ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID do Usuário</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {log.user_id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* User Agent */}
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>User Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Navegador</p>
                  <p className="mt-1 font-medium">{uaParsed.browser}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sistema Operacional</p>
                  <p className="mt-1 font-medium">{uaParsed.os}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispositivo</p>
                  <p className="mt-1 font-medium">{uaParsed.device}</p>
                </div>
                {log.user_agent && (
                  <div>
                    <p className="text-xs text-muted-foreground">String completa</p>
                    <p
                      className="mt-1 break-all font-mono text-xs text-muted-foreground"
                      title={log.user_agent}
                    >
                      {log.user_agent}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Erro ao buscar detalhe do log de acesso:", error);
    redirect("/admin/seguranca/documentos");
  }
}
