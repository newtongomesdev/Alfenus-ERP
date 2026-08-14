import type { SignatureSigner, SignatureSource } from "./types";
export type SignatureReadiness = { ready: boolean; blockers: string[]; warnings: string[]; normalizedSigners: SignatureSigner[] };
const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function evaluateSignatureEnvelopeReadiness(source: SignatureSource | null | undefined, signers: SignatureSigner[], consentVersion: string, snapshot: Record<string, unknown> | null | undefined): SignatureReadiness {
  const blockers: string[] = []; const warnings: string[] = [];
  if (!source) blockers.push("contract_missing"); else { if (source.status !== "completed") blockers.push("document_not_completed"); if (!source.documentHash) blockers.push("document_hash_missing"); if (!source.fileSize || source.fileSize <= 0) blockers.push("document_file_missing"); if (!source.pageCount || source.pageCount <= 0) blockers.push("document_pages_missing"); if (source.stale) blockers.push("document_stale"); if (source.archived) blockers.push("contract_archived"); if (!source.title?.trim()) blockers.push("contract_title_missing"); }
  if (!consentVersion.trim()) blockers.push("consent_version_missing"); if (!snapshot || typeof snapshot !== "object" || !snapshot.contractDocumentId || !snapshot.documentHash) blockers.push("snapshot_invalid");
  const normalizedSigners = signers.map((item) => ({ ...item, email: item.email.trim().toLowerCase(), name: item.name.trim(), role: item.role.trim() }));
  if (!normalizedSigners.length) blockers.push("signers_missing"); const emails = new Set<string>(); const orders = new Set<number>(); for (const signer of normalizedSigners) { if (!signer.name) blockers.push("signer_name_missing"); if (!email.test(signer.email)) blockers.push("signer_email_invalid"); const key = `${signer.email}:${signer.signerType}`; if (emails.has(key)) blockers.push("signer_duplicate"); emails.add(key); if (orders.has(signer.signingOrder)) blockers.push("signing_order_duplicate"); orders.add(signer.signingOrder); }
  const sorted = [...orders].sort((a, b) => a - b); if (sorted.some((value, index) => value !== index + 1)) blockers.push("signing_order_gap"); if (normalizedSigners.some((item) => item.phone && item.phone.length > 40)) warnings.push("phone_normalized");
  return { ready: blockers.length === 0, blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], normalizedSigners };
}
