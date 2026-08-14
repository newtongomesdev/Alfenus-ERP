"use client";

/**
 * ServiceCatalogClient
 * Client component for service catalog listing with filters
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/components/service-catalog/ServiceCard";
import { ServiceTable } from "@/components/service-catalog/ServiceTable";
import {
  SERVICE_PRACTICE_AREAS,
  SERVICE_SEARCH_PLACEHOLDER,
} from "@/lib/service-catalog/constants";
import {
  updateServiceStatusAction,
  toggleServiceFavoriteAction,
  duplicateServiceAction,
} from "@/lib/service-catalog/actions";
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  Package,
} from "lucide-react";
import type { ServiceOverview } from "@/lib/service-catalog/types";

interface ServiceCatalogClientProps {
  lawFirmId: string;
}

export function ServiceCatalogClient({ lawFirmId }: ServiceCatalogClientProps) {
  const [services, setServices] = useState<ServiceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterArea, setFilterArea] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showPlatform, setShowPlatform] = useState(false);

  const router = useRouter();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "todos") params.set("status", filterStatus);
      if (filterArea !== "todas") params.set("practice_area", filterArea);
      if (search) params.set("search", search);

      const response = await fetch(`/api/service-catalog?${params.toString()}`);
      const data = await response.json();
      setServices(data.services || []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchServices();
  }, [filterStatus, filterArea, search]);

  const handleEdit = (id: string) => {
    router.push(`/servicos/${id}/editar`);
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateServiceAction(id);
    if (result.ok) fetchServices();
  };

  const handleArchive = async (id: string) => {
    const result = await updateServiceStatusAction(id, "arquivado");
    if (result.ok) fetchServices();
  };

  const handleRestore = async (id: string) => {
    const result = await updateServiceStatusAction(id, "ativo");
    if (result.ok) fetchServices();
  };

  const handleToggleFavorite = async (id: string) => {
    const result = await toggleServiceFavoriteAction(id);
    if (result.ok) fetchServices();
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Package className="h-6 w-6" />
            Serviços
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo de serviços oferecidos pelo escritório
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowPlatform(!showPlatform)}>
            <Package className="h-4 w-4 mr-1" />
            {showPlatform ? "Meus Serviços" : "Biblioteca"}
          </Button>
          <Button onClick={() => router.push("/servicos/novo")}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={SERVICE_SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="todos">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Área:</span>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="todas">Todas</option>
              {SERVICE_PRACTICE_AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 w-8 p-0"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {showPlatform ? "Biblioteca vazia" : "Nenhum serviço cadastrado"}
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              {showPlatform
                ? "Nenhum serviço da biblioteca encontrado."
                : "Cadastre os serviços que você oferece para criar propostas e contratos com mais rapidez."}
            </p>
            {!showPlatform && (
              <Button onClick={() => router.push("/servicos/novo")}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Serviço
              </Button>
            )}
          </CardContent>
        </Card>
      ) : showPlatform ? (
        <div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Aviso</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Os exemplos servem apenas para organização interna. Defina escopo, valores e condições conforme o caso concreto, sua estratégia profissional e as regras aplicáveis.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isPlatform={true}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <ServiceTable
          services={services}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}