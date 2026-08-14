import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).trim()]; }));
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const prefix = `ui-proposal-${Date.now()}`;
const email = `${prefix}@example.invalid`;
const password = `P!${crypto.randomBytes(18).toString("base64url")}9a`;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
let userId; let tenantId; let proposalId;
const assert = (value, message) => { if (!value) throw new Error(message); };
async function main() {
  const tenant = await admin.from("law_firms").insert({ name: `${prefix} Office`, slug: prefix }).select("id").single();
  if (tenant.error) throw tenant.error; tenantId = tenant.data.id;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error; userId = created.data.user.id;
  const member = await admin.from("law_firm_members").insert({ user_id: userId, law_firm_id: tenantId, name: "UI Owner", email, role: "proprietario", status: "ativo" });
  if (member.error) throw member.error;
  const browserFactories = [
    ["chromium", () => chromium.launch({ headless: true })],
    ["msedge", () => chromium.launch({ headless: true, channel: "msedge" })],
    ["chrome", () => chromium.launch({ headless: true, channel: "chrome" })],
  ];
  let browser; let browserName; let lastError;
  for (const [name, factory] of browserFactories) { try { browser = await factory(); browserName = name; break; } catch (error) { lastError = error; console.error(`${name} launch stderr: ${error?.stack ?? error}`); } }
  if (!browser) throw new Error(`Nenhum navegador iniciou: ${lastError?.stack ?? lastError}`);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage(); const consoleErrors = []; const pageErrors = []; const actionResponses = [];
    page.on("response", async (response) => { if (response.request().method() === "POST" && response.url().includes("/propostas")) actionResponses.push({ status: response.status(), url: response.url(), body: (await response.text().catch(() => "")).slice(0, 1200) }); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); }); page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${baseURL}/entrar`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("E-mail corporativo").fill(email); await page.getByRole("textbox", { name: "Senha" }).fill(password); await page.getByRole("button", { name: "Entrar no Painel" }).click();
    await page.waitForTimeout(5000); assert(!page.url().includes("/entrar?erro"), `login exibiu erro: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 500)}`); assert(page.url().includes("dashboard") || page.url().includes("onboarding"), `redirect inesperado: ${page.url()}`);
    await page.goto(`${baseURL}/propostas`, { waitUntil: "domcontentloaded" }); assert(page.url().endsWith("/propostas"), "listagem não abriu");
    await page.goto(`${baseURL}/propostas/nova`, { waitUntil: "domcontentloaded", timeout: 60000 }); assert(page.url().endsWith("/propostas/nova"), "nova proposta não abriu"); await page.getByLabel("Título").fill(`${prefix} manual`); const createButton = page.getByRole("button", { name: "Criar proposta" }); const buttonMarkup = await createButton.evaluate((node) => node.outerHTML); await createButton.click(); await page.waitForTimeout(8000); const bodyAfterCreate = await page.locator("body").innerText(); assert(page.url().match(/\/propostas\/[^/]+\/editar/), `criação não redirecionou: ${page.url()} :: ${buttonMarkup} :: ${bodyAfterCreate.slice(-1200)}`); proposalId = page.url().match(/propostas\/([^/]+)\/editar/)?.[1]; assert(proposalId, "id da proposta não encontrado");
    await page.getByRole("button", { name: "Seção", exact: true }).click(); await page.getByRole("button", { name: "Item", exact: true }).click();
    const descriptions = page.getByPlaceholder("Descrição"); await descriptions.last().fill("Serviço jurídico principal"); const cents = page.getByPlaceholder("Valor em centavos"); await cents.fill("10000");
    const recipientName = page.getByPlaceholder("Nome"); await recipientName.fill("Cliente UI"); await page.getByPlaceholder("E-mail").fill("cliente-ui@example.invalid"); await page.getByRole("button", { name: "Adicionar destinatário" }).click();
    const saveButton = page.getByRole("button", { name: /Salvar nova versão/i }); assert(await saveButton.isEnabled(), `botão salvar desabilitado: ${await saveButton.evaluate((node) => node.outerHTML)}`); await saveButton.click(); await page.waitForTimeout(5000); assert((await page.locator("body").innerText()).includes("Nova versão salva"), `salvamento falhou: ${(await page.locator("body").innerText()).slice(-1800)} :: button=${await saveButton.evaluate((node) => node.outerHTML)} :: responses=${JSON.stringify(actionResponses)}`);
    assert((await page.locator("html").innerText()).includes("Prontidão da proposta"), "readiness não exibida");
    for (const width of [375, 390, 768]) { await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 }); await page.reload(); const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })); assert(dimensions.scrollWidth <= dimensions.innerWidth, `overflow em ${width}: ${JSON.stringify(dimensions)}`); }
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`); assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
    console.log(JSON.stringify({ passed: true, browser: browserName, proposalId, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, viewports: [375, 390, 768, 1440] }));
  } finally { await browser.close(); }
}
try { await main(); } catch (error) { console.error(JSON.stringify({ passed: false, message: error?.stack ?? String(error) })); process.exitCode = 1; } finally {
  if (proposalId) { await admin.from("commercial_proposal_recipients").delete().eq("proposal_id", proposalId); await admin.from("commercial_proposal_events").delete().eq("proposal_id", proposalId); await admin.from("commercial_proposal_versions").delete().eq("proposal_id", proposalId); await admin.from("commercial_proposals").delete().eq("id", proposalId); }
  if (tenantId) await admin.from("law_firms").delete().eq("id", tenantId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  const [users, tenants, proposals] = await Promise.all([admin.from("law_firm_members").select("id", { count: "exact", head: true }).like("email", `${prefix}%`), admin.from("law_firms").select("id", { count: "exact", head: true }).like("slug", `${prefix}%`), admin.from("commercial_proposals").select("id", { count: "exact", head: true }).like("title", `${prefix}%`)]);
  console.log(JSON.stringify({ cleanup: { users: users.count ?? 0, tenants: tenants.count ?? 0, proposals: proposals.count ?? 0 } }));
}
