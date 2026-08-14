"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireAppContext } from "@/lib/auth/require-app-context";
import { getContractEditorDetails } from "@/lib/contracts/queries";
import { generateContractPdf } from "@/lib/contracts/documents/pdf";
import { buildContractDocumentFileName, buildContractDocumentContentHash, buildContractDocumentInputHash, validateContractDocumentReadiness } from "@/lib/contracts/documents/model";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const roles = new Set(["proprietario", "administrador", "advogado"]);

export async function generateContractDocumentAction(formData: FormData) {
  const contractId = String(formData.get("contractId") ?? "");
  const requestedVersionId = String(formData.get("versionId") ?? "");
  const key = String(formData.get("idempotencyKey") ?? `document-${contractId}-${requestedVersionId}`);
  const context = await requireAppContext();
  if (!roles.has(context.member.role) || !can(context.member.role, "contratos.gerenciar")) redirect(`/contratos/${contractId}/documento?erro=permissao`);
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/contratos/${contractId}/documento?erro=ambiente`);
  // The document tables are added incrementally and are not in the generated client type map yet.
  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const actor = (await supabase.auth.getUser()).data.user;
  if (!actor) redirect("/entrar");
  const support = await supabase.rpc("is_active_assisted_support_session", { p_law_firm_id: context.lawFirm.id });
  if (support.data) redirect(`/contratos/${contractId}/documento?erro=permissao`);

  const editor = await getContractEditorDetails(contractId);
  const version = editor?.versions.find((item) => item.id === requestedVersionId) ?? editor?.versions.find((item) => item.isActive);
  if (!editor || !version) redirect(`/contratos/${contractId}/documento?erro=nao-encontrado`);
  try { validateContractDocumentReadiness(version.readiness as Array<{ blocking?: boolean }>); } catch { redirect(`/contratos/${contractId}/documento?erro=prontidao`); }

  const inputHash = buildContractDocumentInputHash({ contractId, contractVersionId: version.id, contractContentHash: version.hash, rendererVersion: "alfenus-contract-pdf-1", templateVersion: "contract-a4-1", locale: "pt-BR", format: "pdf" });
  const existing = await db.from("contract_document_operations").select("id,document_id,status,input_hash").eq("law_firm_id", context.lawFirm.id).eq("actor_id", actor.id).eq("idempotency_key", key).maybeSingle();
  if (existing.error) redirect(`/contratos/${contractId}/documento?erro=operacao`);
  if (existing.data?.input_hash && existing.data.input_hash !== inputHash) redirect(`/contratos/${contractId}/documento?erro=conflito-idempotencia`);
  if (existing.data?.document_id && existing.data.status === "completed") redirect(`/contratos/${contractId}/documento?gerado=${existing.data.document_id}`);
  if (existing.data?.status === "processing") redirect(`/contratos/${contractId}/documento?erro=em-processamento`);

  const documentId = randomUUID();
  const storagePath = `${context.lawFirm.id}/${contractId}/${documentId}.pdf`;
  const model = {
    contractId, contractVersionId: version.id, versionNumber: version.number, contractContentHash: version.hash,
    title: version.title, firmName: context.lawFirm.name, firmDocument: context.lawFirm.document,
    firmEmail: context.lawFirm.email, firmPhone: context.lawFirm.phone,
    parties: version.parties as { contractor: Record<string, unknown>; client: Record<string, unknown> },
    clauses: version.clauses.map((item, index) => ({ title: String(item.title ?? ""), content: String(item.content ?? ""), type: String(item.type ?? "custom"), order: index })),
    terms: version.terms, generatedAt: new Date().toISOString(), locale: "pt-BR", timezone: "America/Sao_Paulo",
  };
  let operationId = existing.data?.id as string | undefined;
  const operation = operationId
    ? await db.from("contract_document_operations").update({ contract_version_id: version.id, input_hash: inputHash, status: "processing", document_id: documentId }).eq("id", operationId).select("id").single()
    : await db.from("contract_document_operations").insert({ law_firm_id: context.lawFirm.id, contract_id: contractId, contract_version_id: version.id, actor_id: actor.id, idempotency_key: key, input_hash: inputHash, status: "processing", document_id: null }).select("id").single();
  operationId = operation.data?.id as string | undefined;
  if (operation.error || !operationId) {
    const retry = await db.from("contract_document_operations").select("document_id,status,input_hash").eq("law_firm_id", context.lawFirm.id).eq("actor_id", actor.id).eq("idempotency_key", key).maybeSingle();
    if (retry.data?.input_hash === inputHash && retry.data?.document_id && retry.data.status === "completed") redirect(`/contratos/${contractId}/documento?gerado=${retry.data.document_id}`);
    if (retry.data?.input_hash === inputHash && retry.data?.status === "processing") redirect(`/contratos/${contractId}/documento?erro=em-processamento`);
    redirect(`/contratos/${contractId}/documento?erro=operacao`);
  }
  const metadata = { contractId, contractVersionId: version.id, versionNumber: version.number, rendererVersion: "alfenus-contract-pdf-1", templateVersion: "contract-a4-1", locale: "pt-BR", timezone: "America/Sao_Paulo", title: version.title };
  const processing = await db.from("contract_documents").insert({ id: documentId, law_firm_id: context.lawFirm.id, contract_id: contractId, contract_version_id: version.id, document_type: "contract", status: "processing", storage_bucket: "documents", storage_path: storagePath, file_name: buildContractDocumentFileName(model), mime_type: "application/pdf", contract_content_hash: buildContractDocumentContentHash(model), renderer_version: "alfenus-contract-pdf-1", template_version: "contract-a4-1", generated_by: actor.id, metadata }).select("id").single();
  if (processing.error) {
    await db.from("contract_document_operations").update({ status: "failed" }).eq("id", operationId);
    redirect(`/contratos/${contractId}/documento?erro=geracao`);
  }
  const linkedOperation = await db.from("contract_document_operations").update({ document_id: documentId }).eq("id", operationId).eq("status", "processing");
  if (linkedOperation.error) {
    await db.from("contract_documents").update({ status: "failed", safe_error_code: "CONTRACT_DOCUMENT_OPERATION_LINK_ERROR" }).eq("id", documentId);
    await db.from("contract_document_operations").update({ status: "failed" }).eq("id", operationId);
    redirect(`/contratos/${contractId}/documento?erro=operacao`);
  }

  try {
    let logoBytes: Uint8Array | undefined;
    if (context.lawFirm.logoPath) {
      const logo = await supabase.storage.from("branding").download(context.lawFirm.logoPath);
      if (logo.data) logoBytes = new Uint8Array(await logo.data.arrayBuffer());
    }
    const generated = await generateContractPdf(model, logoBytes);
    const fileHash = createHash("sha256").update(generated.bytes).digest("hex");
    const upload = await supabase.storage.from("documents").upload(storagePath, new Blob([new Uint8Array(generated.bytes)], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false });
    if (upload.error) throw new Error("CONTRACT_DOCUMENT_STORAGE_ERROR");
    const updated = await db.from("contract_documents").update({ status: "completed", file_size: generated.bytes.length, page_count: generated.pageCount, file_hash: fileHash, metadata: { ...metadata, pageCount: generated.pageCount, fileSize: generated.bytes.length } }).eq("id", documentId).eq("status", "processing");
    if (updated.error) throw new Error("CONTRACT_DOCUMENT_GENERATION_ERROR");
    await db.from("contract_document_operations").update({ status: "completed" }).eq("id", operationId);
    await db.rpc("record_contract_document_event", { p_law_firm_id: context.lawFirm.id, p_contract_id: contractId, p_actor_id: context.member.id, p_event_type: "contract_document_generated", p_version_id: version.id, p_document_id: documentId, p_metadata: { versionNumber: version.number, pageCount: generated.pageCount } });
  } catch (error) {
    await supabase.storage.from("documents").remove([storagePath]);
    await db.from("contract_documents").update({ status: "failed", safe_error_code: error instanceof Error ? error.message : "CONTRACT_DOCUMENT_GENERATION_ERROR" }).eq("id", documentId);
    await db.from("contract_document_operations").update({ status: "failed" }).eq("id", operationId);
    await db.rpc("record_contract_document_event", { p_law_firm_id: context.lawFirm.id, p_contract_id: contractId, p_actor_id: context.member.id, p_event_type: "contract_document_generation_failed", p_version_id: version.id, p_document_id: documentId, p_metadata: { errorCode: error instanceof Error ? error.message : "CONTRACT_DOCUMENT_GENERATION_ERROR" } });
    redirect(`/contratos/${contractId}/documento?erro=geracao`);
  }
  revalidatePath(`/contratos/${contractId}`);
  revalidatePath(`/contratos/${contractId}/documento`);
  redirect(`/contratos/${contractId}/documento?gerado=${documentId}`);
}
