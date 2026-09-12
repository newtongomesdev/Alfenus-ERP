"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duplicateProposalAction } from "@/lib/proposals/application/actions";

export function DuplicateProposalAction({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [copyRecipients, setCopyRecipients] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function duplicate() {
    setSaving(true); setMessage(null);
    const result = await duplicateProposalAction({ sourceProposalId: proposalId, title: title.trim() || null, copyRecipients, idempotencyKey: `ui-duplicate-${proposalId}-${crypto.randomUUID()}`, inputHash: "0".repeat(64) });
    setSaving(false);
    if (!("data" in result) || !result.data) { setMessage(result.error?.message ?? "Não foi possível duplicar a proposta."); return; }
    router.push(`/propostas/${result.data.proposalId}/editar`);
  }
  return <div className="relative"><Button variant="outline" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Copy /> Duplicar</Button>{open && <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-background p-4 shadow-lg"><p className="font-medium">Duplicar proposta</p><p className="mt-1 text-xs text-muted-foreground">A original permanece intacta e a cópia começa como rascunho.</p><Input className="mt-3" aria-label="Título da cópia" placeholder="Título da cópia (opcional)" value={title} onChange={(event) => setTitle(event.target.value)} /><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={copyRecipients} onChange={(event) => setCopyRecipients(event.target.checked)} />Copiar destinatários</label>{message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}<div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={duplicate} disabled={saving}>{saving ? "Duplicando..." : "Confirmar"}</Button></div></div>}</div>;
}
