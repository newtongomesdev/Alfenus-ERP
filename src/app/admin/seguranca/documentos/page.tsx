import Link from "next/link";
import {
  Eye,
  Download,
  Pencil,
  Share2,
  Search,
} from "lucide-react";

import { getAdminContext } from "@/lib/admin/auth";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "view", label: "Visualização" },
  { value: "download", label: "Download" },
  { value: "edit", label: "Edição" },
  { value: "share", label: "Compartilhamento" },
];

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

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "view":
      return <Eye className="size-4" />;
    case "download":
      return <Download className="size-4" />;
    case "edit":
      return <Pencil className="size-4" />;
    case "share":
      return <Share2 className="size-4" />;
    default:
      return null;
  }
}

export default async function AdminDocumentAccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    action?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(params.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;
  const filterAction = params.action ?? "";
  const filterQ = params.q ?? "";
  const filterDe = params.de ?? "";
  const filterAte = params.ate ?? "";

  try {
    // ── Métricas de hoje ──────────────────────────────────────────────
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeIso = hoje.toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let metricsQuery = (adminClient as any)
      .from("document_access_logs")
      .select("id, document_id, user_id", { count: "exact", head: true })
      .gte("created_at", hojeIso);

    const { count: totalHoje = 0 } = (await metricsQuery) as { count: number | null };
    const safeTotalHoje = totalHoje ?? 0;

    // Documentos distintos acessados hoje
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docsHoje } = (await (adminClient as any)
      .from("document_access_logs")
      .select("document_id")
      .gte("created_at", hojeIso)) as { data: { document_id: string }[] | null };

    const documentosDistintosHoje = new Set(
      (docsHoje ?? []).map((r) => r.document_id),
    ).size;

    // Usuários ativos hoje
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usersHoje } = (await (adminClient as any)
      .from("document_access_logs")
      .select("user_id")
      .gte("created_at", hojeIso)) as { data: { user_id: string }[] | null };

    const usuariosAtivosHoje = new Set(
      (usersHoje ?? []).map((r) => r.user_id),
    ).size;

    // ── Query principal ───────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminClient as any)
      .from("document_access_logs")
      .select(
        "id, law_firm_id, user_id, document_id, action, ip_address, user_agent, metadata, created_at, document:documents(name), profile:profiles(full_name, email)",
        { count: "exact" },
      );

    if (filterAction) {
      query = query.eq("action", filterAction);
    }
    if (filterDe) {
      query = query.gte("created_at", filterDe);
    }
    if (filterAte) {
      // Incluir o dia inteiro
      const ateDate = new Date(filterAte);
      ateDate.setHours(23, 59, 59, 999);
      query = query.lte("created_at", ateDate.toISOString());
    }
    if (filterQ) {
      // Busca por nome do documento OU nome do usuário OU email
      query = query.or(
        `document.name.ilike.%${filterQ}%,profile.full_name.ilike.%${filterQ}%,profile.email.ilike.%${filterQ}%`,
      );
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data: logs, count: totalCount = 0 } = (await query) as {
      data: Array<{
        id: string;
        law_firm_id: string;
        user_id: string;
        document_id: string;
        action: string;
        ip_address: string | null;
        user_agent: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
        document: { name: string } | null;
        profile: { full_name: string | null; email: string | null } | null;
      }> | null;
      count: number | null;
    };

    const rows = logs ?? [];
    const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));

    // Construir basePath com filtros preservados
    const filterParts: string[] = [];
    if (filterQ) filterParts.push(`q=${encodeURIComponent(filterQ)}`);
    if (filterAction) filterParts.push(`action=${encodeURIComponent(filterAction)}`);
    if (filterDe) filterParts.push(`de=${encodeURIComponent(filterDe)}`);
    if (filterAte) filterParts.push(`ate=${encodeURIComponent(filterAte)}`);
    const basePath =
      filterParts.length > 0
        ? `/admin/seguranca/documentos?${filterParts.join("&")}`
        : "/admin/seguranca/documentos";

    return (
      <div className="space-y-6">
        <PageHeader
          title="Logs de Acesso a Documentos"
          description="Registro de todas as interações dos usuários com documentos na plataforma."
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total acessos hoje"
            value={safeTotalHoje}
            format="integer"
            detail="Desde 00:00"
          />
          <MetricCard
            label="Documentos distintos"
            value={documentosDistintosHoje}
            format="integer"
            detail="Acessados hoje"
          />
          <MetricCard
            label="Usuários ativos"
            value={usuariosAtivosHoje}
            format="integer"
            detail="Hoje"
          />
        </section>

        <Card className="rounded-lg">
          <CardContent className="space-y-4 pt-6">
            <form method="get" className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={filterQ}
                    placeholder="Documento, usuário ou email..."
                    className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <select
                  name="action"
                  defaultValue={filterAction}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">De</label>
                <input
                  type="date"
                  name="de"
                  defaultValue={filterDe}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Até</label>
                <input
                  type="date"
                  name="ate"
                  defaultValue={filterAte}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
              >
                Filtrar
              </button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Link
                        href={`/admin/seguranca/documentos/${log.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {log.document?.name ?? log.document_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {log.profile?.full_name ?? log.user_id.slice(0, 8)}
                      {log.profile?.email && (
                        <span className="block text-xs text-muted-foreground">
                          {log.profile.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 ${ACTION_COLORS[log.action] ?? ""}`}
                      >
                        <ActionIcon action={log.action} />
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.ip_address ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[180px] truncate text-xs text-muted-foreground"
                      title={log.user_agent ?? undefined}
                    >
                      {log.user_agent ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum registro de acesso encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath={basePath}
                totalRecords={totalCount ?? 0}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Erro ao buscar logs de acesso a documentos:", error);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Logs de Acesso a Documentos"
          description="Registro de todas as interações dos usuários com documentos na plataforma."
        />
        <Card className="rounded-lg">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Ocorreu um erro ao carregar os logs de acesso. Tente novamente mais
            tarde.
          </CardContent>
        </Card>
      </div>
    );
  }
}
