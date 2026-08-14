"use client";

/**
 * ServiceCard
 * Card component for individual service display
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import { Star, Archive, Trash2, Edit, Copy } from "lucide-react";
import { SERVICE_CHARGING_MODELS } from "@/lib/service-catalog/constants";
import type { ServiceOverview } from "@/lib/service-catalog/types";

interface ServiceCardProps {
  service: ServiceOverview;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  isPlatform?: boolean;
}

export function ServiceCard({
  service,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onToggleFavorite,
  isPlatform,
}: ServiceCardProps) {
  const chargingLabel = SERVICE_CHARGING_MODELS.find(
    (m) => m.value === service.charging_model
  )?.label ?? service.charging_model;

  const valueDisplay =
    service.reference_value_cents != null
      ? `R$ ${(service.reference_value_cents / 100).toFixed(2)}`
      : "—";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate">
            {service.name}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <ServiceStatusBadge status={service.status} />
            <Badge variant="outline" className="text-xs">
              {service.practice_area}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleFavorite && !isPlatform && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFavorite(service.id)}
              className="h-7 w-7 p-0"
            >
              <Star
                className={`h-4 w-4 ${
                  service.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-gray-400"
                }`}
              />
            </Button>
          )}
          {isPlatform && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Biblioteca
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {service.short_description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {service.short_description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{chargingLabel}</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {valueDisplay}
          </span>
        </div>

        {!isPlatform ? (
          <div className="flex items-center gap-2 pt-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(service.id)} className="h-7 text-xs">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            )}
            {onDuplicate && (
              <Button variant="ghost" size="sm" onClick={() => onDuplicate(service.id)} className="h-7 text-xs">
                <Copy className="h-3.5 w-3.5 mr-1" />
                Duplicar
              </Button>
            )}
            {onArchive && service.status !== "arquivado" && (
              <Button variant="ghost" size="sm" onClick={() => onArchive(service.id)} className="h-7 text-xs">
                <Archive className="h-3.5 w-3.5 mr-1" />
                Arquivar
              </Button>
            )}
            {onRestore && service.status === "arquivado" && (
              <Button variant="ghost" size="sm" onClick={() => onRestore(service.id)} className="h-7 text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Restaurar
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}