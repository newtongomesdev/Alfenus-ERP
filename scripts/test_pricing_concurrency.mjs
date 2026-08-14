import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const envText = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env (url/anon/service_role).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function abbrev(id) {
  if (!id) return '';
  return String(id).slice(0, 8);
}

function canonicalize(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.toLowerCase().trim();
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(canonicalize).filter((v) => v !== undefined);
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const c = canonicalize(value[key]);
      if (c !== undefined) out[key] = c;
    }
    return out;
  }
  return value;
}

function inputHash(params) {
  const json = JSON.stringify(canonicalize(params));
  return crypto.createHash('sha256').update(json).digest('hex');
}

function idempotencyKey({ action, tenantId, userId, scenarioId }) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${action}:${tenantId}:${userId}:${scenarioId}:${timestamp}:${random}`;
}

function barrier(n) {
  let count = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  return {
    async wait() {
      count += 1;
      if (count === n) release();
      await gate;
    },
  };
}

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  const { data } = await client.auth.getUser();
  if (!data?.user?.id) throw new Error(`Login did not return user for ${email}`);
  return { client, userId: data.user.id };
}

async function createScenario({ tenantId, testPrefix }) {
  const scenarioId = crypto.randomUUID();
  const { error } = await admin.from('pricing_scenarios').insert({
    id: scenarioId,
    law_firm_id: tenantId,
    created_by: '00000000-0000-0000-0000-000000000001',
    name: `${testPrefix} scenario`,
    status: 'draft',
  });
  if (error) throw new Error(`Create scenario failed: ${error.message}`);
  return scenarioId;
}

async function getTenantIdBySlug(slug) {
  const { data, error } = await admin.from('law_firms').select('id').eq('slug', slug).single();
  if (error) throw new Error(`Fetch tenant failed: ${error.message}`);
  return data.id;
}

async function getScenarioStats({ owner, scenarioId }) {
  const versions = await owner
    .from('pricing_scenario_versions_internal')
    .select('id, version_number')
    .eq('pricing_scenario_id', scenarioId)
    .order('version_number', { ascending: true });
  if (versions.error) throw new Error(`Fetch versions failed: ${versions.error.message}`);

  const events = await owner
    .from('pricing_scenario_events_secure')
    .select('id, event_type, version_id')
    .eq('pricing_scenario_id', scenarioId);
  if (events.error) throw new Error(`Fetch events failed: ${events.error.message}`);

  const items = await owner
    .from('pricing_scenario_items_secure')
    .select('id, scenario_version_id')
    .in(
      'scenario_version_id',
      versions.data.map((v) => v.id),
    );
  if (items.error) throw new Error(`Fetch items failed: ${items.error.message}`);

  return {
    versions: versions.data,
    events: events.data,
    items: items.data,
  };
}

async function getIdempotencyOps({ owner, scenarioId, idempotencyKeyValue }) {
  const query = owner
    .from('pricing_idempotency_operations')
    .select('id, status, idempotency_key, input_hash, result_version_id, safe_error_code, created_at, completed_at, expires_at')
    .eq('pricing_scenario_id', scenarioId);

  const { data, error } = idempotencyKeyValue
    ? await query.eq('idempotency_key', idempotencyKeyValue)
    : await query;
  if (error) throw new Error(`Fetch idempotency ops failed: ${error.message}`);
  return data;
}

async function rpcCreateVersion(owner, payload) {
  const { data, error } = await owner.rpc('create_pricing_scenario_version_idempotent', payload);
  return { data, error };
}

async function cleanupScenario(scenarioId) {
  await admin.from('pricing_scenarios').delete().eq('id', scenarioId);
}

async function main() {
  const testPrefix = `__conc_${Date.now()}`;
  const { client: ownerClient, userId: ownerUserId } = await signIn(
    'owner-a@test-pricing.example.com',
    'TestPricing2024!A',
  );
  const tenantId = await getTenantIdBySlug('tenant-a-pricing-test');

  const owner = ownerClient;
  const scenarioAId = await createScenario({ tenantId, testPrefix });

  const baseParamsA = { feeType: 'fixed', feeValueCents: 1000, currency: 'BRL', scenarioType: 'main', engineVersion: '1.0.0', schemaVersion: '1' };
  const baseHashA = inputHash(baseParamsA);
  const keyA = idempotencyKey({ action: 'create_version', tenantId, userId: ownerUserId, scenarioId: scenarioAId });

  const barrierA = barrier(2);
  const reqA = async (label) => {
    await barrierA.wait();
    const res = await rpcCreateVersion(owner, {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_items: [
        {
          item_type: 'fee',
          description: `${testPrefix} A`,
          quantity: 1,
          unit_amount_cents: 1000,
          total_amount_cents: 1000,
          order_index: 0,
          metadata: { source: 'concurrency-A' },
        },
      ],
      p_idempotency_key: keyA,
      p_input_hash: baseHashA,
      p_activate: false,
    });
    return { label, ...res };
  };

  const [a1, a2] = await Promise.all([reqA('A1'), reqA('A2')]);

  const statsA = await getScenarioStats({ owner, scenarioId: scenarioAId });
  const opsA = await getIdempotencyOps({ owner, scenarioId: scenarioAId, idempotencyKeyValue: keyA });

  const aVersionIds = [a1.data?.version_id, a2.data?.version_id].filter(Boolean);
  const aSameVersion = aVersionIds.length === 2 && aVersionIds[0] === aVersionIds[1];

  const aProcessingOps = opsA.filter((op) => op.status === 'processing');
  const versionCreatedEventsA = statsA.events.filter((e) => e.event_type === 'version_created');

  console.log('=== CONCURRENCY A — Same key + same hash (simultaneous) ===');
  console.log(`scenario: ${abbrev(scenarioAId)}…`);
  console.log(`idempotency_key: ${keyA.slice(0, 6)}…${keyA.slice(-6)}`);
  console.log(
    `responses: A1(ok=${a1.data?.ok ?? false}, idempotent=${a1.data?.idempotent ?? null}, version=${abbrev(a1.data?.version_id)}…), ` +
      `A2(ok=${a2.data?.ok ?? false}, idempotent=${a2.data?.idempotent ?? null}, version=${abbrev(a2.data?.version_id)}…)`,
  );
  if (a1.error || a2.error) {
    console.log(`rpc_errors: A1=${a1.error?.message ?? '—'} | A2=${a2.error?.message ?? '—'}`);
  }
  console.log(`db_versions_count: ${statsA.versions.length}`);
  console.log(`db_version_ids: ${statsA.versions.map((v) => `${v.version_number}:${abbrev(v.id)}…`).join(', ')}`);
  console.log(`db_items_count: ${statsA.items.length}`);
  console.log(`db_events_total: ${statsA.events.length}, version_created: ${versionCreatedEventsA.length}`);
  console.log(`idempotency_ops: ${opsA.map((op) => `${abbrev(op.id)}:${op.status}:${abbrev(op.result_version_id)}…`).join(', ')}`);
  console.log(`checks: same_version_in_responses=${aSameVersion}, ops_processing=${aProcessingOps.length}, 23505_exposed=${Boolean((a1.error?.message || a2.error?.message || '').includes('23505'))}`);

  const conflictHash = inputHash({ ...baseParamsA, feeValueCents: 2000 });
  const b = await rpcCreateVersion(owner, {
    p_scenario_id: scenarioAId,
    p_parameters: { feeType: 'fixed' },
    p_calculation_result: { totalAmountCents: 2000 },
    p_calculation_memory: { sections: [] },
    p_items: [
      {
        item_type: 'fee',
        description: `${testPrefix} B`,
        quantity: 1,
        unit_amount_cents: 2000,
        total_amount_cents: 2000,
        order_index: 0,
        metadata: { source: 'concurrency-B' },
      },
    ],
    p_idempotency_key: keyA,
    p_input_hash: conflictHash,
    p_activate: false,
  });

  const statsB = await getScenarioStats({ owner, scenarioId: scenarioAId });
  const opsB = await getIdempotencyOps({ owner, scenarioId: scenarioAId, idempotencyKeyValue: keyA });

  console.log('\n=== CONCURRENCY B — Same key + different hashes ===');
  console.log(`scenario: ${abbrev(scenarioAId)}…`);
  console.log(`response: ok=${b.data?.ok ?? false}, error=${b.data?.error ?? (b.error?.message ?? '—')}`);
  console.log(`db_versions_count: ${statsB.versions.length}`);
  console.log(`idempotency_ops: ${opsB.map((op) => `${abbrev(op.id)}:${op.status}:${abbrev(op.result_version_id)}…`).join(', ')}`);

  const scenarioCId = await createScenario({ tenantId, testPrefix });
  const keyC1 = idempotencyKey({ action: 'create_version', tenantId, userId: ownerUserId, scenarioId: scenarioCId });
  const keyC2 = idempotencyKey({ action: 'create_version', tenantId, userId: ownerUserId, scenarioId: scenarioCId });
  const hashC1 = inputHash({ feeType: 'fixed', feeValueCents: 1111, currency: 'BRL', scenarioType: 'main', engineVersion: '1.0.0', schemaVersion: '1' });
  const hashC2 = inputHash({ feeType: 'fixed', feeValueCents: 2222, currency: 'BRL', scenarioType: 'main', engineVersion: '1.0.0', schemaVersion: '1' });

  const barrierC = barrier(2);
  const reqC = async (label, key, hash, cents) => {
    await barrierC.wait();
    const res = await rpcCreateVersion(owner, {
      p_scenario_id: scenarioCId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: cents },
      p_calculation_memory: { sections: [] },
      p_items: [
        {
          item_type: 'fee',
          description: `${testPrefix} ${label}`,
          quantity: 1,
          unit_amount_cents: cents,
          total_amount_cents: cents,
          order_index: 0,
          metadata: { source: `concurrency-${label}` },
        },
      ],
      p_idempotency_key: key,
      p_input_hash: hash,
      p_activate: false,
    });
    return { label, ...res };
  };

  const [c1, c2] = await Promise.all([
    reqC('C1', keyC1, hashC1, 1111),
    reqC('C2', keyC2, hashC2, 2222),
  ]);

  const statsC = await getScenarioStats({ owner, scenarioId: scenarioCId });
  const opsC = await getIdempotencyOps({ owner, scenarioId: scenarioCId });
  const cProcessingOps = opsC.filter((op) => op.status === 'processing');

  console.log('\n=== CONCURRENCY C — Different keys + different inputs (simultaneous) ===');
  console.log(`scenario: ${abbrev(scenarioCId)}…`);
  console.log(
    `responses: C1(ok=${c1.data?.ok ?? false}, version=${abbrev(c1.data?.version_id)}…), ` +
      `C2(ok=${c2.data?.ok ?? false}, version=${abbrev(c2.data?.version_id)}…)`,
  );
  if (c1.error || c2.error) {
    console.log(`rpc_errors: C1=${c1.error?.message ?? '—'} | C2=${c2.error?.message ?? '—'}`);
  }
  console.log(`db_versions_count: ${statsC.versions.length}`);
  console.log(`db_version_ids: ${statsC.versions.map((v) => `${v.version_number}:${abbrev(v.id)}…`).join(', ')}`);
  console.log(`db_items_count: ${statsC.items.length}`);
  console.log(`db_events_total: ${statsC.events.length}`);
  console.log(`ops_processing: ${cProcessingOps.length}`);

  await cleanupScenario(scenarioAId);
  await cleanupScenario(scenarioCId);
}

main().catch((e) => {
  console.error(e?.message ?? String(e));
  process.exit(1);
});
