"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  revokeTrustedDeviceAction,
  revokeAllTrustedDevicesAction,
} from "@/app/configuracoes/seguranca/actions";
import type { TrustedDevice } from "@/lib/security/trusted-devices";
import {
  Monitor,
  Smartphone,
  Tablet,
  ShieldCheck,
  ShieldOff,
  Trash2,
  LogOut,
  MapPin,
  Clock,
  AlertTriangle,
} from "lucide-react";

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case "Mobile":
      return Smartphone;
    case "Tablet":
      return Tablet;
    default:
      return Monitor;
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `ha ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `ha ${days} dia${days > 1 ? "s" : ""}`;
}

function getDeviceStatus(
  device: TrustedDevice
): { label: string; variant: "default" | "secondary" | "outline"; colorClass: string } {
  if (device.status === "revogado") {
    return { label: "Revogado", variant: "secondary", colorClass: "bg-gray-400 dark:bg-gray-600" };
  }
  const trustedUntil = new Date(device.trustedUntil);
  if (trustedUntil < new Date()) {
    return { label: "Expirado", variant: "outline", colorClass: "bg-amber-500" };
  }
  return { label: "Confiavel", variant: "default", colorClass: "bg-emerald-500" };
}

export function TrustedDevicesManager({
  devices,
  currentDeviceHash,
}: {
  devices: TrustedDevice[];
  currentDeviceHash: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<TrustedDevice | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  function handleRevoke(deviceId: string) {
    setRevokeTarget(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("deviceId", deviceId);
        await revokeTrustedDeviceAction(fd);
        toast.success("Dispositivo revogado com sucesso.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao revogar dispositivo.");
      }
    });
  }

  function handleRevokeAll() {
    setShowRevokeAllDialog(false);
    startTransition(async () => {
      try {
        await revokeAllTrustedDevicesAction();
        toast.success("Todos os outros dispositivos foram revogados.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao revogar dispositivos.");
      }
    });
  }

  if (devices.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum dispositivo confiavel registrado.
      </p>
    );
  }

  const otherDevices = devices.filter((d) => d.deviceHash !== currentDeviceHash);
  const hasOtherDevices = otherDevices.length > 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {devices.map((device) => {
          const isCurrent = device.deviceHash === currentDeviceHash;
          const DeviceIcon = getDeviceIcon(device.deviceType);
          const status = getDeviceStatus(device);
          const isExpired =
            device.status === "ativo" && new Date(device.trustedUntil) < new Date();

          return (
            <div
              key={device.id}
              className={`relative flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                isCurrent
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10"
                  : device.status === "revogado"
                    ? "border-border/50 bg-muted/20 opacity-70"
                    : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* Indicador de status visual */}
                <div className="relative shrink-0">
                  <div
                    className={`size-2.5 rounded-full ${status.colorClass} ${
                      device.status === "ativo" && !isExpired
                        ? "shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                        : ""
                    }`}
                  />
                  {device.status === "ativo" && !isExpired && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" />
                  )}
                </div>

                {/* Icone do dispositivo */}
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isCurrent
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-muted"
                  }`}
                >
                  <DeviceIcon
                    className={`size-4 ${
                      isCurrent
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>

                {/* Informacoes do dispositivo */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {device.browserName}
                      {device.osName ? ` \u00b7 ${device.osName}` : ""}
                    </p>
                    {isCurrent && (
                      <Badge
                        variant="default"
                        className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                      >
                        <span className="mr-1 inline-block size-1.5 rounded-full bg-white animate-pulse" />
                        Dispositivo atual
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {device.ipAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {device.ipAddress}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatRelativeTime(device.lastSeenAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3" />
                      Ate{" "}
                      {new Date(device.trustedUntil).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status badge e botao de revogacao */}
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {!isCurrent && device.status === "ativo" && !isExpired && (
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    disabled={isPending}
                    title="Revogar este dispositivo"
                    onClick={() => setRevokeTarget(device)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botao revogar todos os outros */}
      {hasOtherDevices && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRevokeAllDialog(true)}
          disabled={isPending}
          className="w-full"
        >
          <LogOut className="size-4" />
          Revogar todos os outros ({otherDevices.length})
        </Button>
      )}

      {/* Dialog de confirmacao de revogacao individual */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogPopup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Revogar dispositivo</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja revogar o dispositivo{" "}
                <span className="font-medium text-foreground">
                  {revokeTarget?.browserName} \u00b7 {revokeTarget?.osName}
                </span>
                ? Este dispositivo precisara passar por verificacao MFA novamente.
              </DialogDescription>
            </div>
            <div className="flex w-full justify-center gap-2">
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Cancelar
              </DialogClose>
              <DialogClose
                render={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeTarget && handleRevoke(revokeTarget.id)}
                  />
                }
              >
                <Trash2 className="size-3.5" />
                Revogar
              </DialogClose>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog de confirmacao de revogacao em lote */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogPopup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Revogar todos os outros dispositivos</DialogTitle>
              <DialogDescription>
                Todos os{" "}
                <span className="font-medium text-foreground">
                  {otherDevices.length} dispositivo{otherDevices.length !== 1 ? "s" : ""}
                </span>{" "}
                serao revogados. Eles precisarao passar por verificacao MFA novamente
                para acessar o sistema.
              </DialogDescription>
            </div>
            <div className="flex w-full justify-center gap-2">
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Cancelar
              </DialogClose>
              <DialogClose
                render={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRevokeAll}
                  />
                }
              >
                <ShieldOff className="size-3.5" />
                Revogar todos
              </DialogClose>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
