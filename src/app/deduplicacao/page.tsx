"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Merge, Trash2, SkipForward, Users } from "lucide-react";

import { detectDuplicatesAction, mergeDuplicatesAction } from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EntityType = "client" | "lead";

type Match = {
  sourceId: string;
  targetId: string;
  confidence: number;
  reasons: string[];
};

type Candidate = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};

export default function DeduplicacaoPage() {
  const [entityType, setEntityType] = useState<EntityType>("client");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  const handleDetect = async () => {
    setLoading(true);
    setMatches([]);
    setCandidates([]);
    setProcessedIds(new Set());

    const response = await detectDuplicatesAction(entityType);
    if (response.success && response.matches && response.candidates) {
      setMatches(response.matches);
      setCandidates(response.candidates);
    }
    setLoading(false);
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    setMerging(true);
    const response = await mergeDuplicatesAction(entityType, sourceId, targetId);
    if (response.success) {
      setProcessedIds((prev) => new Set([...prev, sourceId]));
    }
    setMerging(false);
  };

  const handleSkip = (sourceId: string) => {
    setProcessedIds((prev) => new Set([...prev, sourceId]));
  };

  const activeMatches = matches.filter((m) => !processedIds.has(m.sourceId));

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Deduplicação"
        description="Detecte e merge registros duplicados"
        actions={
          <Link href={entityType === "client" ? "/clientes" : "/leads"}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detectar Duplicatas</CardTitle>
            <CardDescription>
              Analisa todos os registros e encontra possíveis duplicatas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Entidade:</span>
              <Button
                variant={entityType === "client" ? "default" : "outline"}
                size="sm"
                onClick={() => setEntityType("client")}
              >
                <Users className="mr-1 h-4 w-4" />
                Clientes
              </Button>
              <Button
                variant={entityType === "lead" ? "default" : "outline"}
                size="sm"
                onClick={() => setEntityType("lead")}
              >
                <Users className="mr-1 h-4 w-4" />
                Leads
              </Button>
            </div>

            <Button onClick={handleDetect} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Analisando..." : "Detectar Duplicatas"}
            </Button>
          </CardContent>
        </Card>

        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {activeMatches.length} Duplicatas Encontradas
              </CardTitle>
              <CardDescription>
                {processedIds.size > 0 && `${processedIds.size} já processadas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeMatches.map((match, i) => {
                  const source = candidateMap.get(match.sourceId);
                  const target = candidateMap.get(match.targetId);
                  if (!source || !target) return null;

                  const confidencePercent = Math.round(match.confidence * 100);

                  return (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={confidencePercent >= 95 ? "destructive" : "secondary"}>
                          {confidencePercent}% similar
                        </Badge>
                        <div className="flex gap-1">
                          {match.reasons.map((reason) => (
                            <Badge key={reason} variant="outline" className="text-xs">
                              {reason.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground font-medium">Registro A (será removido)</div>
                          <div className="text-sm font-medium">{source.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {source.document && `Doc: ${source.document}`}
                            {source.email && ` | ${source.email}`}
                            {source.phone && ` | ${source.phone}`}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground font-medium">Registro B (será mantido)</div>
                          <div className="text-sm font-medium">{target.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {target.document && `Doc: ${target.document}`}
                            {target.email && ` | ${target.email}`}
                            {target.phone && ` | ${target.phone}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleMerge(match.sourceId, match.targetId)}
                          disabled={merging}
                        >
                          <Merge className="mr-1 h-4 w-4" />
                          Merge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkip(match.sourceId)}
                        >
                          <SkipForward className="mr-1 h-4 w-4" />
                          Pular
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSkip(match.sourceId)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {matches.length > 0 && activeMatches.length === 0 && (
          <Card className="border-green-200">
            <CardContent className="pt-6 text-center">
              <p className="text-green-600 font-medium">
                Todas as duplicatas foram processadas!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
