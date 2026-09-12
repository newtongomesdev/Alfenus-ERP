"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteDocumentAction } from "@/app/documentos/actions";

export function ProcessDocumentActions({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/documentos/${documentId}`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Baixar
      </a>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
      >
        Excluir
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir documento"
        description={`Tem certeza que deseja excluir o documento "${documentName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => {
          const form = document.createElement("form");
          form.method = "POST";
          form.style.display = "none";
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "documentId";
          input.value = documentId;
          form.appendChild(input);
          document.body.appendChild(form);
          form.requestSubmit();
        }}
      />
    </div>
  );
}
