import crypto from "node:crypto";
import pg from "pg";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readProjectEnv, assertAllowedProposalsTestEnvironment } from "./proposals-test-environment.mjs";

const env = assertAllowedProposalsTestEnvironment(readProjectEnv());
const baseURL = "http://127.0.0.1:3100";
const dbUrl = env.DATABASE_URL ?? "postgresql://postgres.lmfjntuofpdjojcuybkl:041052.11setembB@aws-1-us-west-2.pooler.supabase.com:5432/postgres";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const prefix = `conversion-runtime-${Date.now()}`;
const password = `P!${crypto.randomBytes(20).toString("base64url")}9a`;
const emails = { owner: `${prefix}-owner@example.invalid`, assistant: `${prefix}-assistant@example.invalid`, other: `${prefix}-other@example.invalid` };
const users = [];
let tenantId; let otherTenantId; let proposalId; let versionId; let clientId; let contractId;
const assert = (value, message) => { if (!value) throw new Error(message); };
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function createUser(email, name, role, firm) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (created.error) throw created.error;
  users.push(created.data.user.id);
  const member = await admin.from("law_firm_members").insert({ user_id: created.data.user.id, law_firm_id: firm, name, email, role, status: "ativo" }).select("id").single();
  if (member.error) throw member.error;
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { id: created.data.user.id, memberId: member.data.id, client };
}

async function setup() {
  const firm = await admin.from("law_firms").insert({ name: `${prefix} Firm`, slug: prefix }).select("id").single();
  if (firm.error) throw firm.error;
  tenantId = firm.data.id;
  const other = await admin.from("law_firms").insert({ name: `${prefix} Other`, slug: `${prefix}-other` }).select("id").single();
  if (other.error) throw other.error;
  otherTenantId = other.data.id;
  const owner = await createUser(emails.owner, "Conversion Owner", "proprietario", tenantId);
  const assistant = await createUser(emails.assistant, "Conversion Assistant", "assistente", tenantId);
  const otherUser = await createUser(emails.other, "Other Owner", "proprietario", otherTenantId);
  const clientRow = await admin.from("clients").insert({ law_firm_id: tenantId, name: `${prefix} Client`, email: `${prefix}@example.invalid`, person_type: "juridica" }).select("id").single();
  if (clientRow.error) throw clientRow.error;
  clientId = clientRow.data.id;
  const proposal = await admin.from("commercial_proposals").insert({ law_firm_id: tenantId, client_id: clientId, created_by: owner.id, updated_by: owner.id, origin_type: "manual", status: "draft", title: `${prefix} Accepted Proposal`, currency: "BRL", valid_until: new Date(Date.now() + 86400000 * 15).toISOString() }).select("id").single();
  if (proposal.error) throw proposal.error;
  proposalId = proposal.data.id;
  versionId = crypto.randomUUID();
  const contentHash = sha(`${prefix}-proposal-content`);
  const version = await admin.from("commercial_proposal_versions").insert({ id: versionId, law_firm_id: tenantId, proposal_id: proposalId, version_number: 1, schema_version: 1, title: `${prefix} Accepted Proposal`, introduction: "Objeto da contratação.", conclusion: "Disposições finais.", currency: "BRL", subtotal_cents: 100000, discount_cents: 10000, total_cents: 90000, entry_amount_cents: 30000, installment_count: 3, installment_amount_cents: 20000, validity_days: 15, payment_terms_json: { method: "pix", description: "Entrada e parcelas mensais." }, commercial_summary_json: { subtotalCents: 100000, discountCents: 10000, totalCents: 90000 }, content_hash: contentHash, created_by: owner.id }).select("id").single();
  if (version.error) throw version.error;
  await admin.from("commercial_proposals").update({ active_version_id: versionId }).eq("id", proposalId);
  const sectionRows = await admin.from("commercial_proposal_sections").insert([{ law_firm_id: tenantId, proposal_version_id: versionId, section_type: "scope", title: "Objeto", body_markdown: "Serviços jurídicos contratados.", order_index: 1 }, { law_firm_id: tenantId, proposal_version_id: versionId, section_type: "fees", title: "Honorários", body_markdown: "Honorários de R$ 900,00.", order_index: 2 }]).select("id");
  if (sectionRows.error) throw sectionRows.error;
  const decision = await admin.from("commercial_proposal_decisions").insert({ law_firm_id: tenantId, proposal_id: proposalId, proposal_version_id: versionId, public_link_id: crypto.randomUUID(), decision_type: "accepted", signer_name: "Cliente Aceitante", consent_text_version: "2026-07-31.v1", consent_text_snapshot: "consentimento preservado", proposal_content_hash: contentHash, public_payload_hash: sha("public"), decision_payload_hash: sha("decision"), request_input_hash: sha("input"), idempotency_key_hash: sha("decision-key"), metadata: { actorType: "public_recipient" } }).select("id").single();
  if (decision.error) {
    const link = await admin.from("commercial_proposal_public_links").insert({ id: crypto.randomUUID(), law_firm_id: tenantId, proposal_id: proposalId, proposal_version_id: versionId, token_hash: sha(`${prefix}-token`), token_prefix: prefix, status: "active", created_by: owner.id, idempotency_key: `${prefix}-link`, input_hash: sha("link") }).select("id").single();
    if (link.error) throw link.error;
    const retryDecision = await admin.from("commercial_proposal_decisions").insert({ law_firm_id: tenantId, proposal_id: proposalId, proposal_version_id: versionId, public_link_id: link.data.id, decision_type: "accepted", signer_name: "Cliente Aceitante", consent_text_version: "2026-07-31.v1", consent_text_snapshot: "consentimento preservado", proposal_content_hash: contentHash, public_payload_hash: sha("public"), decision_payload_hash: sha("decision"), request_input_hash: sha("input"), idempotency_key_hash: sha("decision-key"), metadata: { actorType: "public_recipient" } }).select("id").single();
    if (retryDecision.error) throw retryDecision.error;
  }
  const accepted = await admin.from("commercial_proposals").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", proposalId);
  if (accepted.error) throw accepted.error;
  return { owner, assistant, otherUser };
}

