import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { assertAllowedProposalsTestEnvironment, readProjectEnv } from "./proposals-test-environment.mjs";

const env = assertAllowedProposalsTestEnvironment(readProjectEnv());
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const prefix = `concurrency-${Date.now()}`;
const email = `${prefix}@example.invalid`;
const password = `P!${crypto.randomBytes(18).toString("base64url")}9a`;
const dbUrl = env.DATABASE_URL ?? process.env.ALFENUS_DATABASE_URL;
let userId, firmId, clientId, contractId;

const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const assert = (value, message) => { if (!value) throw new Error(message); };
const timeout = (promise, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), 15000))]);

async function cleanup() {
  if (!dbUrl) return;
  const c = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("set session_replication_role=replica");
    if (contractId) {
      await c.query("delete from contract_editor_events where contract_id=$1", [contractId]);
      await c.query("delete from contract_version_operations where contract_id=$1", [contractId]);
      await c.query("delete from contract_conversion_clauses where contract_id=$1", [contractId]);
      await c.query("delete from contract_conversion_versions where contract_id=$1", [contractId]);
      await c.query("delete from contracts where id=$1", [contractId]);
    }
    if (clientId) await c.query("delete from clients where id=$1", [clientId]);
    if (firmId) {
      await c.query("delete from law_firm_members where law_firm_id=$1", [firmId]);
      await c.query("delete from law_firms where id=$1", [firmId]);
    }
    if (userId) await c.query("delete from auth.users where id=$1", [userId]);
    const q = await c.query("select (select count(*) from auth.users where email=$1)::int users,(select count(*) from law_firms where slug=$2)::int tenants,(select count(*) from contracts where service_description like $3)::int contracts", [email, prefix, `${prefix}%`]);
    console.log(JSON.stringify({ cleanup: q.rows[0] }));
  } finally { await c.end(); }
}

async function state() {
  const row = await admin.from("contracts").select("contract_editor_updated_at").eq("id", contractId).single();
  if (row.error) throw row.error;
  return row.data.contract_editor_updated_at;
}

function rpcPayload(key, inputLabel, expected, title) {
  const clauses = [{ title: "Objeto", content: title, order: 0, type: "object", required: false, enabled: true }];
  const terms = { currency: "BRL", subtotalCents: 10000, discountCents: 0, totalCents: 10000, entryAmountCents: 0, installmentCount: 1, installmentAmountCents: 10000 };
  const contentHash = sha(JSON.stringify({ title, clauses, terms }));
  return { p_contract_id: contractId, p_expected_updated_at: expected, p_title: title, p_content: title, p_parties: { contractor: { name: "Escritório" }, client: { name: "Cliente" } }, p_clauses: clauses, p_terms: terms, p_metadata: { jurisdiction: "São Paulo" }, p_content_hash: contentHash, p_idempotency_key: key, p_input_hash: sha(JSON.stringify({ contractId, key, inputLabel, contentHash })), p_activate: false };
}

try {
  console.log(JSON.stringify({ stage: "fixture:start", prefix }));
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error) throw user.error;
  userId = user.data.user.id;
  const firm = await admin.from("law_firms").insert({ name: prefix, slug: prefix }).select("id").single();
  if (firm.error) throw firm.error;
  firmId = firm.data.id;
  const member = await admin.from("law_firm_members").insert({ user_id: userId, law_firm_id: firmId, name: "Owner", email, role: "proprietario", status: "ativo" });
  if (member.error) throw member.error;
  const client = await admin.from("clients").insert({ law_firm_id: firmId, name: `${prefix}-client`, person_type: "fisica" }).select("id").single();
  if (client.error) throw client.error;
  clientId = client.data.id;
  const contract = await admin.from("contracts").insert({ law_firm_id: firmId, client_id: clientId, service_description: prefix, total_amount_cents: 10000, upfront_amount_cents: 0, balance_cents: 10000, has_installments: false, installments_count: 1, status: "rascunho" }).select("id").single();
  if (contract.error) throw contract.error;
  contractId = contract.data.id;
  const version = await admin.from("contract_conversion_versions").insert({ law_firm_id: firmId, contract_id: contractId, version_number: 1, title: prefix, content: "initial", snapshot_json: {}, snapshot_hash: "a".repeat(64), created_by: userId, parties_json: { contractor: { name: "Escritório" }, client: { name: "Cliente" } }, commercial_terms_json: { currency: "BRL", totalCents: 10000 }, metadata_json: { jurisdiction: "São Paulo" }, is_active: true }).select("id").single();
  if (version.error) throw version.error;
  const updated = await admin.from("contracts").update({ active_contract_version_id: version.data.id }).eq("id", contractId);
  if (updated.error) throw updated.error;
  const clientAuth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const signed = await clientAuth.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const expected = await state();
  const key = `same-${prefix}`;
  console.log(JSON.stringify({ stage: "rpc:concurrent", expected }));
  const same = await Promise.all([timeout(clientAuth.rpc("create_contract_version", rpcPayload(key, "same", expected, "same")), "rpc-a"), timeout(clientAuth.rpc("create_contract_version", rpcPayload(key, "same", expected, "same")), "rpc-b")]);
  console.log(JSON.stringify({ stage: "rpc:concurrent:done", same }));
  assert(same.filter((item) => !item.error).length === 2, `same key concurrent expected=2 successes actual=${JSON.stringify(same)}`);
  const count1 = await admin.from("contract_conversion_versions").select("id", { count: "exact", head: true }).eq("contract_id", contractId);
  assert(count1.count === 2, `same key created ${count1.count} versions`);
  const conflict = await timeout(clientAuth.rpc("create_contract_version", rpcPayload(key, "different", same[0].data?.[0]?.updated_at ?? expected, "different")), "rpc-conflict");
  assert(Boolean(conflict.error), "same key different hash was accepted");
  const nextExpected = same[0].data[0].updated_at;
  const second = await timeout(clientAuth.rpc("create_contract_version", rpcPayload(`different-${prefix}`, "different-key", nextExpected, "different-key")), "rpc-sequential");
  assert(!second.error, `different key did not create sequential version: ${JSON.stringify(second)}`);
  const stale = await timeout(clientAuth.rpc("create_contract_version", rpcPayload(`stale-${prefix}`, "stale", expected, "stale")), "rpc-stale");
  assert(Boolean(stale.error), "stale expectedUpdatedAt overwrote version");
  console.log(JSON.stringify({ passed: true, sameKeyIdempotent: true, sameHashOneVersion: true, differentHashConflict: true, sequentialKeys: true, optimisticLock: true }));
} catch (error) { console.error(error); process.exitCode = 1; } finally { await cleanup(); }
