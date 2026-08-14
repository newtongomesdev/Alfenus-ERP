import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { readProjectEnv } from "../proposals-test-environment.mjs";

const roles = [
  "proprietario",
  "administrador",
  "advogado",
  "assistente",
  "colaborador",
  "suporte",
];
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function fixtureEnv() {
  return readProjectEnv();
}
export function adminClient(env) {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
async function user(admin, runId, role, tenantId) {
  const email = `${runId}-${role}@example.invalid`;
  const password = `P!${crypto.randomBytes(18).toString("base64url")}9a`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const value = {
    id: created.data.user.id,
    role: role === "tenant-b-owner" ? "proprietario" : role,
    tenantId,
    credentials: { email, password },
  };
  if (tenantId) {
    const memberRole =
      role === "suporte"
        ? "visualizador"
        : role === "tenant-b-owner"
          ? "proprietario"
          : role;
    const member = await admin
      .from("law_firm_members")
      .insert({
        user_id: value.id,
        law_firm_id: tenantId,
        role: memberRole,
        name: `${runId}-${role}`,
        email,
        status: "ativo",
      });
    if (member.error) throw member.error;
  }
  return value;
}
export async function createSignedArtifactTestFixtures({ runId, admin }) {
  const tenantA = await admin
    .from("law_firms")
    .insert({ name: `${runId} A`, slug: `${runId}-a` })
    .select("id")
    .single();
  if (tenantA.error) throw tenantA.error;
  const tenantB = await admin
    .from("law_firms")
    .insert({ name: `${runId} B`, slug: `${runId}-b` })
    .select("id")
    .single();
  if (tenantB.error) throw tenantB.error;
  const users = {};
  for (const role of roles)
    users[role] = await user(admin, runId, role, tenantA.data.id);
  users.noMembership = await user(admin, runId, "no-membership", null);
  users.tenantBOwner = await user(
    admin,
    runId,
    "tenant-b-owner",
    tenantB.data.id,
  );
  const client = await admin
    .from("clients")
    .insert({
      law_firm_id: tenantA.data.id,
      name: `${runId} Client`,
      person_type: "fisica",
    })
    .select("id")
    .single();
  if (client.error) throw client.error;
  const contract = await admin
    .from("contracts")
    .insert({
      law_firm_id: tenantA.data.id,
      client_id: client.data.id,
      service_description: `${runId} Contract`,
      total_amount_cents: 10000,
      upfront_amount_cents: 1000,
      balance_cents: 9000,
      has_installments: true,
      installments_count: 2,
      status: "rascunho",
    })
    .select("id")
    .single();
  if (contract.error) throw contract.error;
  const version = await admin
    .from("contract_conversion_versions")
    .insert({
      law_firm_id: tenantA.data.id,
      contract_id: contract.data.id,
      version_number: 1,
      title: `${runId} Contract`,
      content: `Essential contract content ${runId}`,
      snapshot_json: {},
      snapshot_hash: sha(runId),
      created_by: users.proprietario.id,
      parties_json: {},
      commercial_terms_json: { currency: "BRL", totalCents: 10000 },
      readiness_json: [],
      is_active: true,
    })
    .select("id")
    .single();
  if (version.error) throw version.error;
  const clauses = await admin
    .from("contract_conversion_clauses")
    .insert([
      {
        law_firm_id: tenantA.data.id,
        contract_id: contract.data.id,
        version_id: version.data.id,
        title: "Objeto",
        content: `Essential contract content ${runId}`,
        order_index: 0,
      },
    ]);
  if (clauses.error) throw clauses.error;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.drawText(`Essential contract content ${runId}`);
  const bytes = await pdf.save();
  const documentId = crypto.randomUUID();
  const path = `contracts/${tenantA.data.id}/${contract.data.id}/source/${runId}.pdf`;
  const uploaded = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploaded.error) throw uploaded.error;
  const document = await admin
    .from("contract_documents")
    .insert({
      id: documentId,
      law_firm_id: tenantA.data.id,
      contract_id: contract.data.id,
      contract_version_id: version.data.id,
      document_type: "contract",
      status: "completed",
      storage_bucket: "documents",
      storage_path: path,
      file_name: `${runId}.pdf`,
      mime_type: "application/pdf",
      file_size: bytes.length,
      page_count: 1,
      file_hash: sha(bytes),
      contract_content_hash: sha(`Essential contract content ${runId}`),
      renderer_version: "test",
      template_version: "test",
      generated_by: users.proprietario.id,
      metadata: {},
    })
    .select("*")
    .single();
  if (document.error) throw document.error;
  const envelopeId = crypto.randomUUID();
  const providerEnvelopeId = `sandbox-${sha(envelopeId).slice(0, 24)}`;
  const envelope = await admin
    .from("contract_signature_envelopes")
    .insert({
      id: envelopeId,
      law_firm_id: tenantA.data.id,
      contract_id: contract.data.id,
      contract_document_id: documentId,
      contract_version_id: version.data.id,
      status: "signed",
      title: `${runId} Envelope`,
      document_hash: document.data.file_hash,
      document_file_size: bytes.length,
      document_page_count: 1,
      document_snapshot_json: { title: `${runId} Contract` },
      consent_version: "artifact-test-v1",
      signing_order_enabled: true,
      prepared_at: new Date().toISOString(),
      created_by: users.proprietario.id,
      updated_by: users.proprietario.id,
      lock_version: 3,
      provider: "internal_sandbox",
      provider_envelope_id: providerEnvelopeId,
      idempotency_key: `${runId}-envelope`,
      input_hash: sha(envelopeId),
    })
    .select("*")
    .single();
  if (envelope.error) throw envelope.error;
  const signerRows = [
    {
      law_firm_id: tenantA.data.id,
      envelope_id: envelopeId,
      signer_type: "person",
      role: "client",
      name: "Client",
      email: users.proprietario.credentials.email,
      signing_order: 1,
      requires_identity_verification: false,
      status: "signed",
    },
    {
      law_firm_id: tenantA.data.id,
      envelope_id: envelopeId,
      signer_type: "internal_witness",
      role: "witness",
      name: "Witness",
      email: users.administrador.credentials.email,
      signing_order: 2,
      requires_identity_verification: false,
      status: "signed",
    },
  ];
  const signers = await admin
    .from("contract_signature_signers")
    .insert(signerRows)
    .select("*");
  if (signers.error) throw signers.error;
  const delivery = await admin
    .from("contract_signature_provider_deliveries")
    .insert({
      law_firm_id: tenantA.data.id,
      envelope_id: envelopeId,
      provider: "internal_sandbox",
      provider_envelope_id: providerEnvelopeId,
      status: "signed",
      attempt_number: 1,
      request_snapshot_json: {},
      response_snapshot_json: {
        provider: "internal_sandbox",
        status: "signed",
      },
      sent_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      lock_version: 3,
    })
    .select("*")
    .single();
  if (delivery.error) throw delivery.error;
  const event = await admin
    .from("contract_signature_events")
    .insert({
      law_firm_id: tenantA.data.id,
      envelope_id: envelopeId,
      event_type: "signature_provider_signed",
      actor_user_id: users.proprietario.id,
      deduplication_key: `${runId}-signed`,
      safe_metadata_json: { provider: "internal_sandbox" },
    });
  if (event.error) throw event.error;
  const firmConfig = await admin
    .from("contract_signature_provider_configurations")
    .insert({
      law_firm_id: tenantA.data.id,
      provider: "internal_sandbox",
      environment: "sandbox",
      display_name: `${runId} sandbox`,
      status: "valid",
      is_default: true,
      public_configuration_json: {},
      encrypted_credentials: "test",
      credentials_key_version: "v1",
      created_by: users.proprietario.id,
      updated_by: users.proprietario.id,
    })
    .select("id")
    .single();
  if (firmConfig.error) throw firmConfig.error;
  return {
    runId,
    tenantA: {
      id: tenantA.data.id,
      owner: users.proprietario,
      admin: users.administrador,
      lawyer: users.advogado,
      assistant: users.assistente,
      collaborator: users.colaborador,
      support: users.suporte,
      noMembership: users.noMembership,
      ...users,
    },
    tenantB: {
      id: tenantB.data.id,
      owner: users.tenantBOwner,
      tenantBOwner: users.tenantBOwner,
    },
    users,
    providerConfiguration: firmConfig.data,
    contract: contract.data,
    contractVersion: version.data,
    clauses: clauses.data,
    sourceDocument: document.data,
    envelope: envelope.data,
    signers: signers.data,
    delivery: delivery.data,
    clientId: client.data.id,
    storagePath: path,
    userIds: Object.values(users).map((item) => item.id),
    tenantIds: [tenantA.data.id, tenantB.data.id],
  };
}
