"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { suspendTenantAction, reactivateTenantAction } from "@/app/admin/escritorios/actions";

export function SuspendTenantButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Suspender escritório
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Suspender escritório"
        description="O escritório e todos os seus membros perderão o acesso ao sistema."
        onConfirm={async () => {
          const fd = new FormData();
          fd.set("tenantId", tenantId);
          await suspendTenantAction(fd);
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

export function ReactivateTenantButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        Reativar escritório
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reativar escritório"
        description="O escritório terá acesso restaurado ao sistema."
        onConfirm={async () => {
          const fd = new FormData();
          fd.set("tenantId", tenantId);
          await reactivateTenantAction(fd);
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
