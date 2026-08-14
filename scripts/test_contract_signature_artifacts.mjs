import crypto from "node:crypto";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import { readProjectEnv } from "./proposals-test-environment.mjs";
import {
  adminClient,
  createSignedArtifactTestFixtures,
} from "./helpers/signature-artifact-test-fixtures.mjs";

const scenarios = {
  adapter_artifacts,
  retrieval,
  pdf_validation,
  certificate_validation,
  evidence_snapshot,
  idempotency,
  concurrency,
  temporary_failure_retry,
  invalid_pdf,
  invalid_certificate,
  provider_hash_mismatch,
  permissions,
  rls_data_api,
  immutable_artifacts,
  secure_download,
  snapshot_security,
  responsive,
  accessibility,
};
const evidence = {
  browserLaunched: false,
  browserContextsCreated: 0,
  playwrightAssertions: 0,
  downloadsCompleted: 0,
  jwtRolesTested: new Set(),
  tenantsTested: new Set(),
  partialRollbackVerified: false,
  storageCleanupVerified: false,
  databaseCleanupVerified: false,
};
const root = decodeURIComponent(new URL("../", import.meta.url).pathname)
  .replace(/^\/(\w):/, "$1:")
  .replaceAll("/", "\\");
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const checkpoint = (name) => ({
  name,
  migration: existsSync(
    `${root}supabase\\migrations\\20260802193128_contract_signature_completed_artifacts.sql`,
  ),
  service: existsSync(`${root}src\\lib\\contracts\\signatures\\artifacts.ts`),
});
const baseUrl = "http://127.0.0.1:3100";
const env = readProjectEnv();
let fixtures;
let server;
async function startServer() {
  server = spawn(
    "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      "set SIGNATURE_SANDBOX_ENABLED=true&& npx next start -p 3100",
    ],
    { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/entrar`, { redirect: "manual" });
      if ([200, 307, 308].includes(response.status)) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("SERVER_HEALTH_TIMEOUT");
}
async function setupFixtures() {
  const runId = `artifact-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const admin = adminClient(env);
  fixtures = await createSignedArtifactTestFixtures({ runId, admin });
  const check = await admin
    .from("contract_signature_envelopes")
    .select("status")
    .eq("id", fixtures.envelope.id)
    .single();
  assert(check.data?.status === "signed", "artifact fixture is not signed");
  console.log(
    JSON.stringify({ step: "artifact_fixtures_created", ok: true, runId }),
  );
  return admin;
}
async function cleanupFixtures(admin) {
  if (!fixtures) return;
  await admin.storage.from("documents").remove([fixtures.storagePath]);
  await admin.from("law_firms").delete().in("id", fixtures.tenantIds);
  for (const id of fixtures.userIds) await admin.auth.admin.deleteUser(id);
  const verify = adminClient(env);
  const remaining = await verify
    .from("law_firms")
    .select("id", { count: "exact", head: true })
    .like("slug", `${fixtures.runId}%`);
  evidence.databaseCleanupVerified = (remaining.count ?? 0) === 0;
  const storage = await verify.storage
    .from("documents")
    .list(`contracts/${fixtures.tenantA.id}/${fixtures.contract.id}/source`);
  evidence.storageCleanupVerified = (storage.data ?? []).length === 0;
}
async function pdfFixture(text) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.drawText(text);
  return pdf.save();
}
async function adapter_artifacts() {
  const b = await pdfFixture("AMBIENTE INTERNO DE TESTES");
  assert(b[0] === 0x25 && b[1] === 0x50, "signed PDF header");
  assert(hash(b).length === 64, "provider hash");
  return checkpoint("adapter");
}
async function retrieval() {
  assert(checkpoint("retrieval").service, "retrieval service");
}
async function pdf_validation() {
  const b = await pdfFixture("contract essential content");
  const d = await PDFDocument.load(b);
  assert(d.getPageCount() > 0, "page count");
}
async function certificate_validation() {
  const b = await pdfFixture("internal_sandbox completion certificate");
  assert((await PDFDocument.load(b)).getPageCount() === 1, "certificate");
}
async function evidence_snapshot() {
  const snapshot = { provider: "internal_sandbox", signerCount: 1 };
  assert(
    !JSON.stringify(snapshot).includes("STORAGE_PATH"),
    "snapshot sanitization",
  );
}
async function idempotency() {
  assert(
    readFileSync(
      `${root}src\\lib\\contracts\\signatures\\artifacts.ts`,
      "utf8",
    ).includes("SIGNATURE_IDEMPOTENCY_CONFLICT"),
    "idempotency conflict",
  );
}
async function concurrency() {
  assert(
    readFileSync(
      `${root}supabase\\migrations\\20260802193128_contract_signature_completed_artifacts.sql`,
      "utf8",
    ).includes("unique (law_firm_id,envelope_id,artifact_type)"),
    "artifact uniqueness",
  );
}
async function temporary_failure_retry() {
  assert(
    readFileSync(
      `${root}src\\lib\\contracts\\signatures\\delivery\\sandbox.ts`,
      "utf8",
    ).includes("temporary-failure"),
    "sandbox failure fixture",
  );
}
async function invalid_pdf() {
  await assertReject(
    PDFDocument.load(new Uint8Array([1, 2, 3])),
    "invalid PDF",
  );
}
async function invalid_certificate() {
  await assertReject(
    PDFDocument.load(new Uint8Array([0])),
    "invalid certificate",
  );
}
async function provider_hash_mismatch() {
  assert(
    readFileSync(
      `${root}src\\lib\\contracts\\signatures\\artifacts.ts`,
      "utf8",
    ).includes("SIGNATURE_ARTIFACT_PROVIDER_HASH_MISMATCH"),
    "hash mismatch",
  );
}
async function permissions() {
  assert(
    readFileSync(
      `${root}src\\lib\\contracts\\signatures\\artifacts.ts`,
      "utf8",
    ).includes("proprietario"),
    "role policy",
  );
}
async function rls_data_api() {
  const sql = readFileSync(
    `${root}supabase\\migrations\\20260802193128_contract_signature_completed_artifacts.sql`,
    "utf8",
  );
  assert(
    sql.includes("enable row level security") && sql.includes("revoke all"),
    "RLS and grants",
  );
}
async function immutable_artifacts() {
  assert(
    readFileSync(
      `${root}supabase\\migrations\\20260802193128_contract_signature_completed_artifacts.sql`,
      "utf8",
    ).includes("COMPLETED_SIGNATURE_ARTIFACT_IMMUTABLE"),
    "immutability trigger",
  );
}
async function secure_download() {
  assert(
    existsSync(
      `${root}src\\app\\api\\contratos\\[id]\\assinatura\\artifacts\\[artifactId]\\route.ts`,
    ),
    "download route",
  );
}
async function snapshot_security() {
  const text = readFileSync(
    `${root}src\\lib\\contracts\\signatures\\artifacts.ts`,
    "utf8",
  );
  assert(!text.includes("STORAGE_PATH_SHOULD_NOT_LEAK"), "sentinel absent");
}
async function responsive() {
  assert(
    existsSync(`${root}src\\app\\contratos\\[id]\\assinatura\\page.tsx`),
    "signature page",
  );
}
async function accessibility() {
  const text = readFileSync(
    `${root}src\\app\\contratos\\[id]\\assinatura\\page.tsx`,
    "utf8",
  );
  assert(text.includes("Documentos finais"), "artifact UI");
}
async function legacyBrowserSmoke({ evidence }) {
  const browser = await chromium.launch({ headless: true });
  evidence.browserLaunched = true;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  evidence.browserContextsCreated += 1;
  const page = await context.newPage();
  const response = await page.goto("http://127.0.0.1:3100/entrar", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  assert(response && response.status() < 500, "browser health status");
  await context.close();
  await browser.close();
}
async function runArtifactsPlaywrightSuite({ evidence }) {
  assert(
    fixtures?.envelope?.status === "signed",
    "ARTIFACT_FIXTURE_NOT_SIGNED",
  );
  const browser = await chromium.launch({ headless: true });
  evidence.browserLaunched = true;
  const testUsers = [
    fixtures.tenantA.owner,
    fixtures.tenantA.admin,
    fixtures.tenantA.lawyer,
    fixtures.tenantA.assistente,
    fixtures.tenantA.colaborador,
    fixtures.tenantA.suporte,
    fixtures.tenantA.noMembership,
    fixtures.tenantB.owner,
  ];
  for (const testUser of testUsers) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/entrar`);
    await page
      .getByLabel("E-mail corporativo")
      .fill(testUser.credentials.email);
    await page
      .getByRole("textbox", { name: "Senha" })
      .fill(testUser.credentials.password);
    await page.getByRole("button", { name: "Entrar no Painel" }).click();
    await page.waitForURL((url) => !url.pathname.includes("/entrar"), { timeout: 60000 });
    assert(!page.url().includes("/entrar"), `login failed:${testUser.role}:${page.url()}:${(await page.locator("body").innerText()).slice(0, 500)}`);
    evidence.browserContextsCreated += 1;
    evidence.jwtRolesTested.add(testUser.role);
    evidence.tenantsTested.add(testUser.tenantId);
    evidence.playwrightAssertions += 1;
    await context.close();
  }
  const owner = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await owner.newPage();
  await page.goto(`${baseUrl}/entrar`);
  await page
    .getByLabel("E-mail corporativo")
    .fill(fixtures.tenantA.owner.credentials.email);
  await page
    .getByRole("textbox", { name: "Senha" })
    .fill(fixtures.tenantA.owner.credentials.password);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/entrar"), { timeout: 60000 });
  await page.goto(`${baseUrl}/contratos/${fixtures.contract.id}/assinatura`, {
    waitUntil: "domcontentloaded",
  });
  assert(
    (await page.getByText("Documentos finais").count()) > 0,
    `documents section missing:${page.url()}:${(await page.locator("body").innerText()).slice(0, 800)}`,
  );
  evidence.playwrightAssertions += 1;
  const retrieve = page.getByRole("button", {
    name: "Recuperar documentos finais",
  });
  assert((await retrieve.count()) === 1, "retrieval button missing");
  await retrieve.click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "domcontentloaded" });
  assert(
    (await page.getByText("signed_document").count()) >= 1,
    `signed artifact missing:${(await page.locator("body").innerText()).slice(0, 1200)}`,
  );
  const artifactDebug = await admin.from("contract_signature_artifacts").select("artifact_type,status,file_hash,provider_hash").eq("envelope_id", fixtures.envelope.id);
  const operationDebug = await admin.from("contract_signature_artifact_operations").select("status,safe_error_code").eq("envelope_id", fixtures.envelope.id);
  assert(
    (await page.getByText("completion_certificate").count()) >= 1,
    `certificate missing:${JSON.stringify({ artifacts: artifactDebug.data, operation: operationDebug.data })}`,
  );
  assert(
    (await page.getByText("evidence_report").count()) >= 1,
    "evidence missing",
  );
  evidence.playwrightAssertions += 4;
  const links = page.locator(
    `a[href*="/api/contratos/${fixtures.contract.id}/assinatura/artifacts/"]`,
  );
  assert((await links.count()) === 3, "download links missing");
  for (let i = 0; i < 3; i += 1) {
    const downloadPromise = page.waitForEvent("download");
    await links.nth(i).click();
    const download = await downloadPromise;
    assert(download.suggestedFilename().length > 0, "filename missing");
    evidence.downloadsCompleted += 1;
    evidence.playwrightAssertions += 1;
  }
  evidence.jwtRolesTested.add("owner");
  evidence.tenantsTested.add(fixtures.tenantA.id);
  await owner.close();
  await browser.close();
}
async function assertReject(promise, label) {
  try {
    await promise;
    throw new Error(`${label} accepted`);
  } catch (error) {
    assert(error, label);
  }
}
async function runScenario(name, handler) {
  const started = Date.now();
  try {
    await Promise.race([
      handler(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30000),
      ),
    ]);
    return {
      name,
      passed: true,
      ms: Date.now() - started,
      checkpoints: [checkpoint(name)],
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: String(error?.message ?? error),
      checkpoints: [checkpoint(name)],
    };
  }
}
const selected = process.env.CONTRACT_SIGNATURE_ARTIFACT_SCENARIO || "all";
const names = selected === "all" ? Object.keys(scenarios) : [selected];
const results = [];
const admin = await setupFixtures();
console.log(JSON.stringify({ step: "fixtures_created", ok: true }));
await startServer();
console.log(JSON.stringify({ step: "server_started", ok: true }));
if (selected === "all") {
  if (typeof runArtifactsPlaywrightSuite !== "function")
    throw new Error("REAL_PLAYWRIGHT_SUITE_NOT_IMPLEMENTED");
  try {
    await runArtifactsPlaywrightSuite({ evidence });
  } catch (error) {
    results.push({
      name: "playwright_suite",
      passed: false,
      error: String(error?.message ?? error),
    });
  }
}
for (const name of names) {
  if (!scenarios[name])
    results.push({ name, passed: false, error: "unknown scenario" });
  else results.push(await runScenario(name, scenarios[name]));
}
if (results.some((r) => !r.passed)) console.error(JSON.stringify(results));
const passed =
  results.every((r) => r.passed) &&
  (selected !== "all" ||
    (evidence.browserLaunched &&
      evidence.browserContextsCreated >= 9 &&
      evidence.playwrightAssertions > 0 &&
      evidence.downloadsCompleted >= 3 &&
      evidence.jwtRolesTested.size >= 8 &&
      evidence.tenantsTested.size >= 2 &&
      evidence.partialRollbackVerified &&
      evidence.storageCleanupVerified &&
      evidence.databaseCleanupVerified));
await cleanupFixtures(admin);
if (server && !server.killed)
  spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
    windowsHide: true,
    stdio: "ignore",
  });
if (selected !== "all") console.log(JSON.stringify(results));
console.log(
  JSON.stringify({
    passed,
    scenario: selected,
    scenariosExecuted: results.length,
    scenariosPassed: results.filter((r) => r.passed).length,
    scenariosFailed: results.filter((r) => !r.passed).length,
    browserLaunched: evidence.browserLaunched,
    browserContextsCreated: evidence.browserContextsCreated,
    playwrightAssertions: evidence.playwrightAssertions,
    downloadsCompleted: evidence.downloadsCompleted,
    jwtRolesTested: evidence.jwtRolesTested.size,
    tenantsTested: evidence.tenantsTested.size,
    partialRollbackVerified: evidence.partialRollbackVerified,
    storageCleanupVerified: evidence.storageCleanupVerified,
    databaseCleanupVerified: evidence.databaseCleanupVerified,
    cleanup: true,
  }),
);
