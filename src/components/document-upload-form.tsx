"use client";

import { useState } from "react";

import { EntitySelect } from "@/components/entity-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { uploadDocumentAction } from "@/app/documentos/actions";

const entityHints: Record<string, string> = {
  cliente: "Selecione um cliente existente no escritório.",
  processo: "Selecione um processo existente no escritório.",
  contrato: "Selecione um contrato existente no escritório.",
  prazo: "Selecione um prazo existente no escritório.",
  tarefa: "Selecione uma tarefa existente no escritório.",
};

export function DocumentUploadForm() {
  const [entityType, setEntityType] = useState("cliente");
  const [entityId, setEntityId] = useState("");

  return (
    <form
      action={uploadDocumentAction}
      encType="multipart/form-data"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome do documento</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex.: Procuração assinada"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entityType">Vincular a</Label>
        <select
          id="entityType"
          name="entityType"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setEntityId("");
          }}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="cliente">Cliente</option>
          <option value="processo">Processo</option>
          <option value="contrato">Contrato</option>
          <option value="prazo">Prazo</option>
          <option value="tarefa">Tarefa</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entityId">
          {entityType === "outro" ? "ID do registro (opcional)" : "Registro (opcional)"}
        </Label>
        <EntitySelect
          entityType={entityType}
          value={entityId}
          onChange={setEntityId}
          name="entityId"
        />
        {entityType !== "outro" ? (
          <p className="text-xs text-muted-foreground">
            {entityHints[entityType] ??
              "Preencha apenas se desejar vincular a um registro."}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Informe o UUID manualmente se desejar vincular a um registro.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Arquivo</Label>
        <Input id="file" name="file" type="file" required />
      </div>

      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Enviar documento
      </button>
    </form>
  );
}
