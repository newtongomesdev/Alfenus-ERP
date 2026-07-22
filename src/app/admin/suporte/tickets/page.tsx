import { Search } from "lucide-react";
import Link from "next/link";

import { getAdminContext } from "@/lib/admin/auth";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "aberto", label: "Aberto" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "aguardando_suporte", label: "Aguardando suporte" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
  { value: "cancelado", label: "Cancelado" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  aguardando_cliente: "Aguardando cliente",
  aguardando_suporte: "Aguardando suporte",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const STATUS_CLASSES: Record<string, string> = {
  aberto: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
  aguardando_cliente: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  aguardando_suporte: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  em_analise: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  resolvido: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  fechado: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
  cancelado: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_CLASSES: Record<string, string> = {
  baixa: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
  normal: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  alta: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400",
  urgente: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TicketRow {
  id: string;
  protocol: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  category: { name: string } | null;
  law_firm: { name: string } | null;
  assigned_operator: { name: string; email: string } | null;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    priority?: string;
  }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  const searchQuery = params.q ?? "";
  const filterStatus = params.status ?? "";
  const filterPriority = params.priority ?? "";

  let allTickets: TicketRow[] = [];

  try {
    // Buscar todos os tickets para métricas e listagem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (adminClient as any)
      .from("support_tickets")
      .select(
        "id, protocol, subject, status, priority, created_at, category:support_categories(name), law_firm:law_firms(name), assigned_operator:law_firm_members!support_tickets_assigned_to_fkey(name, email)",
      );

    if (searchQuery) {
      query = query.or(`protocol.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
    }
    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }
    if (filterPriority) {
      query = query.eq("priority", filterPriority);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    allTickets = (data ?? []) as TicketRow[];
  } catch {
    allTickets = [];
  }

  const totalCount = allTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedTickets = allTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Métricas a partir de todos os tickets (sem paginação)
  const abertosCount = allTickets.filter((t) => t.status === "aberto").length;
  const aguardandoCount = allTickets.filter(
    (t) => t.status === "aguardando_cliente" || t.status === "aguardando_suporte",
  ).length;
  const resolvidosCount = allTickets.filter((t) => t.status === "resolvido").length;

  // Construir basePath para paginação
  const filterParts: string[] = [];
  if (searchQuery) filterParts.push(`q=${encodeURIComponent(searchQuery)}`);
  if (filterStatus) filterParts.push(`status=${encodeURIComponent(filterStatus)}`);
  if (filterPriority) filterParts.push(`priority=${encodeURIComponent(filterPriority)}`);
  const basePath =
    filterParts.length > 0
      ? `/admin/suporte/tickets?${filterParts.join("&")}`
      : "/admin/suporte/tickets";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets de Suporte"
        description="Gerencie todos os tickets de suporte da plataforma."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total"
          value={totalCount}
          format="integer"
          detail="Tickets"
        />
        <MetricCard
          label="Abertos"
          value={abertosCount}
          format="integer"
          detail="Aguardando atendimento"
        />
        <MetricCard
          label="Aguardando"
          value={aguardandoCount}
          format="integer"
          detail="Retorno pendente"
        />
        <MetricCard
          label="Resolvidos"
          value={resolvidosCount}
          format="integer"
          detail="Chamados encerrados"
        />
      </section>

      <Card className="rounded-lg">
        <CardContent className="space-y-4 pt-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  name="q"
                  placeholder="Protocolo ou assunto"
                  defaultValue={searchQuery}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={filterStatus}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select
                name="priority"
                defaultValue={filterPriority}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                <TableHead>Protocolo</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <Link
                      href={`/admin/suporte/tickets/${ticket.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {ticket.protocol}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm">
                    {ticket.subject}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.law_firm?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {ticket.category?.name ? (
                      <Badge variant="outline">{ticket.category.name}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PRIORITY_CLASSES[ticket.priority] ?? ""}
                    >
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_CLASSES[ticket.status] ?? ""}
                    >
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.assigned_operator?.name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedTickets.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum ticket encontrado.
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
              totalRecords={totalCount}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
