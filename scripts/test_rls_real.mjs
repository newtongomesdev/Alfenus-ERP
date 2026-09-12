import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envText = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client (service_role) for setup
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let passed = 0, failed = 0;
const results = [];

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.passed) {
      results.push({ name: `✓ ${name}`, status: 'PASS' });
      passed++;
    } else {
      results.push({ name: `✗ ${name}`, status: 'FAIL', detail: result.detail });
      failed++;
    }
  } catch (err) {
    results.push({ name: `✗ ${name}`, status: 'ERROR', detail: err.message });
    failed++;
  }
}

async function main() {
  // Login all users
  const ownerA = await signIn('owner-a@test-pricing.example.com', 'TestPricing2024!A');
  const lawyerA = await signIn('lawyer-a@test-pricing.example.com', 'TestPricing2024!A');
  const assistantA = await signIn('assistant-a@test-pricing.example.com', 'TestPricing2024!A');
  const ownerB = await signIn('owner-b@test-pricing.example.com', 'TestPricing2024!B');
  const noneUser = await signIn('none@test-pricing.example.com', 'TestPricing2024!N');

  // Create test data using admin client (bypass RLS)
  const { data: tenantAData } = await adminClient.from('law_firms').select('id').eq('slug', 'tenant-a-pricing-test').single();
  const { data: tenantBData } = await adminClient.from('law_firms').select('id').eq('slug', 'tenant-b-pricing-test').single();
  const tenantAId = tenantAData.id;
  const tenantBId = tenantBData.id;

  console.log('Tenant A:', tenantAId);
  console.log('Tenant B:', tenantBId);

  // Create scenarios
  const scenarioAId = crypto.randomUUID();
  const scenarioBId = crypto.randomUUID();
  let ownerCreatedVersionId = null;

  await adminClient.from('pricing_scenarios').insert({
    id: scenarioAId,
    law_firm_id: tenantAId,
    created_by: '00000000-0000-0000-0000-000000000001',
    name: 'Test Scenario A',
    status: 'draft'
  });

  await adminClient.from('pricing_scenarios').insert({
    id: scenarioBId,
    law_firm_id: tenantBId,
    created_by: '00000000-0000-0000-0000-000000000001',
    name: 'Test Scenario B',
    status: 'draft'
  });

  // ========== PRICING_SCENARIOS RLS ==========
  await test('Owner A reads own tenant scenario', async () => {
    const { data, error } = await ownerA.from('pricing_scenarios').select('id, law_firm_id').eq('id', scenarioAId);
    if (error) return { passed: false, detail: error.message };
    if (data && data.length > 0) return { passed: true };
    return { passed: false, detail: 'No data returned' };
  });

  await test('Owner A cannot read Tenant B scenario', async () => {
    const { data, error } = await ownerA.from('pricing_scenarios').select('id').eq('id', scenarioBId);
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Tenant access leak' };
    return { passed: true };
  });

  await test('Owner B can read own tenant scenario', async () => {
    const { data, error } = await ownerB.from('pricing_scenarios').select('id').eq('id', scenarioBId);
    if (error) return { passed: false, detail: error.message };
    if (data && data.length > 0) return { passed: true };
    return { passed: false, detail: 'No data returned' };
  });

  await test('Owner B cannot read Tenant A scenario', async () => {
    const { data, error } = await ownerB.from('pricing_scenarios').select('id').eq('id', scenarioAId);
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Tenant leak' };
    return { passed: true };
  });

  await test('None user gets empty scenarios', async () => {
    const { data, error } = await noneUser.from('pricing_scenarios').select('*');
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Anonymous got data' };
    return { passed: true };
  });

  await test('Delete is blocked for all users', async () => {
    const { error } = await ownerA.from('pricing_scenarios').delete().eq('id', scenarioAId);
    if (error) return { passed: true };

    const { data: stillThere, error: verifyError } = await adminClient
      .from('pricing_scenarios')
      .select('id')
      .eq('id', scenarioAId)
      .maybeSingle();

    if (verifyError) return { passed: false, detail: verifyError.message };
    if (stillThere) return { passed: true };
    return { passed: false, detail: 'Delete succeeded unexpectedly' };
  });

  await test('Owner A cannot insert scenario in Tenant B', async () => {
    const { data, error } = await ownerA.from('pricing_scenarios').insert({
      law_firm_id: tenantBId,
      created_by: '00000000-0000-0000-0000-000000000001',
      name: 'Should Fail',
      status: 'draft'
    });
    if (error) return { passed: true };
    return { passed: false, detail: 'Insert in wrong tenant succeeded' };
  });

  await test('None user cannot insert scenario', async () => {
    const { data, error } = await noneUser.from('pricing_scenarios').insert({
      law_firm_id: tenantAId,
      created_by: '00000000-0000-0000-0000-000000000001',
      name: 'Should Fail',
      status: 'draft'
    });
    if (error) return { passed: true };
    return { passed: false, detail: 'Anonymous insert succeeded' };
  });

  // ========== PRICING_SCENARIO_VERSIONS RLS ==========
  // Create a version via admin (uses RPC but admin bypasses RLS)
  const versionId = crypto.randomUUID();
  await adminClient.from('pricing_scenario_versions').insert({
    id: versionId,
    law_firm_id: tenantAId,
    pricing_scenario_id: scenarioAId,
    created_by: '00000000-0000-0000-0000-000000000001',
    version_number: 1,
    scenario_type: 'main',
    parameters: {},
    calculation_result: {},
    calculation_memory: {},
    currency: 'BRL',
  });

  await test('Owner A can read own versions', async () => {
    const { data, error } = await ownerA.from('pricing_scenario_versions_secure').select('*').eq('pricing_scenario_id', scenarioAId);
    if (error) return { passed: false, detail: error.message };
    if (data && data.length > 0) return { passed: true };
    return { passed: false, detail: 'No data returned' };
  });

  await test('Owner B cannot read Tenant A versions', async () => {
    const { data, error } = await ownerB.from('pricing_scenario_versions_secure').select('*').eq('pricing_scenario_id', scenarioAId);
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Tenant leak' };
    return { passed: true };
  });

  // ========== PRICING_SCENARIO_ITEMS RLS ==========
  await test('Owner A can read own items', async () => {
    const { data, error } = await ownerA.from('pricing_scenario_items_secure').select('*');
    if (error) return { passed: false, detail: error.message };
    return { passed: true };
  });

  await test('Owner B cannot read Tenant A items', async () => {
    const { data, error } = await ownerB.from('pricing_scenario_items_secure').select('*');
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Tenant leak' };
    return { passed: true };
  });

  // ========== PRICING_SCENARIO_EVENTS RLS ==========
  await test('Owner A can read own events', async () => {
    const { data, error } = await ownerA.from('pricing_scenario_events_secure').select('*');
    if (error) return { passed: false, detail: error.message };
    return { passed: true };
  });

  await test('Owner B cannot read Tenant A events', async () => {
    const { data, error } = await ownerB.from('pricing_scenario_events_secure').select('*');
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Tenant leak' };
    return { passed: true };
  });

  // ========== PRICING_IDEMPOTENCY RLS ==========
  await test('Owner A can read idempotency operations', async () => {
    const { data, error } = await ownerA.from('pricing_idempotency_operations').select('*');
    if (error) return { passed: false, detail: error.message };
    return { passed: true };
  });

  await test('Owner B cannot read Tenant A idempotency operations', async () => {
    const { data, error } = await ownerB.from('pricing_idempotency_operations').select('*');
    if (error) return { passed: true };
    if (data && data.length > 0) return { passed: false, detail: 'Idempotency leak' };
    return { passed: true };
  });

  // ========== PERMISSIONS ==========
  await test('Owner A can create version via RPC', async () => {
    const { data, error } = await ownerA.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_items: [{
        item_type: 'fee',
        description: 'Servico de teste',
        quantity: 1,
        unit_amount_cents: 1000,
        total_amount_cents: 1000,
        order_index: 0,
        metadata: { source: 'rls-test' }
      }],
      p_idempotency_key: 'test-perm-owner',
      p_input_hash: 'test-hash-perm-owner'
    });
    if (error) return { passed: false, detail: error.message };
    if (data && data.ok) {
      ownerCreatedVersionId = data.version_id;
      return { passed: true };
    }
    return { passed: false, detail: JSON.stringify(data) };
  });

  await test('RPC creates persisted pricing_scenario_items rows', async () => {
    if (!ownerCreatedVersionId) return { passed: false, detail: 'Owner version was not created' };

    const { data, error } = await ownerA
      .from('pricing_scenario_items_secure')
      .select('law_firm_id, scenario_version_id, item_type, description, quantity, unit_amount_cents, total_amount_cents, order_index, metadata')
      .eq('scenario_version_id', ownerCreatedVersionId);

    if (error) return { passed: false, detail: error.message };
    if (!data || data.length !== 1) return { passed: false, detail: `Expected 1 item, got ${data?.length ?? 0}` };

    const item = data[0];
    if (item.law_firm_id !== tenantAId) return { passed: false, detail: 'Wrong law_firm_id' };
    if (item.scenario_version_id !== ownerCreatedVersionId) return { passed: false, detail: 'Wrong scenario_version_id' };
    if (item.item_type !== 'fee') return { passed: false, detail: 'Wrong item_type' };
    if (item.description !== 'Servico de teste') return { passed: false, detail: 'Wrong description' };
    if (Number(item.quantity) !== 1) return { passed: false, detail: 'Wrong quantity' };
    if (item.unit_amount_cents !== 1000) return { passed: false, detail: 'Wrong unit amount' };
    if (item.total_amount_cents !== 1000) return { passed: false, detail: 'Wrong total amount' };
    if (item.order_index !== 0) return { passed: false, detail: 'Wrong order_index' };
    return { passed: true };
  });

  await test('Assistant A cannot create version via RPC', async () => {
    const { data, error } = await assistantA.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_idempotency_key: 'test-assistant-key',
      p_input_hash: 'test-assistant-hash'
    });
    if (error) return { passed: true };
    if (data && data.error && (data.error.includes('Sem permissão') || data.error.includes('Sem permissao'))) return { passed: true };
    return { passed: false, detail: 'Assistant not blocked: ' + JSON.stringify(data) };
  });

  await test('None user cannot create version via RPC', async () => {
    const { data, error } = await noneUser.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: {},
      p_calculation_result: {},
      p_calculation_memory: {},
      p_idempotency_key: 'test-none-key',
      p_input_hash: 'test-none-hash'
    });
    if (error) return { passed: true };
    if (data && data.error && (data.error.includes('Membro não encontrado') || data.error.includes('Membro nao encontrado'))) return { passed: true };
    return { passed: false, detail: 'None user not blocked: ' + JSON.stringify(data) };
  });

  // ========== IDEMPOTENCY ==========
  await test('Same key + same hash returns existing version', async () => {
    // First call already done above (test-perm-owner)
    const { data, error } = await ownerA.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_items: [{
        item_type: 'fee',
        description: 'Servico de teste',
        quantity: 1,
        unit_amount_cents: 1000,
        total_amount_cents: 1000,
        order_index: 0,
        metadata: { source: 'rls-test' }
      }],
      p_idempotency_key: 'test-perm-owner',
      p_input_hash: 'test-hash-perm-owner'
    });
    if (error) return { passed: false, detail: error.message };
    if (data && data.ok && data.idempotent === true) return { passed: true };
    return { passed: false, detail: 'Not idempotent: ' + JSON.stringify(data) };
  });

  await test('Same key + different hash returns conflict', async () => {
    const { data, error } = await ownerA.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_items: [{
        item_type: 'fee',
        description: 'Servico de teste',
        quantity: 1,
        unit_amount_cents: 1000,
        total_amount_cents: 1000,
        order_index: 0,
        metadata: { source: 'rls-test' }
      }],
      p_idempotency_key: 'test-perm-owner',
      p_input_hash: 'different-hash'
    });
    if (error) return { passed: true };
    if (data && data.error && data.error.includes('IDEMPOTENCY_KEY_REUSED')) return { passed: true };
    return { passed: false, detail: 'Conflict not detected: ' + JSON.stringify(data) };
  });

  await test('Different key + same hash creates new version', async () => {
    const { data, error } = await ownerA.rpc('create_pricing_scenario_version_idempotent', {
      p_scenario_id: scenarioAId,
      p_parameters: { feeType: 'fixed' },
      p_calculation_result: { totalAmountCents: 1000 },
      p_calculation_memory: { sections: [] },
      p_items: [{
        item_type: 'fee',
        description: 'Servico de teste',
        quantity: 1,
        unit_amount_cents: 1000,
        total_amount_cents: 1000,
        order_index: 0,
        metadata: { source: 'rls-test' }
      }],
      p_idempotency_key: 'test-perm-owner-2',
      p_input_hash: 'test-hash-perm-owner'
    });
    if (error) return { passed: false, detail: error.message };
    if (data && data.ok && !data.idempotent) return { passed: true };
    return { passed: false, detail: 'New version not created: ' + JSON.stringify(data) };
  });

  // Cleanup
  console.log('\n--- Cleanup ---');
  await adminClient.from('pricing_scenarios').delete().eq('id', scenarioAId);
  await adminClient.from('pricing_scenarios').delete().eq('id', scenarioBId);

  console.log('\n=== RLS + IDEMPOTENCY TEST RESULTS ===');
  for (const r of results) {
    console.log(`${r.status}: ${r.name} (${r.detail || '—'})`);
  }
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
