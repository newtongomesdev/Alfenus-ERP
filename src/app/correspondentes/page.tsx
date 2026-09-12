"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";

import { getErrorMessage } from "@/lib/utils";
import {
  type Correspondent,
  getCorrespondents,
  createCorrespondent,
  updateCorrespondent,
  deleteCorrespondent,
} from "./actions";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function NewCorrespondentForm({ onSubmit, onClose }: { onSubmit: (data: { name: string; oab: string; email: string; phone: string; city: string; state: string; specialty: string }) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [oab, setOab] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [specialty, setSpecialty] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4 shadow-lg space-y-3">
      <h3 className="text-sm font-semibold">Novo Correspondente</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="corr-name">Nome *</Label>
          <Input id="corr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do correspondente" />
        </div>
        <div>
          <Label htmlFor="corr-oab">OAB</Label>
          <Input id="corr-oab" value={oab} onChange={(e) => setOab(e.target.value)} placeholder="Nº OAB" />
        </div>
        <div>
          <Label htmlFor="corr-specialty">Especialidade</Label>
          <Input id="corr-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex.: Trabalhista" />
        </div>
        <div>
          <Label htmlFor="corr-email">E-mail</Label>
          <Input id="corr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="corr-phone">Telefone</Label>
          <Input id="corr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="corr-city">Cidade</Label>
          <Input id="corr-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="corr-state">Estado</Label>
          <select id="corr-state" value={state} onChange={(e) => setState(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">Selecione</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={() => onSubmit({ name, oab, email, phone, city, state, specialty })} disabled={!name.trim()}>
          Criar
        </Button>
      </div>
    </div>
  );
}

export default function CorrespondentesPage() {
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCorrespondents(search ? { search } : undefined);
      setCorrespondents(data);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = useCallback((data: any) => {
    startTransition(async () => {
      try {
        await createCorrespondent(data);
        setShowNewForm(false);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleToggleStatus = useCallback((id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
    startTransition(async () => {
      try {
        await updateCorrespondent(id, { status: newStatus });
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Excluir este correspondente?")) return;
    startTransition(async () => {
      try {
        await deleteCorrespondent(id);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Correspondentes"
        description={`${correspondents.length} correspondentes cadastrados`}
        actions={
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)}>
            {showNewForm ? "Cancelar" : "Novo Correspondente"}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {showNewForm && (
        <div className="mb-4">
          <NewCorrespondentForm onSubmit={handleCreate} onClose={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Busca */}
      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, OAB ou cidade..."
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando correspondentes...
        </div>
      ) : correspondents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum correspondente encontrado.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {correspondents.map((corr) => (
            <div key={corr.id} className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">{corr.name}</h3>
                  {corr.oab && <p className="text-xs text-muted-foreground">OAB: {corr.oab}</p>}
                </div>
                <StatusBadge value={corr.status} />
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {corr.specialty && <p>Especialidade: {corr.specialty}</p>}
                {corr.city && <p>Local: {corr.city}{corr.state ? `/${corr.state}` : ""}</p>}
                {corr.email && <p>{corr.email}</p>}
                {corr.phone && <p>{corr.phone}</p>}
              </div>
              <div className="mt-3 flex gap-2 border-t pt-2">
                <button
                  onClick={() => handleToggleStatus(corr.id, corr.status)}
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {corr.status === "ativo" ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => handleDelete(corr.id)}
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
