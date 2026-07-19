"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";

import { getErrorMessage } from "@/lib/utils";
import { enhancedConflictCheck, type ConflictResult } from "../actions";

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{count}</span>
      </div>
      <div className="p-3 space-y-2">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum resultado.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function ConflitosAvancadoPage() {
  const [result, setResult] = useState<ConflictResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    if (searchTerm.trim().length < 3) return;
    startTransition(async () => {
      try {
        setError(null);
        const data = await enhancedConflictCheck(searchTerm);
        setResult(data);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [searchTerm]);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Conflito de Interesse Avançado"
        description="Busca ampla em clientes, leads, partes, processos e correspondentes"
        actions={
          <Link href="/conflitos" className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted">
            Busca Básica
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Busca */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="search" className="text-xs">Nome, documento, e-mail, OAB, telefone ou interesse</Label>
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite pelo menos 3 caracteres..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isPending || searchTerm.trim().length < 3} className="self-end">
            {isPending ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {result && result.query.length >= 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{result.totalMatches} resultado(s) para "<strong>{result.query}</strong>"</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {/* Clientes */}
            <ResultSection title="Clientes" count={result.clients.length}>
              {result.clients.map((c: any) => (
                <div key={c.id} className="rounded border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.document ?? "Sem doc"} · {c.email ?? "Sem e-mail"}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={c.status} />
                  </div>
                  <Link href={`/clientes/${c.id}`} className="text-xs underline text-primary">Ver cliente</Link>
                </div>
              ))}
            </ResultSection>

            {/* Leads */}
            <ResultSection title="Leads" count={result.leads.length}>
              {result.leads.map((l: any) => (
                <div key={l.id} className="rounded border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.email ?? "Sem e-mail"}
                        {l.phone ? ` · ${l.phone}` : ""}
                        {l.interest ? ` · ${l.interest}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={l.status} />
                  </div>
                  <Link href={`/leads/${l.id}`} className="text-xs underline text-primary">Ver lead</Link>
                </div>
              ))}
            </ResultSection>

            {/* Partes */}
            <ResultSection title="Partes Contrárias" count={result.parties.length}>
              {result.parties.map((p: any) => (
                <div key={p.id} className="rounded border p-2">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.party_role} · {p.document ?? "Sem documento"}
                  </p>
                  <Link href={`/processos/${p.legal_case_id}`} className="text-xs underline text-primary">Ver processo</Link>
                </div>
              ))}
            </ResultSection>

            {/* Processos */}
            <ResultSection title="Processos" count={result.cases.length}>
              {result.cases.map((c: any) => (
                <div key={c.id} className="rounded border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.case_number ?? "Sem número"} · {c.opposing_party ?? "Sem parte contrária"}
                        {c.opposing_lawyer ? ` · Adv.: ${c.opposing_lawyer}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={c.status} />
                  </div>
                  <Link href={`/processos/${c.id}`} className="text-xs underline text-primary">Ver processo</Link>
                </div>
              ))}
            </ResultSection>

            {/* Correspondentes */}
            <ResultSection title="Correspondentes" count={result.correspondents.length}>
              {result.correspondents.map((c: any) => (
                <div key={c.id} className="rounded border p-2">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.oab ? `OAB: ${c.oab}` : ""}
                    {c.specialty ? ` · ${c.specialty}` : ""}
                    {c.city ? ` · ${c.city}${c.state ? `/${c.state}` : ""}` : ""}
                  </p>
                </div>
              ))}
            </ResultSection>
          </div>

          {result.totalMatches === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum conflito encontrado para "{result.query}".</p>
              <p className="mt-1 text-xs text-muted-foreground">Isso é uma boa notícia — significa que não há registros similares no sistema.</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
