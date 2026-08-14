import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import pg from "pg";
import { readProjectEnv, assertAllowedProposalsTestEnvironment } from "./proposals-test-environment.mjs";

const env = assertAllowedProposalsTestEnvironment(readProjectEnv());
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const dbUrl = env.DATABASE_URL ?? "postgresql://postgres.lmfjntuofpdjojcuybkl:041052.11setembB@aws-1-us-west-2.pooler.supabase.com:5432/postgres";
const prefix = `decision-runtime-${Date.now()}`;
const password = `P!${crypto.randomBytes(20).toString("base64url")}9a`;
const email = `${prefix}-owner@example.invalid`;
const baseURL = "http://127.0.0.1:3100";
let userId;
let tenantId;
const proposalIds = [];
const assert = (value, message) => { if (!value) throw new Error(message); };

async function setupProposal(title, amount) {
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const loginResult = await userClient.auth.signInWithPassword({ email, password });
  if (loginResult.error) throw loginResult.error;
  const result = await userClient.rpc("create_commercial_proposal_manual", { p_title: `${prefix} ${title}`, p_currency: "BRL", p_validity_days: 15, p_idempotency_key: `${prefix}-${title}` });
  if (result.error) throw result.error;
  const proposalId = result.data[0].proposal_id;
  proposalIds.push(proposalId);
  const detail = await userClient.rpc("get_commercial_proposal_secure", { p_proposal_id: proposalId });
  if (detail.error) throw detail.error;
  const version = await userClient.rpc("create_commercial_proposal_version", { p_proposal_id: proposalId, p_expected_updated_at: detail.data[0].updated_at, p_draft: { title: `${prefix} ${title}`, currency: "BRL", validityDays: 15, contentHash: crypto.createHash("sha256").update(`${prefix}-${title}`).digest("hex"), summary: { subtotalCents: amount, discountCents: 0, totalCents: amount, entryAmountCents: Math.floor(amount / 2), installmentCount: 2, installmentAmountCents: Math.floor(amount / 4) }, paymentTerms: { method: "pix", installments: 2 }, sections: [{ sectionType: "fees", title: "Honorários", bodyMarkdown: `Valor de R$ ${amount / 100}` }, { sectionType: "validity", title: "Validade", bodyMarkdown: "15 dias" }], items: [{ itemType: "service", description: "Serviço jurídico", quantity: 1, unitAmountCents: amount, totalAmountCents: amount, orderIndex: 0 }] } });
  if (version.error) throw version.error;
  const activated = await userClient.rpc("activate_commercial_proposal_version", { p_proposal_id: proposalId, p_version_id: version.data[0].version_id, p_expected_updated_at: version.data[0].updated_at });
  if (activated.error) throw activated.error;
  const ready = await userClient.rpc("transition_commercial_proposal", { p_proposal_id: proposalId, p_to: "ready", p_expected_updated_at: activated.data[0].updated_at });
  if (ready.error) throw ready.error;
  return proposalId;
}

async function login(page) {
  await page.goto(`${baseURL}/entrar`, { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "E-mail corporativo" }).fill(email);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL(/dashboard|onboarding/, { timeout: 60000 });
}

