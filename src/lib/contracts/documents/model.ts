import { createHash } from "node:crypto";

export const CONTRACT_DOCUMENT_RENDERER_VERSION = "alfenus-contract-pdf-1";
export const CONTRACT_DOCUMENT_TEMPLATE_VERSION = "contract-a4-1";

export type ContractDocumentModel = {
  contractId: string; contractVersionId: string; versionNumber: number; contractContentHash: string;
  title: string; firmName: string; firmDocument: string | null; firmEmail: string | null; firmPhone: string | null;
  parties: { contractor: Record<string, unknown>; client: Record<string, unknown> };
  clauses: Array<{ title: string; content: string; type: string; order: number }>;
  terms: Record<string, unknown>; generatedAt: string; locale: string; timezone: string;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : value == null ? "" : String(value);
export function sanitizeContractDocumentModel(input: ContractDocumentModel): ContractDocumentModel {
  const forbidden = /internalNotes|pricingSnapshot|margin|costs|memory|idempotency|inputHash|storagePath|token/i;
  const clean = (value: unknown): unknown => Array.isArray(value) ? value.map(clean) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !forbidden.test(key)).map(([key, item]) => [key, clean(item)])) : value;
  return { ...input, title: text(input.title), firmName: text(input.firmName), parties: clean(input.parties) as ContractDocumentModel["parties"], clauses: input.clauses.map((clause, order) => ({ title: text(clause.title), content: text(clause.content), type: text(clause.type), order })), terms: clean(input.terms) as Record<string, unknown> };
}
export function buildContractDocumentContentHash(model: ContractDocumentModel) { return createHash("sha256").update(JSON.stringify(sanitizeContractDocumentModel(model)), "utf8").digest("hex"); }
export function buildContractDocumentInputHash(input: { contractId: string; contractVersionId: string; contractContentHash: string; rendererVersion: string; templateVersion: string; locale: string; format: string }) { return createHash("sha256").update(JSON.stringify(input), "utf8").digest("hex"); }
export function buildContractDocumentFileName(model: Pick<ContractDocumentModel, "contractId" | "versionNumber">) { return `contrato-${model.contractId.slice(0, 8)}-v${model.versionNumber}.pdf`; }
export function validateContractDocumentReadiness(issues: Array<{ blocking?: boolean }>) { if (issues.some((issue) => issue.blocking)) throw new Error("CONTRACT_DOCUMENT_NOT_READY"); }
export function renderContractDocumentHtml(model: ContractDocumentModel) { const safe = sanitizeContractDocumentModel(model); const esc=(value: string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm 16mm 20mm}body{font-family:Arial,sans-serif;color:#17202a;font-size:11pt;line-height:1.55}h1{text-align:center;font-size:18pt;margin:0 0 18pt}h2{font-size:12pt;border-bottom:1px solid #c7cdd4;padding-bottom:3pt;margin-top:18pt}p{white-space:pre-wrap}.meta{color:#53606d;font-size:9pt}.footer{position:fixed;bottom:-12mm;width:100%;text-align:center;color:#65727e;font-size:8pt}</style></head><body><header><p class="meta">${esc(safe.firmName)}</p><h1>${esc(safe.title)}</h1></header><h2>Partes</h2><p><strong>Contratada:</strong> ${esc(text(safe.parties.contractor.name))}</p><p><strong>Contratante:</strong> ${esc(text(safe.parties.client.name))}</p>${safe.clauses.map((clause)=>`<section><h2>${esc(clause.title)}</h2><p>${esc(clause.content)}</p></section>`).join("")}<h2>Termos comerciais</h2><p>${esc(JSON.stringify(safe.terms))}</p><p class="meta">Local e data: ________________________________</p><div class="footer">Contrato ${esc(safe.contractId.slice(0,8))} · versão ${safe.versionNumber} · Documento gerado pelo Alfenus</div></body></html>`; }
