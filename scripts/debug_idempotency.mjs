import { Client } from 'pg';
import { readFileSync } from 'fs';

const envText = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const c = new Client({
  connectionString: `postgresql://postgres.lmfjntuofpdjojcuybkl:041052.11setembB@aws-1-us-west-2.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  
  // Check RPC exists
  const rpcs = await c.query(`SELECT p.proname, p.oid FROM pg_proc p WHERE p.proname = 'create_pricing_scenario_version_idempotent'`);
  console.log('RPC versions:', rpcs.rows.length);
  for (const row of rpcs.rows) {
    console.log('  OID:', row.oid, 'Name:', row.proname);
  }

  // Check idempotency table
  const ops = await c.query(`SELECT * FROM pricing_idempotency_operations ORDER BY created_at DESC LIMIT 20`);
  console.log('\nIdempotency operations (last 20):');
  for (const row of ops.rows) {
    console.log('  Key:', row.idempotency_key, 'Status:', row.status, 'Hash:', row.input_hash, 'Scenario:', row.pricing_scenario_id);
  }

  // Check if the RPC function body is correct
  const rpcBody = await c.query(`SELECT prosrc FROM pg_proc WHERE proname = 'create_pricing_scenario_version_idempotent'`);
  const sql = rpcBody.rows[0]?.prosrc || '';
  console.log('\nRPC body length:', sql.length);
  console.log('Has p_items?', sql.includes('p_items'));
  console.log('Has idempotency lookup?', sql.includes('v_existing'));
  console.log('Has IDMEMPOTENCY_KEY_REUSED?', sql.includes('IDEMPOTENCY_KEY_REUSED'));
  console.log('Has NullPointerException?', sql.includes('Sem permissão'));
  console.log('Has Sem permissao?', sql.includes('Sem permissao'));

  // Check unique constraints on idempotency table
  const indexes = await c.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'pricing_idempotency_operations'
  `);
  console.log('\nIdempotency indexes:');
  for (const idx of indexes.rows) {
    console.log('  ', idx.indexname, ':', idx.indexdef);
  }

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });