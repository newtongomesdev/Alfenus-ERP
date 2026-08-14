import { FileSignature } from "lucide-react";
import { convertAcceptedProposalAction } from "@/app/propostas/conversion-actions";
import { Button } from "@/components/ui/button";

export function ConvertProposalAction({ proposalId }: { proposalId: string }) {
  return <form action={convertAcceptedProposalAction}><input type="hidden" name="proposalId" value={proposalId} /><Button type="submit" data-testid="convert-proposal"><FileSignature /> Converter em contrato</Button></form>;
}