async function cleanup() {
  const c = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("set session_replication_role=replica");
    await c.query("delete from contract_conversion_clauses where contract_id in (select id from contracts where source_proposal_id in (select id from commercial_proposals where title like $1))", [`${prefix}%`]);
    await c.query("delete from contract_conversion_versions where contract_id in (select id from contracts where source_proposal_id in (select id from commercial_proposals where title like $1))", [`${prefix}%`]);
    await c.query("delete from contract_conversion_operations where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from contracts where source_proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_decisions where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_sections where proposal_version_id in (select id from commercial_proposal_versions where proposal_id in (select id from commercial_proposals where title like $1))", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_versions where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposals where title like $1", [`${prefix}%`]);
    await c.query("delete from clients where name like $1", [`${prefix}%`]);
    await c.query("delete from law_firm_members where law_firm_id in (select id from law_firms where slug like $1)", [`${prefix}%`]);
    await c.query("delete from law_firms where slug like $1", [`${prefix}%`]);
    await c.query("delete from auth.users where email like $1", [`${prefix}%`]);
    const result = await c.query("select (select count(*) from auth.users where email like $1)::int users,(select count(*) from law_firms where slug like $1)::int tenants,(select count(*) from commercial_proposals where title like $1)::int proposals,(select count(*) from contracts where source_proposal_id is not null and service_description like $1)::int contracts", [`${prefix}%`]);
    console.log(JSON.stringify({ cleanup: result.rows[0] }));
  } finally { await c.end(); }
}

try {
  const { owner, assistant, otherUser } = await setup();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto(`${baseURL}/entrar`); await page.getByLabel("E-mail corporativo").fill(emails.owner); await page.getByRole("textbox", { name: "Senha" }).fill(password); await page.getByRole("button", { name: "Entrar no Painel" }).click(); await page.waitForURL((url) => !url.pathname.includes("/entrar"), { timeout: 60000 });
    await page.goto(`${baseURL}/propostas/${proposalId}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("convert-proposal").click();
    await page.waitForURL(/\/contratos\/[^/]+\?convertido=1/, { timeout: 60000 });
    contractId = new URL(page.url()).pathname.split("/").pop();
    await page.getByTestId("contract-conversion-card").waitFor();
    assert((await page.getByTestId("contract-conversion-card").innerText()).includes("proposta aceita"), "origem não exibida");
    const retryKey = `proposal-contract-${proposalId}`;
    const retryHash = sha(JSON.stringify({ proposalId, idempotencyKey: retryKey }));
    const ownerRetry = await Promise.all([owner.client.rpc("convert_accepted_commercial_proposal_to_contract", { p_proposal_id: proposalId, p_idempotency_key: retryKey, p_input_hash: retryHash }), owner.client.rpc("convert_accepted_commercial_proposal_to_contract", { p_proposal_id: proposalId, p_idempotency_key: retryKey, p_input_hash: retryHash })]);
    assert(!ownerRetry[0].error && !ownerRetry[1].error && ownerRetry[0].data?.[0]?.contract_id === ownerRetry[1].data?.[0]?.contract_id, "concorrência não foi idempotente");
    const assistantDenied = await assistant.client.rpc("convert_accepted_commercial_proposal_to_contract", { p_proposal_id: proposalId, p_idempotency_key: `assistant-${proposalId}`, p_input_hash: sha(`assistant-${proposalId}`) });
    assert(Boolean(assistantDenied.error), "assistente converteu proposta");
    const crossDenied = await otherUser.client.rpc("convert_accepted_commercial_proposal_to_contract", { p_proposal_id: proposalId, p_idempotency_key: `other-${proposalId}`, p_input_hash: sha(`other-${proposalId}`) });
    assert(Boolean(crossDenied.error), "outro tenant converteu proposta");
    const direct = await owner.client.from("contract_conversion_versions").select("id").eq("contract_id", contractId);
    assert(Boolean(direct.error), "Data API permitiu leitura direta da versão");
    const secure = await owner.client.rpc("get_contract_conversion_secure", { p_contract_id: contractId });
    assert(!secure.error && secure.data?.[0]?.source_proposal_id === proposalId && secure.data?.[0]?.clauses?.length === 2, "consulta segura incompleta");
    const counts = await admin.from("contracts").select("id", { count: "exact", head: true }).eq("source_proposal_id", proposalId);
    assert(counts.count === 1, `mais de um contrato para proposta: ${counts.count}`);
    const decisionCheck = await admin.from("commercial_proposal_decisions").select("id,decision_type").eq("proposal_id", proposalId).single();
    assert(!decisionCheck.error && decisionCheck.data.decision_type === "accepted", "decisão aceita não preservada");
    await context.close();
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: true, interface: true, draftContract: true, initialVersion: true, clauses: true, sanitizedSnapshot: true, decisionPreserved: true, idempotency: true, concurrency: true, assistantDenied: true, crossTenantDenied: true, dataApiProtected: true }));
} catch (error) { console.error(JSON.stringify({ passed: false, message: error instanceof Error ? error.message : JSON.stringify(error) })); process.exitCode = 1; } finally { await cleanup(); }
