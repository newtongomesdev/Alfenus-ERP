import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const prefix = `pricing-final-${Date.now()}`;
const email = `${prefix}@example.invalid`;
const password = `P!${crypto.randomBytes(16).toString("base64url")}9a`;
let tenantId; let userId; let scenarioId; let versionId;
const assert = (value, message) => { if (!value) throw new Error(message); };
try {
  tenantId = (await admin.from("law_firms").insert({ name: prefix, slug: prefix }).select("id").single()).data.id;
  userId = (await admin.auth.admin.createUser({ email, password, email_confirm: true })).data.user.id;
  await admin.from("law_firm_members").insert({ law_firm_id: tenantId, user_id: userId, role: "proprietario", name: "Pricing Owner", email, status: "ativo" });
  scenarioId = crypto.randomUUID(); versionId = crypto.randomUUID();
  await admin.from("pricing_scenarios").insert({ id: scenarioId, law_firm_id: tenantId, created_by: userId, name: `${prefix} service`, status: "draft", active_version_id: versionId });
  await admin.from("pricing_scenario_versions").insert({ id: versionId, law_firm_id: tenantId, pricing_scenario_id: scenarioId, created_by: userId, version_number: 7, scenario_type: "main", parameters: {}, calculation_result: {}, calculation_memory: { secret: true }, currency: "BRL", total_amount_cents: 123456, entry_amount_cents: 23456, financed_amount_cents: 100000, installment_count: 5, success_fee_percentage_bps: 1250, monthly_fee_cents: 6789, monthly_fee_count: 4 });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:3100/entrar");
    await page.getByLabel("E-mail corporativo").fill(email);
    await page.getByRole("textbox", { name: "Senha" }).fill(password);
    await page.getByRole("button", { name: "Entrar no Painel" }).click();
    await page.waitForTimeout(2500);
    await page.goto(`http://127.0.0.1:3100/simulador/${scenarioId}`);
    console.log(JSON.stringify({ beforePricingLink: page.url(), text: (await page.locator("body").innerText()).slice(0, 800) }));
    await page.getByRole("link", { name: "Criar proposta comercial" }).click();
    await page.waitForURL(/\/propostas\/nova\?scenarioId=/);
    const summary = page.locator('[aria-label="Resumo do simulador"]');
    await page.getByTestId("pricing-service").waitFor({ state: "visible", timeout: 60000 });
    const ids = ["pricing-service", "pricing-version", "pricing-total", "pricing-entry", "pricing-installments", "pricing-recurring", "pricing-success-fee"];
    const values = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await page.getByTestId(id).innerText()).trim()])));
    assert(values["pricing-version"].includes("7"), `versão esperada 7, real ${values["pricing-version"]}`);
    assert(values["pricing-total"].includes("1.234,56"), `total esperado 1.234,56, real ${values["pricing-total"]}`);
    assert(values["pricing-entry"].includes("234,56"), `entrada esperada 234,56, real ${values["pricing-entry"]}`);
    assert(values["pricing-installments"].includes("5x"), `parcelas esperadas 5x, real ${values["pricing-installments"]}`);
    const summaryText = await summary.innerText();
    const forbidden = summaryText.match(/\bNaN\b|\bundefined\b|\bnull\b|memória de cálculo|custo interno|margem|snapshot bruto/gi) ?? [];
    console.log(JSON.stringify({ url: page.url(), values, summaryText, forbidden }));
    assert(forbidden.length === 0, `dado interno ou valor inválido no resumo: ${forbidden.join(", ")}`);
  } finally { await browser.close(); }
} finally {
  if (versionId) await admin.from("pricing_scenario_versions").delete().eq("id", versionId);
  if (scenarioId) await admin.from("pricing_scenarios").delete().eq("id", scenarioId);
  if (tenantId) await admin.from("law_firm_members").delete().eq("law_firm_id", tenantId);
  if (tenantId) await admin.from("law_firms").delete().eq("id", tenantId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
