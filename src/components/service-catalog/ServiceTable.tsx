"use client";

/**
 * ServiceTable
 * Table view for service catalog
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import { Star, Archive, Trash2, Edit, Copy } from "lucide-react";
import { SERVICE_CHARGING_MODELS } from "@/lib/service-catalog/constants";
import type { ServiceOverview } from "@/lib/service-catalog/types";

interface ServiceTableProps {
  services: ServiceOverview[];
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  isPlatform?: boolean;
}

export function ServiceTable({
  services,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onToggleFavorite,
  isPlatform,
}: ServiceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Nome</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Área</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Cobrança</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Valor</th>
            <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
            {!isPlatform && (
              <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ações</th>
            )}
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const chargingLabel = SERVICE_CHARGING_MODELS.find(
              (m) => m.value === service.charging_model
            )?.label ?? service.charging_model;

            const valueDisplay =
              service.reference_value_cents != null
                ? `R$ ${(service.reference_value_cents / 100).toFixed(2)}`
                : "—";

            return (
              <tr
                key={service.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {onToggleFavorite && !isPlatform && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleFavorite(service.id)}
                        className="h-6 w-6 p-0 shrink-0"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            service.is_favorite
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-400"
                          }`}
                        />
                      </Button>
                    )}
                    <div>
                      <span className="font-medium">{service.name}</span>
                      {isPlatform && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Biblioteca
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {service.practice_area}
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {chargingLabel}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {valueDisplay}
                </td>
                <td className="py-3 px-4 text-center">
                  <ServiceStatusBadge status={service.status} />
                </td>
                {!isPlatform && (
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(service.id)} className="h-7 w-7 p-0">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDuplicate && (
                        <Button variant="ghost" size="sm" onClick={() => onDuplicate(service.id)} className="h-7 w-7 p-0">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onArchive && service.status !== "arquivado" && (
                        <Button variant="ghost" size="sm" onClick={() => onArchive(service.id)} className="h-7 w-7 p-0">
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onRestore && service.status === "arquivado" && (
                        <Button variant="ghost" size="sm" onClick={() => onRestore(service.id)} className="h-7 w-7 p-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}