"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSoloCaseDraftAction } from "@/app/solo/novo-caso/actions";
import { Button } from "@/components/ui/button";

type DraftItem = { id: string; title: string; clientName: string; updatedAt: string };

export function SoloDraftList({ drafts }: { drafts: DraftItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (drafts.length === 0) return null;

  function removeDraft(id: string) {
    if (!window.confirm("Excluir este rascunho? Esta ação não pode ser desfeita.")) return;
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteSoloCaseDraftAction(id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Rascunho excluído");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4" aria-labelledby="drafts-title">
      <h2 id="drafts-title" className="text-sm font-semibold">Continue um rascunho</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {drafts.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md border p-3">
            <Link href={`/solo/novo-caso?draft=${item.id}`} className="min-w-0 flex-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.clientName} · atualizado em {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</span>
            </Link>
            <Button type="button" variant="ghost" size="icon" aria-label={`Excluir ${item.title}`} disabled={isPending} onClick={() => removeDraft(item.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
