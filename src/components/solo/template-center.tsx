"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRACTICE_AREAS } from "@/lib/solo/constants";
import { Copy, Check, BookOpen } from "lucide-react";

type Template = {
  area_key: string;
  area_label: string;
  checklist_items: string[];
  required_documents: string[];
  suggested_tasks: string[];
  suggested_deadlines: string[];
  intake_questions: string[];
  case_stages: string[];
};

export function TemplateCenter({ templates }: { templates: Template[] }) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const selected = templates.find((t) => t.area_key === selectedArea);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedItems((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setCopiedItems((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>Aviso:</strong> Revise e adapte os modelos às particularidades do caso e às regras aplicáveis.
      </div>

      {/* Grid de áreas */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {templates.map((tmpl) => (
          <Button
            key={tmpl.area_key}
            variant={selectedArea === tmpl.area_key ? "default" : "outline"}
            className="h-auto flex-col items-start p-4 text-left"
            onClick={() => setSelectedArea(selectedArea === tmpl.area_key ? null : tmpl.area_key)}
          >
            <BookOpen className="size-4 mb-2" />
            <span className="font-medium">{tmpl.area_label}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {tmpl.checklist_items.length} itens no checklist
            </span>
          </Button>
        ))}
      </div>

      {/* Detalhe da área selecionada */}
      {selected && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{selected.area_label}</h3>

          {/* Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checklist inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selected.checklist_items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="shrink-0 text-xs">{i + 1}</Badge>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Documentos necessários */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selected.required_documents.map((doc, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>{doc}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(doc, `doc-${i}`)}
                    >
                      {copiedItems.has(`doc-${i}`) ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Tarefas sugeridas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tarefas sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selected.suggested_tasks.map((task, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0 text-xs">{i + 1}</Badge>
                    {task}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Perguntas para atendimento */}
          {selected.intake_questions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Perguntas para o atendimento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selected.intake_questions.map((q, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>{q}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(q, `q-${i}`)}
                      >
                        {copiedItems.has(`q-${i}`) ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Etapas do caso */}
          {selected.case_stages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Etapas sugeridas do caso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selected.case_stages.map((stage, i) => (
                    <Badge key={i} variant="secondary">{stage}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
