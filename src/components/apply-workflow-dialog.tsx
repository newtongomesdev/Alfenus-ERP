"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { applyWorkflowTemplateAction } from "@/app/workflows/actions";

import {
  Dialog,
  DialogTrigger,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Template = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
};

interface ApplyWorkflowDialogProps {
  caseId: string;
  templates: Template[];
  members: Array<{ id: string; name: string }>;
  currentMemberId: string;
}

export function ApplyWorkflowDialog({
  caseId,
  templates,
  members,
  currentMemberId,
}: ApplyWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <GitBranch className="mr-1 h-4 w-4" />
            Aplicar Workflow
          </Button>
        }
      />

      <DialogBackdrop />
      <DialogPopup>
        <DialogTitle>Aplicar Workflow ao Processo</DialogTitle>
        <DialogDescription>
          Selecione um template para criar tarefas e prazos automaticamente.
        </DialogDescription>

        <form
          action={applyWorkflowTemplateAction}
          onSubmit={() => setOpen(false)}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="legalCaseId" value={caseId} />

          <div>
            <Label htmlFor="templateId">Template</Label>
            <select
              id="templateId"
              name="templateId"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione um template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.itemCount} itens)
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="responsibleMemberId">Responsável</Label>
            <select
              id="responsibleMemberId"
              name="responsibleMemberId"
              defaultValue={currentMemberId}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              }
            />
            <Button
              type="submit"
              size="sm"
              disabled={!selectedTemplate}
            >
              Aplicar
            </Button>
          </div>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
