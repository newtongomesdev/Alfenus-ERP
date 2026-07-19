"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/utils";

import {
  type PowerOfAttorney,
  getPowersOfAttorney,
  createPowerOfAttorney,
  updatePowerOfAttorneyStatus,
  deletePowerOfAttorney,
} from "@/lib/powers-of-attorney/actions";

const COMMON_POWERS = [
  "Representar em juízo",
  "Assinar documentos",
  "Receber valores",
  "Transigir",
  "Desistir",
  "Interpor recursos",
  "Celebrar contratos",
  "Gerenciar bens",
];

function NewPowerForm({ caseId, onSubmit, onCancel }: { caseId?: string; onSubmit: (data: { grantorName: string; grantorDocument: string; attorneyName: string; attorneyDocument: string; attorneyOab: string; powers: string[]; grantedAt: string; expiresAt?: string; notes?: string; legalCaseId?: string }) => void; onCancel: () => void }) {
  const [grantorName, setGrantorName] = useState("");
  const [grantorDocument, setGrantorDocument] = useState("");
  const [attorneyName, setAttorneyName] = useState("");
  const [attorneyDocument, setAttorneyDocument] = useState("");
  const [attorneyOab, setAttorneyOab] = useState("");
  const [powers, setPowers] = useState<string[]>([]);
  const [grantedAt, setGrantedAt] = useState(new Date().toISOString().split("T")[0]);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");

  const togglePower = (power: string) => {
    setPowers((prev) => prev.includes(power) ? prev.filter((p) => p !== power) : [...prev, power]);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Outorgante (quem outorga) *</Label>
          <Input value={grantorName} onChange={(e) => setGrantorName(e.target.value)} placeholder="Nome do outorgante" />
        </div>
        <div>
          <Label>Documento do outorgante</Label>
          <Input value={grantorDocument} onChange={(e) => setGrantorDocument(e.target.value)} placeholder="CPF/CNPJ" />
        </div>
        <div className="sm:col-span-2">
          <Label>Outorgado (quem recebe) *</Label>
          <Input value={attorneyName} onChange={(e) => setAttorneyName(e.target.value)} placeholder="Nome do advogado/representante" />
        </div>
        <div>
          <Label>Documento do outorgado</Label>
          <Input value={attorneyDocument} onChange={(e) => setAttorneyDocument(e.target.value)} placeholder="CPF/CNPJ" />
        </div>
        <div>
          <Label>OAB do outorgado</Label>
          <Input value={attorneyOab} onChange={(e) => setAttorneyOab(e.target.value)} placeholder="Nº OAB" />
        </div>
        <div>
          <Label>Data de outorga *</Label>
          <Input type="date" value={grantedAt} onChange={(e) => setGrantedAt(e.target.value)} />
        </div>
        <div>
          <Label>Data de expiração</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Poderes</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {COMMON_POWERS.map((power) => (
              <button
                key={power}
                type="button"
                onClick={() => togglePower(power)}
                className={`rounded border px-2 py-0.5 text-xs transition ${
                  powers.includes(power)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {power}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações adicionais" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button
          size="sm"
          onClick={() => onSubmit({
            grantorName, grantorDocument, attorneyName, attorneyDocument,
            attorneyOab, powers, grantedAt, expiresAt: expiresAt || undefined,
            notes: notes || undefined, legalCaseId: caseId || undefined,
          })}
          disabled={!grantorName.trim() || !attorneyName.trim()}
        >
          Criar Procuração
        </Button>
      </div>
    </div>
  );
}

export function PowersOfAttorney({ caseId }: { caseId?: string }) {
  const [powers, setPowers] = useState<PowerOfAttorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showNewForm, setShowNewForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPowersOfAttorney(caseId ? { caseId } : undefined);
      setPowers(data);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = useCallback((data: any) => {
    startTransition(async () => {
      try {
        await createPowerOfAttorney(data);
        setShowNewForm(false);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    startTransition(async () => {
      try {
        await updatePowerOfAttorneyStatus(id, status);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Excluir esta procuração?")) return;
    startTransition(async () => {
      try {
        await deletePowerOfAttorney(id);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando procurações...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {powers.length === 0 && !showNewForm ? (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nenhuma procuração registrada.
        </div>
      ) : (
        <div className="space-y-2">
          {powers.map((p) => (
            <div key={p.id} className="rounded border bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.attorneyName}</p>
                  <p className="text-xs text-muted-foreground">
                    Outorgante: {p.grantorName}
                    {p.grantorDocument ? ` · ${p.grantorDocument}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={p.status} />
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    disabled={isPending}
                    className="h-7 rounded border px-1 text-xs"
                  >
                    <option value="ativa">Ativa</option>
                    <option value="expirada">Expirada</option>
                    <option value="revogada">Revogada</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.powers.map((power) => (
                  <span key={power} className="rounded bg-muted px-1.5 py-0.5 text-xs">{power}</span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Outorga: {formatDate(p.grantedAt)}{p.expiresAt ? ` · Expira: ${formatDate(p.expiresAt)}` : ""}</span>
                <button onClick={() => handleDelete(p.id)} disabled={isPending} className="text-muted-foreground hover:text-red-600">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewForm ? (
        <NewPowerForm caseId={caseId} onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowNewForm(true)}>
          Nova Procuração
        </Button>
      )}
    </div>
  );
}
