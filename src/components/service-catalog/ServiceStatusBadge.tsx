/**
 * Service Status Badge
 * Badge component for service status
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { SERVICE_STATUS_CONFIG } from "@/lib/service-catalog/constants";
import type { ServiceStatus } from "@/lib/service-catalog/types";

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  size?: "sm" | "md";
}

export function ServiceStatusBadge({ status, size = "sm" }: ServiceStatusBadgeProps) {
  const config = SERVICE_STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
    >
      {config.label}
    </Badge>
  );
}