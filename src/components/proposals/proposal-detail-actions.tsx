"use client";
import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { archiveProposalAction, restoreProposalAction } from "@/lib/proposals/application/actions";
import { useRouter } from "next/navigation";

export function ProposalDetailActions({ proposalId, updatedAt, action }: { proposalId: string; updatedAt: string; action: "archive" | "restore" }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null);
  async function run() { const result = action === "archive" ? await archiveProposalAction({ proposalId, expectedUpdatedAt: updatedAt }) : await restoreProposalAction({ proposalId, expectedUpdatedAt: updatedAt }); if (!("data" in result) || !result.data) setError(result.error?.message ?? "Não foi possível alterar."); else router.refresh(); }
  return <><Button variant="outline" onClick={() => { setError(null); setOpen(true); }}>{action === "archive" ? <><Archive /> Arquivar</> : <><RotateCcw /> Restaurar</>}</Button><ConfirmDialog open={open} onOpenChange={setOpen} title={action === "archive" ? "Arquivar proposta" : "Restaurar proposta"} description={action === "archive" ? "A proposta sairá da listagem normal, mas poderá ser restaurada." : "A proposta voltará para a listagem normal como rascunho."} confirmLabel={action === "archive" ? "Arquivar" : "Restaurar"} variant={action === "archive" ? "destructive" : "default"} onConfirm={run} />{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</>;
}
