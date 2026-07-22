"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  ShieldCheck,
  ShieldOff,
  Network,
  FileText,
  ListX,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogBackdrop,
} from "@/components/ui/dialog";
import {
  addIpEntryAction,
  removeIpEntryAction,
  toggleIpEntryAction,
} from "@/app/configuracoes/seguranca/ip-allowlist/actions";
import type { IpAllowlistEntry } from "@/lib/security/policies";

export function IpAllowlistManager({
  entries,
  ipRestrictionEnabled,
}: {
  entries: IpAllowlistEntry[];
  ipRestrictionEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<IpAllowlistEntry | null>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      try {
        await addIpEntryAction(formData);
        toast.success("Endereço IP adicionado à lista de permissões.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao adicionar IP.");
      }
    });
  }

  function handleToggle(entryId: string, currentActive: boolean) {
    startTransition(async () => {
      try {
        await toggleIpEntryAction(entryId, !currentActive);
        toast.success(currentActive ? "IP desativado." : "IP ativado.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao alterar status.");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await removeIpEntryAction(id);
        toast.success("Endereço IP removido da lista.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover IP.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Status da restrição */}
      <div className="flex items-center gap-3 rounded-lg border border-border p-4">
        {ipRestrictionEnabled ? (
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <ShieldCheck className="size-5 text-emerald-600" />
          </div>
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
            <ShieldOff className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">
            Restrição de IP está{" "}
            <Badge variant={ipRestrictionEnabled ? "default" : "secondary"}>
              {ipRestrictionEnabled ? "Ativa" : "Inativa"}
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            {ipRestrictionEnabled
              ? "Apenas os IPs listados abaixo podem acessar o sistema."
              : "Todos os endereços IP podem acessar o sistema."}
          </p>
        </div>
      </div>

      {/* Formulário de adição */}
      <form action={handleAdd} className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted">
            <Plus className="size-4 text-muted-foreground" />
          </div>
          Adicionar novo IP
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1.5 text-sm">
            <span className="flex items-center gap-1.5">
              <Network className="size-3.5 text-muted-foreground" />
              Endereço IP
            </span>
            <Input
              name="ipAddress"
              placeholder="192.168.1.100"
              required
              disabled={isPending}
            />
          </label>
          <label className="flex-1 space-y-1.5 text-sm">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-muted-foreground" />
              Faixa CIDR (opcional)
            </span>
            <Input
              name="cidrRange"
              placeholder="192.168.1.0/24"
              disabled={isPending}
            />
          </label>
          <label className="flex-1 space-y-1.5 text-sm">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-muted-foreground" />
              Descrição (opcional)
            </span>
            <Input
              name="description"
              placeholder="Escritório central"
              disabled={isPending}
            />
          </label>
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            className="shrink-0"
          >
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
      </form>

      {/* Lista de IPs */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ListX className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum endereço IP na lista</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione endereços IP acima para restringir o acesso ao sistema.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isCidr = !!entry.cidrRange;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  entry.isActive
                    ? "border-border hover:bg-muted/30"
                    : "border-border/50 bg-muted/20 opacity-70"
                }`}
              >
                {/* Indicador de status visual */}
                <div className="relative shrink-0">
                  <div
                    className={`size-3 rounded-full ${
                      entry.isActive
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  {entry.isActive && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" />
                  )}
                </div>

                <Switch
                  size="sm"
                  checked={entry.isActive}
                  onCheckedChange={() => handleToggle(entry.id, entry.isActive)}
                  disabled={isPending}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {entry.ipAddress}
                    </p>
                    <Badge
                      variant={isCidr ? "outline" : "secondary"}
                      className="shrink-0 text-[10px]"
                    >
                      {isCidr ? "CIDR" : "IP unico"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    {isCidr && (
                      <span className="truncate text-xs text-muted-foreground">
                        / {entry.cidrRange}
                      </span>
                    )}
                    {entry.description && (
                      <>
                        {isCidr && <span className="text-muted-foreground">·</span>}
                        <span className="truncate text-xs text-muted-foreground">
                          {entry.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Badge variant={entry.isActive ? "default" : "secondary"}>
                  {entry.isActive ? "Ativo" : "Inativo"}
                </Badge>
                <Button
                  variant="destructive"
                  size="icon-xs"
                  disabled={isPending}
                  onClick={() => setDeleteTarget(entry)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPopup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Remover endereço IP</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover{" "}
                <span className="font-medium text-foreground">
                  {deleteTarget?.ipAddress}
                </span>{" "}
                da lista de permissões? Esta ação não pode ser desfeita.
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
                    onClick={handleDelete}
                  />
                }
              >
                <Trash2 className="size-3.5" />
                Remover
              </DialogClose>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