async function createPublicLink(page, proposalId) {
  await page.goto(`${baseURL}/propostas/${proposalId}`, { waitUntil: "domcontentloaded" });
  const panel = page.getByTestId("public-link-panel");
  await panel.waitFor();
  await panel.getByRole("button", { name: /Gerar link/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const url = await dialog.getByRole("textbox", { name: /Link público/i }).inputValue();
  await dialog.getByRole("button", { name: "Fechar" }).click();
  return url.replace("http://localhost:3000", baseURL);
}

async function decide(page, url, type, signer) {
  const responses = [];
  const errors = [];
  page.on("response", (response) => { if (response.status() >= 500) responses.push(`${response.status()} ${response.url()}`); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("public-proposal-decision-panel").waitFor();
  await page.getByTestId(type === "accepted" ? "accept-proposal" : "reject-proposal").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome completo *").fill(signer);
  await dialog.getByLabel(/E-mail/).fill(`${signer.toLowerCase().replace(/\s+/g, ".")}@example.invalid`);
  if (type === "rejected") await dialog.getByLabel(/Motivo da recusa/).fill("Condições comerciais serão revistas.");
  await dialog.getByRole("checkbox", { name: "Confirmar consentimento" }).click();
  await Promise.all([dialog.getByTestId(`confirm-${type}`).click(), dialog.getByTestId(`confirm-${type}`).click().catch(() => undefined)]);
  try { await page.getByTestId("public-proposal-decision-result").waitFor({ timeout: 10000 }); } catch { throw new Error(`decisão não concluída: ${await page.locator("body").innerText()}`); }
  assert((await page.locator("body").innerText()).includes(type === "accepted" ? "Proposta aceita" : "Proposta recusada"), `${type} não apareceu`);
  assert(responses.length === 0, `respostas 5xx: ${responses.join(" | ")}`);
  assert(errors.length === 0, `erros de navegador: ${errors.join(" | ")}`);
  const body = await page.locator("body").innerText();
  assert(!/internalNotes|pricingSnapshot|contentHash|inputHash|idempotencyKey|lawFirmId|actorId|margin|internalCost|calculationMemory|SQLSTATE|stack/i.test(body), "dados internos expostos na página pública");
}

async function cleanup() {
  const c = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("set session_replication_role=replica");
    await c.query("delete from commercial_proposal_decisions where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_public_links where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_events where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_items where proposal_version_id in (select id from commercial_proposal_versions where proposal_id in (select id from commercial_proposals where title like $1))", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_sections where proposal_version_id in (select id from commercial_proposal_versions where proposal_id in (select id from commercial_proposals where title like $1))", [`${prefix}%`]);
    await c.query("delete from commercial_proposal_versions where proposal_id in (select id from commercial_proposals where title like $1)", [`${prefix}%`]);
    await c.query("delete from commercial_proposals where title like $1", [`${prefix}%`]);
    await c.query("delete from law_firm_members where law_firm_id in (select id from law_firms where slug like $1)", [`${prefix}%`]);
    await c.query("delete from law_firms where slug like $1", [`${prefix}%`]);
    await c.query("delete from auth.users where email like $1", [`${prefix}%`]);
    const result = await c.query("select (select count(*) from auth.users where email like $1)::int users,(select count(*) from law_firms where slug like $1)::int tenants,(select count(*) from commercial_proposals where title like $1)::int proposals", [`${prefix}%`]);
    console.log(JSON.stringify({ cleanup: result.rows[0] }));
  } finally { await c.end(); }
}

try {
  const firm = await admin.from("law_firms").insert({ name: `${prefix} Firm`, slug: prefix }).select("id").single();
  if (firm.error) throw firm.error;
  tenantId = firm.data.id;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Decision Owner" } });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const member = await admin.from("law_firm_members").insert({ user_id: userId, law_firm_id: tenantId, name: "Decision Owner", email, role: "proprietario", status: "ativo" });
  if (member.error) throw member.error;
  const acceptProposal = await setupProposal("aceite", 95000);
  const rejectProposal = await setupProposal("recusa", 125000);
  const browser = await chromium.launch({ headless: true });
  try {
    const owner = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const ownerPage = await owner.newPage();
    await login(ownerPage);
    const acceptUrl = await createPublicLink(ownerPage, acceptProposal);
    const rejectUrl = await createPublicLink(ownerPage, rejectProposal);
    const sent = await admin.from("commercial_proposals").update({ status: "sent", sent_at: new Date().toISOString() }).in("id", [acceptProposal, rejectProposal]);
    if (sent.error) throw sent.error;
    const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const acceptPage = await publicContext.newPage();
    await decide(acceptPage, acceptUrl, "accepted", "Cliente Aceite");
    await acceptPage.reload({ waitUntil: "domcontentloaded" });
    await acceptPage.getByTestId("public-proposal-decision-result").waitFor();
    assert((await acceptPage.locator("body").innerText()).includes("já foi aceita"), "estado aceito não persistiu");
    const rejectPage = await publicContext.newPage();
    await decide(rejectPage, rejectUrl, "rejected", "Cliente Recusa");
    await rejectPage.reload({ waitUntil: "domcontentloaded" });
    await rejectPage.getByTestId("public-proposal-decision-result").waitFor();
    assert((await rejectPage.locator("body").innerText()).includes("já foi recusada"), "estado recusado não persistiu");
    await ownerPage.goto(`${baseURL}/propostas/${acceptProposal}`, { waitUntil: "domcontentloaded" });
    await ownerPage.getByTestId("proposal-decision-internal").waitFor();
    assert((await ownerPage.getByTestId("proposal-decision-internal").innerText()).includes("Comprovante interno"), "comprovante interno ausente");
    const direct = await admin.from("commercial_proposal_decisions").select("id,decision_type,proposal_id").in("proposal_id", proposalIds);
    assert(!direct.error && direct.data?.length === 2, `decisões persistidas incorretamente: ${direct.error?.message ?? direct.data?.length}`);
    const events = await admin.from("commercial_proposal_events").select("event_type").in("proposal_id", proposalIds).in("event_type", ["proposal_accepted", "proposal_rejected"]);
    assert(events.data?.length === 2, "eventos de decisão incompletos");
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const blocked = await anon.from("commercial_proposal_decisions").select("id");
    assert(Boolean(blocked.error), "anon conseguiu consultar tabela de decisões");
    await owner.close(); await publicContext.close();
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: true, accepted: true, rejected: true, idempotentDoubleClick: true, reload: true, internalReceipt: true, anonSelectBlocked: true }));
} catch (error) {
  console.error(JSON.stringify({ passed: false, message: error instanceof Error ? error.message : JSON.stringify(error) }));
  process.exitCode = 1;
} finally { await cleanup(); }
