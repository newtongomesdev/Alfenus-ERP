"use client";

import { useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decidePublicProposalAction } from "@/lib/proposals/decision-actions";
import { proposalDecisionConsentText, proposalDecisionConsentVersion } from "@/lib/proposals/application/schemas";
import type { PublicProposalDecisionDTO } from "@/lib/proposals/application/dto";

type DecisionKind = "accepted" | "rejected";

interface PublicProposalDecisionPanelProps {
  token: string;
  status: string;
  decision?: { type: DecisionKind; decidedAt: string; signerName: string; message: string } | null;
}

export function PublicProposalDecisionPanel({ token, status, decision: initialDecision }: PublicProposalDecisionPanelProps) {
  const [decision, setDecision] = useState(initialDecision ?? null);
  const [kind, setKind] = useState<DecisionKind>("accepted");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [documentLast4, setDocumentLast4] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef<string | null>(null);
  const canDecide = !decision && (status === "sent" || status === "viewed");

  const openDecision = (nextKind: DecisionKind) => {
    setKind(nextKind);
    setError("");
    setMessage("");
    setConsent(false);
    idempotencyKey.current = crypto.randomUUID();
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    if (!name.trim() || !consent) {
      setError("Informe seu nome e marque o consentimento para continuar.");
      return;
    }
    setBusy(true);
    const result = await decidePublicProposalAction({ token, decisionType: kind, signerName: name, signerEmail: email, signerDocumentLast4: documentLast4, signerRole: role, companyName: company, rejectionReason: kind === "rejected" ? reason : "", consentTextVersion: proposalDecisionConsentVersion, consentTextSnapshot: proposalDecisionConsentText[kind], idempotencyKey: idempotencyKey.current ?? crypto.randomUUID() });
    setBusy(false);
    if ("error" in result && result.error) {
      setError(result.error.message);
      return;
    }
    const data = (result as { data?: PublicProposalDecisionDTO }).data;
    if (data) {
      setDecision({ type: data.decisionType, decidedAt: data.decidedAt, signerName: data.signerName, message: data.message });
      setMessage(data.message);
      setOpen(false);
    }
  };

  if (decision) {
    return <section aria-live="polite" data-testid="public-proposal-decision-result" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 text-emerald-600" /><div><h2 className="text-lg font-semibold">{decision.type === "accepted" ? "Proposta aceita" : "Proposta recusada"}</h2><p className="mt-1 text-sm text-muted-foreground">{decision.message}</p><p className="mt-3 text-sm">Decisão registrada em {new Date(decision.decidedAt).toLocaleString("pt-BR")} por <strong>{decision.signerName}</strong>.</p><p className="mt-3 text-xs text-muted-foreground">Registro eletrônico de aceite comercial. Não representa assinatura digital certificada.</p></div></div></section>;
  }

  if (!canDecide) return null;

  return <section data-testid="public-proposal-decision-panel" className="rounded-2xl border bg-muted/20 p-6"><div><h2 className="text-lg font-semibold">Sua decisão</h2><p className="mt-1 text-sm text-muted-foreground">Escolha uma ação para registrar sua decisão sobre a versão apresentada.</p></div><div className="mt-5 flex flex-wrap gap-3"><Button data-testid="accept-proposal" onClick={() => openDecision("accepted")}><CheckCircle2 /> Aceitar proposta</Button><Button data-testid="reject-proposal" variant="outline" onClick={() => openDecision("rejected")}><XCircle /> Recusar proposta</Button></div>{message && <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{message}</p>}<Dialog open={open} onOpenChange={setOpen}><DialogPopup className="max-h-[90vh] overflow-y-auto"><DialogTitle>{kind === "accepted" ? "Confirmar aceite" : "Confirmar recusa"}</DialogTitle><DialogDescription className="mt-2">{kind === "accepted" ? "Esta ação registrará sua concordância com a versão apresentada." : "A recusa será registrada sem alterar o conteúdo da proposta."}</DialogDescription><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="decision-name">Nome completo *</Label><Input id="decision-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={500} /></div><div className="space-y-2"><Label htmlFor="decision-email">E-mail {kind === "accepted" ? "(opcional)" : "(opcional)"}</Label><Input id="decision-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={320} /></div>{kind === "accepted" && <><div className="space-y-2"><Label htmlFor="decision-document">Últimos quatro caracteres do documento (opcional)</Label><Input id="decision-document" inputMode="numeric" value={documentLast4} onChange={(event) => setDocumentLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} /></div><div className="space-y-2"><Label htmlFor="decision-role">Função ou cargo (opcional)</Label><Input id="decision-role" value={role} onChange={(event) => setRole(event.target.value)} maxLength={200} /></div><div className="space-y-2"><Label htmlFor="decision-company">Empresa (opcional)</Label><Input id="decision-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={500} /></div></>}{kind === "rejected" && <div className="space-y-2"><Label htmlFor="decision-reason">Motivo da recusa (opcional)</Label><textarea id="decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={4} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></div>}<div className="rounded-lg border bg-muted/30 p-3"><div className="flex items-start gap-3"><Checkbox checked={consent} onCheckedChange={setConsent} aria-label="Confirmar consentimento" /><p className="text-sm leading-6">{proposalDecisionConsentText[kind]}</p></div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div><div className="mt-6 flex justify-end gap-2"><DialogClose render={<Button variant="outline" />} disabled={busy}>Cancelar</DialogClose><Button data-testid={`confirm-${kind}`} onClick={submit} disabled={busy}>{busy ? "Processando..." : kind === "accepted" ? "Confirmar aceite" : "Confirmar recusa"}</Button></div></DialogPopup></Dialog></section>;
}
