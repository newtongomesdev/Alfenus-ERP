import crypto from "node:crypto";
import pg from "pg";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { assertAllowedProposalsTestEnvironment, readProjectEnv } from "./proposals-test-environment.mjs";

const env = assertAllowedProposalsTestEnvironment(readProjectEnv());
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const dbUrl = env.DATABASE_URL ?? process.env.ALFENUS_DATABASE_URL;
const prefix = `roles-${Date.now()}`;
const password = `P!${crypto.randomBytes(18).toString("base64url")}9a`;
const accounts = [];
let firmId; let otherFirmId; let contractId; let clientId;
const assert = (value, message) => { if (!value) throw new Error(message); };

async function account(label, lawFirmId, memberRole = label) {
  const email = `${prefix}-${label}@example.invalid`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  accounts.push(created.data.user.id);
  const member = await admin.from("law_firm_members").insert({ user_id: created.data.user.id, law_firm_id: lawFirmId, name: label, email, role: memberRole, status: "ativo" }).select("id").single();
  if (member.error) throw member.error;
  return { email, role: memberRole, memberId: member.data.id, userId: created.data.user.id };
}

async function cleanup() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("set session_replication_role=replica");
    await client.query("delete from contract_editor_events where contract_id=$1", [contractId]);
    await client.query("delete from contract_version_operations where contract_id=$1", [contractId]);
    await client.query("delete from contract_conversion_clauses where contract_id=$1", [contractId]);
    await client.query("delete from contract_conversion_versions where contract_id=$1", [contractId]);
    await client.query("delete from contracts where id=$1", [contractId]);
    await client.query("delete from clients where id=$1", [clientId]);
    await client.query("delete from support_access_sessions where law_firm_id=any($1::uuid[])", [[firmId, otherFirmId]]);
    await client.query("delete from support_access_requests where law_firm_id=any($1::uuid[])", [[firmId, otherFirmId]]);
    await client.query("delete from law_firm_members where law_firm_id=any($1::uuid[])", [[firmId, otherFirmId]]);
    await client.query("delete from law_firms where id=any($1::uuid[])", [[firmId, otherFirmId]]);
    if (accounts.length) await client.query("delete from auth.users where id=any($1::uuid[])", [accounts]);
    const result = await client.query("select (select count(*) from auth.users where email like $1)::int users,(select count(*) from law_firms where slug like $2)::int tenants,(select count(*) from contracts where service_description like $3)::int contracts", [`${prefix}%`, `${prefix}%`, `${prefix}%`]);
    console.log(JSON.stringify({ cleanup: result.rows[0] }));
  } finally { await client.end(); }
}

async function login(page, credentials) {
  await page.goto("http://127.0.0.1:3100/entrar");
  await page.getByLabel("E-mail corporativo").fill(credentials.email);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/entrar"), { timeout: 60000 });
}

try {
  const firm = await admin.from("law_firms").insert({ name: prefix, slug: prefix }).select("id").single();
  if (firm.error) throw firm.error;
  firmId = firm.data.id;
  const other = await admin.from("law_firms").insert({ name: `${prefix}-other`, slug: `${prefix}-other` }).select("id").single();
  if (other.error) throw other.error;
  otherFirmId = other.data.id;
  const roles = await Promise.all(["proprietario", "administrador", "advogado", "assistente", "colaborador"].map((role) => account(role, firmId)));
  const otherOwner = await account("other-owner", otherFirmId, "proprietario");
  const client = await admin.from("clients").insert({ law_firm_id: firmId, name: `${prefix}-client`, person_type: "fisica" }).select("id").single();
  if (client.error) throw client.error;
  clientId = client.data.id;
  const contract = await admin.from("contracts").insert({ law_firm_id: firmId, client_id: clientId, service_description: prefix, total_amount_cents: 10000, upfront_amount_cents: 0, balance_cents: 10000, has_installments: false, installments_count: 1, status: "rascunho" }).select("id").single();
  if (contract.error) throw contract.error;
  contractId = contract.data.id;
  const version = await admin.from("contract_conversion_versions").insert({ law_firm_id: firmId, contract_id: contractId, version_number: 1, title: prefix, content: "internal-content", snapshot_json: { internalNotes: "hidden" }, snapshot_hash: "a".repeat(64), created_by: accounts[0], parties_json: { contractor: { name: "restricted-party" }, client: { name: "restricted-client" } }, commercial_terms_json: { currency: "BRL", totalCents: 10000 }, metadata_json: { internal: "hidden" }, is_active: true }).select("id").single();
  if (version.error) throw version.error;
  await admin.from("contracts").update({ active_contract_version_id: version.data.id }).eq("id", contractId);

  const browser = await chromium.launch({ headless: true });
  try {
    const writeRoles = new Set(["proprietario", "administrador", "advogado"]);
    for (const credentials of roles) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
      const page = await context.newPage();
      await login(page, credentials);
      await page.goto(`http://127.0.0.1:3100/contratos/${contractId}/editar`);
      if (writeRoles.has(credentials.role)) await page.getByRole("heading", { name: "Editar contrato" }).waitFor();
      else {
        await page.waitForURL(/\/contratos\?erro=permissao/);
        const body = await page.locator("body").innerText();
        assert(!body.includes("restricted-party") && !body.includes("internal-content"), `${credentials.role} recebeu conteúdo sensível`);
      }
      await context.close();
    }
    const request = await admin.from("support_access_requests").insert({ law_firm_id: firmId, requested_by: roles[2].userId, reason: "Validação de suporte", status: "aprovada", approved_at: new Date().toISOString(), approved_by: roles[2].userId, approved_duration_minutes: 60 }).select("id").single();
    if (request.error) throw request.error;
    const support = await admin.from("support_access_sessions").insert({ access_request_id: request.data.id, law_firm_id: firmId, operator_id: roles[2].memberId, approved_by: roles[2].userId, expires_at: new Date(Date.now() + 3600000).toISOString(), status: "aguardando_inicio" }).select("id").single();
    if (support.error) throw support.error;
    const supportContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const supportPage = await supportContext.newPage();
    await login(supportPage, roles[2]);
    await supportPage.goto(`http://127.0.0.1:3100/contratos/${contractId}/editar`);
    await supportPage.waitForURL(/\/contratos\?erro=permissao/);
    await supportContext.close();
    const otherContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const otherPage = await otherContext.newPage();
    await login(otherPage, otherOwner);
    await otherPage.goto("http://127.0.0.1:3100/contratos");
    assert(!(await otherPage.locator("body").innerText()).includes(prefix), "outro tenant viu contrato");
    await otherContext.close();
    const anonymous = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const anonymousPage = await anonymous.newPage();
    await anonymousPage.goto("http://127.0.0.1:3100/contratos");
    await anonymousPage.waitForURL(/\/entrar/);
    await anonymous.close();
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: true, roles: true, owner: true, administrator: true, lawyer: true, assistantDenied: true, collaboratorDenied: true, supportSessionDenied: true, crossTenantDenied: true, anonymousDenied: true, isolatedContexts: true }));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await cleanup(); }
