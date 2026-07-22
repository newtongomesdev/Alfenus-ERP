"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
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
          <ShieldCheck className="size-5 text-emerald-600" />
        ) : (
          <ShieldOff className="size-5 text-muted-foreground" />
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
      <form action={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span>Endereço IP</span>
          <Input
            name="ipAddress"
            placeholder="192.168.1.100"
            required
            disabled={isPending}
          />
        </label>
        <label className="flex-1 space-y-1 text-sm">
          <span>Faixa CIDR (opcional)</span>
          <Input
            name="cidrRange"
            placeholder="192.168.1.0/24"
            disabled={isPending}
          />
        </label>
        <label className="flex-1 space-y-1 text-sm">
          <span>Descrição (opcional)</span>
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
      </form>

      {/* Lista de IPs */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Nenhum endereço IP na lista de permissões.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <Switch
                size="sm"
                checked={entry.isActive}
                onCheckedChange={() => handleToggle(entry.id, entry.isActive)}
                disabled={isPending}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {entry.ipAddress}
                  {entry.cidrRange ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      / {entry.cidrRange}
                    </span>
                  ) : null}
                </p>
                {entry.description ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.description}
                  </p>
                ) : null}
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
          ))}
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
          <DialogTitle>Remover endereço IP</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.ipAddress}
            </span>{" "}
            da lista de permissões? Esta ação não pode ser desfeita.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
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
              Remover
            </DialogClose>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
