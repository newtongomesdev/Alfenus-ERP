"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function uploadClientDocumentFromPortalAction(
  token: string,
  requestId: string,
  formData: FormData
) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { error: "Erro de ambiente" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Arquivo inválido ou vazio" };
  }

  // Verifica o convite
  const { data: invite, error: inviteError } = await admin
    .from("client_portal_invites")
    .select("law_firm_id, client_id, expires_at, status")
    .eq("token", token)
    .single();

  if (inviteError || !invite) return { error: "Convite inválido" };
  if (invite.status !== "ativo") return { error: "Convite revogado" };
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "Convite expirado" };
  }

  // Verifica a solicitação
  const { data: request, error: requestError } = await admin
    .from("document_requests" as any)
    .select("id, law_firm_id, client_id, status, title")
    .eq("id", requestId)
    .single();

  if (requestError || !request) return { error: "Solicitação não encontrada" };
  const req = request as any;
  if (req.law_firm_id !== invite.law_firm_id || req.client_id !== invite.client_id) {
    return { error: "Solicitação inválida" };
  }
  
  if (req.status === "concluido") return { error: "Solicitação já concluída" };

  // Faz upload para o Storage
  const storagePath = `${invite.law_firm_id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await admin
    .storage.from("documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    
  if (uploadError) return { error: "Erro ao fazer upload do arquivo no servidor" };

  // Cria o registro do Documento
  const { data: document, error: insertError } = await admin.from("documents").insert({
    law_firm_id: invite.law_firm_id,
    name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    storage_path: storagePath,
    entity_type: "client",
    entity_id: invite.client_id,
  }).select("id").single();

  if (insertError || !document) return { error: "Erro ao salvar o documento no banco de dados" };

  // Atualiza a solicitação
  const { error: updateError } = await admin
    .from("document_requests" as any)
    .update({
      document_id: document.id,
      status: "concluido", 
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) return { error: "Falha ao atualizar status da solicitação" };

  revalidatePath(`/portal/${token}`);
  return { success: true };
}
