export type CapturedLead = {
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  source: string | null;
  interest: string;
  notes: string | null;
  externalId: string | null;
  estimatedValueCents: number;
  sourceMetadata: Record<string, unknown>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function first(payload: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = text(payload[alias]);
    if (value) return value;
  }
  return "";
}

export function mapLeadCapturePayload(payload: Record<string, unknown>, fieldMap: Record<string, unknown> = {}): CapturedLead {
  const read = (key: string, aliases: string[]) => first(payload, [text(fieldMap[key]), ...aliases].filter(Boolean));
  const value = read("estimatedValueCents", ["estimatedValueCents", "value", "valor"]);
  const numericValue = Number(value.replace(/\D/g, "")) || 0;

  return {
    name: read("name", ["name", "nome", "full_name"]),
    email: read("email", ["email", "e-mail"]) || null,
    phone: read("phone", ["phone", "telefone", "celular"]) || null,
    whatsapp: read("whatsapp", ["whatsapp"]) || null,
    source: read("source", ["source", "origem"]) || null,
    interest: read("interest", ["interest", "interesse", "area", "assunto"]) || "Não informado",
    notes: read("notes", ["notes", "observacoes", "mensagem", "message"]) || null,
    externalId: read("externalId", ["externalId", "external_id", "id"]) || null,
    estimatedValueCents: numericValue,
    sourceMetadata: payload,
  };
}
