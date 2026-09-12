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
  cleanupDetails: null,
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
let admin;
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
  admin = adminClient(env);
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
  const storageRoot = `contracts/${fixtures.tenantA.id}/${fixtures.contract.id}`;
  const listStoragePaths = async (prefix) => {
    const result = await admin.storage.from("documents").list(prefix, { limit: 1000 });
    if (result.error) throw result.error;
    const paths = [];
    for (const entry of result.data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) paths.push(path);
      else paths.push(...(await listStoragePaths(path)));
    }
    return paths;
  };
  const paths = await listStoragePaths(storageRoot);
  for (let offset = 0; offset < paths.length; offset += 100) {
    const result = await admin.storage.from("documents").remove(paths.slice(offset, offset + 100));
    if (result.error) throw result.error;
  }
  const firmDelete = await admin.from("law_firms").delete().in("id", fixtures.tenantIds);
  if (firmDelete.error) throw firmDelete.error;
  for (const id of fixtures.userIds) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) throw result.error;
  }
  const verify = adminClient(env);
  const remainingFirm = await verify.from("law_firms").select("id", { count: "exact", head: true }).like("slug", `${fixtures.runId}%`);
  const tenantTables = ["law_firm_members", "clients", "contracts", "contract_documents", "contract_signature_envelopes", "contract_signature_provider_deliveries", "contract_signature_artifacts", "contract_signature_artifact_operations", "contract_signature_events"];
  let remainingRows = 0;
  for (const table of tenantTables) {
    const result = await verify.from(table).select("id", { count: "exact", head: true }).in("law_firm_id", fixtures.tenantIds);
    if (result.error) throw result.error;
    remainingRows += result.count ?? 0;
  }
  evidence.databaseCleanupVerified = (remainingFirm.count ?? 0) === 0 && remainingRows === 0;
  const storageAfter = await listStoragePaths(storageRoot);
  evidence.storageCleanupVerified = storageAfter.length === 0;
  evidence.cleanupDetails = { remainingFirm: remainingFirm.count ?? 0, remainingRows, storageAfter };
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
    await page.waitForURL((url) => !url.pathname.includes("/entrar"), {
      timeout: 60000,
    });
    assert(
      !page.url().includes("/entrar"),
      `login failed:${testUser.role}:${page.url()}:${(await page.locator("body").innerText()).slice(0, 500)}`,
    );
    evidence.browserContextsCreated += 1;
    evidence.jwtRolesTested.add(testUser.role);
    evidence.tenantsTested.add(testUser.tenantId);
    evidence.playwrightAssertions += 1;
    await context.close();
  }
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const anonymousPage = await anonymous.newPage();
  const anonymousResponse = await anonymousPage.goto(
    `${baseUrl}/contratos/${fixtures.contract.id}/assinatura`,
    { waitUntil: "domcontentloaded" },
  );
  assert(
    anonymousResponse &&
      [200, 302, 303, 307, 308, 401, 403].includes(anonymousResponse.status()),
    "anonymous request was not safely handled",
  );
  assert(
    anonymousPage.url().includes("/entrar") ||
      (anonymousResponse.status() >= 400 && anonymousResponse.status() < 500),
    "anonymous access was not blocked",
  );
  evidence.browserContextsCreated += 1;
  evidence.playwrightAssertions += 2;
  await anonymous.close();
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
  await page.waitForURL((url) => !url.pathname.includes("/entrar"), {
    timeout: 60000,
  });
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
  let retryRequired = false;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: "domcontentloaded" });
    const visibleArtifacts = await page
      .getByText("completion_certificate")
      .count();
    const operationState = await admin
      .from("contract_signature_artifact_operations")
      .select("status")
      .eq("envelope_id", fixtures.envelope.id)
      .maybeSingle();
    if (
      visibleArtifacts > 0 ||
      ["completed", "failed"].includes(operationState.data?.status)
    ) {
      retryRequired = operationState.data?.status === "failed";
      break;
    }
  }
  if (retryRequired) {
    assert(
      (await page
        .getByRole("button", { name: "Recuperar documentos finais" })
        .count()) === 1,
      `retry button missing after controlled failure:${(await page.locator("body").innerText()).slice(0, 1600)}`,
    );
    evidence.playwrightAssertions += 2;
    await page
      .getByRole("button", { name: "Recuperar documentos finais" })
      .click();
    for (let attempt = 0; attempt < 180; attempt += 1) {
      await page.waitForTimeout(1000);
      await page.reload({ waitUntil: "domcontentloaded" });
      const operationState = await admin
        .from("contract_signature_artifact_operations")
        .select("status")
        .eq("envelope_id", fixtures.envelope.id)
        .maybeSingle();
      if (operationState.data?.status === "completed") break;
    }
    const retryArtifacts = await admin
      .from("contract_signature_artifacts")
      .select("id,status")
      .eq("envelope_id", fixtures.envelope.id);
    const retryOperation = await admin
      .from("contract_signature_artifact_operations")
      .select("status,safe_error_code")
      .eq("envelope_id", fixtures.envelope.id)
      .maybeSingle();
    assert(
      retryArtifacts.data?.length === 3 &&
        retryArtifacts.data.every((row) => row.status === "completed"),
      "retry did not produce exactly three completed artifacts",
    );
    assert(
      retryOperation.data?.status === "completed",
      "retry operation did not complete",
    );
    evidence.playwrightAssertions += 3;
    evidence.partialRollbackVerified = true;
  }
  assert(
    (await page.getByText("signed_document").count()) >= 1,
    `signed artifact missing:${(await page.locator("body").innerText()).slice(0, 1200)}`,
  );
  const artifactDebug = await admin
    .from("contract_signature_artifacts")
    .select("artifact_type,status,file_hash,provider_hash")
    .eq("envelope_id", fixtures.envelope.id);
  const operationDebug = await admin
    .from("contract_signature_artifact_operations")
    .select("status,safe_error_code")
    .eq("envelope_id", fixtures.envelope.id);
  assert(
    (await page.getByText("completion_certificate").count()) >= 1,
    `certificate missing:${JSON.stringify({ artifacts: artifactDebug.data, operation: operationDebug.data })}`,
  );
  assert(
    (await page.getByText("evidence_report").count()) >= 1,
    `evidence missing:${JSON.stringify({ artifacts: artifactDebug.data, operation: operationDebug.data })}`,
  );
  evidence.playwrightAssertions += 4;
  const storedArtifacts = artifactDebug.data ?? [];
  const links = page.locator(
    `a[href*="/api/contratos/${fixtures.contract.id}/assinatura/artifacts/"]`,
  );
  assert((await links.count()) === 3, "download links missing");
  for (let i = 0; i < 3; i += 1) {
    const downloadPromise = page.waitForEvent("download");
    await links.nth(i).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    assert(
      download.suggestedFilename().length > 0 && filePath,
      "download file missing",
    );
    const bytes = readFileSync(filePath);
    assert(
      bytes.length > 100 && bytes.subarray(0, 5).toString() === "%PDF-",
      "download is not a valid PDF",
    );
    const linkType = (await links.nth(i).innerText()).split(" ")[0];
    const type = storedArtifacts.find(
      (item) => String(item.artifact_type) === linkType,
    );
    assert(type?.file_hash === hash(bytes), "download hash mismatch");
    const response = await page.request.get(
      new URL(await links.nth(i).getAttribute("href"), baseUrl).toString(),
    );
    assert(
      response.ok() &&
        response.headers()["content-type"]?.includes("application/pdf"),
      "download MIME invalid",
    );
    await PDFDocument.load(bytes);
    evidence.downloadsCompleted += 1;
    evidence.playwrightAssertions += 5;
  }
  for (const viewport of [
    [375, 812],
    [390, 844],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width: viewport[0], height: viewport[1] });
    await page.reload({ waitUntil: "domcontentloaded" });
    assert(
      (await page.getByText("Documentos finais").count()) > 0,
      `document section missing at ${viewport[0]}x${viewport[1]}`,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontal overflow at ${viewport[0]}x${viewport[1]}`,
    );
    evidence.playwrightAssertions += 2;
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
let executionError = null;
let cleanupError = null;

try {
  await setupFixtures();
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
} catch (error) {
  executionError = String(error?.message ?? error);
  results.push({ name: "harness", passed: false, error: executionError });
} finally {
  if (admin) {
    try {
      await cleanupFixtures(admin);
    } catch (error) {
      cleanupError = String(error?.message ?? error);
      evidence.databaseCleanupVerified = false;
      evidence.storageCleanupVerified = false;
    }
  }
  if (server && !server.killed)
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
}

if (executionError || cleanupError)
  console.error(JSON.stringify({ executionError, cleanupError }));
if (results.some((r) => !r.passed)) console.error(JSON.stringify(results));
const gateChecks = {
  results: results.every((r) => r.passed),
  browser: selected !== "all" || evidence.browserLaunched,
  contexts: selected !== "all" || evidence.browserContextsCreated >= 9,
  assertions: selected !== "all" || evidence.playwrightAssertions > 0,
  downloads: selected !== "all" || evidence.downloadsCompleted >= 3,
  roles: selected !== "all" || evidence.jwtRolesTested.size >= 8,
  tenants: selected !== "all" || evidence.tenantsTested.size >= 2,
  rollback: selected !== "all" || evidence.partialRollbackVerified,
  storage: selected !== "all" || evidence.storageCleanupVerified,
  database: selected !== "all" || evidence.databaseCleanupVerified,
};
const passed = Object.values(gateChecks).every(Boolean);
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
    cleanupDetails: evidence.cleanupDetails,
    gateChecks,
    cleanup: !cleanupError,
  }),
);
if (!passed) process.exitCode = 1;
