"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Hourglass,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AccessRequest,
  AccessRequestFilters,
  PaginatedResult,
} from "@/lib/assisted-access/queries";
import type { AccessRequestStatus } from "@/lib/assisted-access/constants";
import { ACCESS_REQUEST_STATUSES } from "@/lib/assisted-access/constants";

// ── Tipos ───────────────────────────────────────────────────────────────────

type FetchFn = (
  page: number,
  filters: AccessRequestFilters,
) => Promise<PaginatedResult<AccessRequest>>;

type StatusFilterOption = {
  label: string;
  value: AccessRequestStatus | "todas";
};

// ── Configuração de status ──────────────────────────────────────────────────

const STATUS_OPTIONS: StatusFilterOption[] = [
  { label: "Todas", value: "todas" },
  { label: "Pendente", value: "pendente" },
  { label: "Visualizada", value: "visualizada" },
  { label: "Aprovada", value: "aprovada" },
  { label: "Aprovada c/ Restrições", value: "aprovada_com_restrições" },
  { label: "Recusada", value: "recusada" },
  { label: "Cancelada", value: "cancelada" },
  { label: "Expirada", value: "expirada" },
  { label: "Utilizada", value: "utilizada" },
  { label: "Encerrada", value: "encerrada" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pendente: {
    label: "Pendente",
    variant: "secondary",
    icon: <Hourglass className="size-3" />,
  },
  visualizada: {
    label: "Visualizada",
    variant: "outline",
    icon: <Eye className="size-3" />,
  },
  aprovada: {
    label: "Aprovada",
    variant: "default",
    icon: <CheckCircle2 className="size-3" />,
  },
  aprovada_com_restrições: {
    label: "Aprovada c/ Restrições",
    variant: "secondary",
    icon: <CheckCircle2 className="size-3" />,
  },
  recusada: {
    label: "Recusada",
    variant: "destructive",
    icon: <XCircle className="size-3" />,
  },
  cancelada: {
    label: "Cancelada",
    variant: "outline",
    icon: <Ban className="size-3" />,
  },
  expirada: {
    label: "Expirada",
    variant: "destructive",
    icon: <AlertCircle className="size-3" />,
  },
  utilizada: {
    label: "Utilizada",
    variant: "default",
    icon: <CheckCircle2 className="size-3" />,
  },
  encerrada: {
    label: "Encerrada",
    variant: "secondary",
    icon: <CheckCircle2 className="size-3" />,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      variant: "outline" as const,
      icon: <AlertCircle className="size-3" />,
    }
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge variant={config.variant} className="inline-flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

function RequestCard({
  request,
  onSelect,
}: {
  request: AccessRequest;
  onSelect: (id: string) => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => onSelect(request.id)}
    >
      <CardHeader className="flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="text-sm font-medium">
          Ticket #{request.ticket?.protocol ?? request.ticket_id.slice(0, 8)}
        </CardTitle>
        <StatusBadge status={request.status} />
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {request.reason}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="size-3" />
            {request.operator?.name ?? "Desconhecido"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDate(request.created_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3" />
            {request.requested_modules.length} módulo(s) / {request.requested_actions.length} ação(ões)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-3 size-10 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">
        {hasFilters
          ? "Nenhuma solicitação encontrada com os filtros selecionados."
          : "Nenhuma solicitação de acesso assistido encontrada."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        {hasFilters
          ? "Tente alterar os filtros para encontrar o que procura."
          : "As solicitações aparecerão aqui quando forem criadas."}
      </p>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface SupportAccessRequestListProps {
  fetchRequests: FetchFn;
  onSelectRequest?: (id: string) => void;
  initialFilters?: AccessRequestFilters;
  pageSize?: number;
}

export function SupportAccessRequestList({
  fetchRequests,
  onSelectRequest,
  initialFilters,
  pageSize = 20,
}: SupportAccessRequestListProps) {
  const [data, setData] = useState<PaginatedResult<AccessRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AccessRequestStatus | "todas">(
    initialFilters?.status ?? "todas"
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters?.search ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AccessRequestFilters = {};
      if (statusFilter !== "todas") filters.status = statusFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (initialFilters?.operatorId) filters.operatorId = initialFilters.operatorId;

      const result = await fetchRequests(page, filters);
      setData(result);
    } catch {
      setError("Erro ao carregar solicitações.");
    } finally {
      setLoading(false);
    }
  }, [fetchRequests, page, statusFilter, searchQuery, initialFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (status: AccessRequestStatus | "todas") => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSelect = (id: string) => {
    onSelectRequest?.(id);
  };

  const hasFilters =
    statusFilter !== "todas" || searchQuery.trim().length > 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por motivo ou operador..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Filtros"
        >
          <Filter className="size-4" />
        </Button>
      </div>

      {/* Filtros de status */}
      {showFilters && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      {data && (
        <p className="text-xs text-muted-foreground">
          {data.count} solicitação(ões) encontrada(s)
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <XCircle className="mb-3 size-10 text-destructive/50" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={loadData}
          >
            Tentar novamente
          </Button>
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-3">
          {data?.data.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
