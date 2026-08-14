import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  await pg.connect();

  const tenantA = await pg.query("INSERT INTO public.law_firms (name, slug) VALUES ('Tenant A Pricing Test', 'tenant-a-pricing-test') RETURNING id");
  const tenantB = await pg.query("INSERT INTO public.law_firms (name, slug) VALUES ('Tenant B Pricing Test', 'tenant-b-pricing-test') RETURNING id");

  console.log('Tenant A:', tenantA.rows[0].id);
  console.log('Tenant B:', tenantB.rows[0].id);

  const testUsers = [
    { email: 'owner-a@test-pricing.example.com', password: 'TestPricing2024!A', role: 'proprietario', tenantId: tenantA.rows[0].id, name: 'Owner A' },
    { email: 'lawyer-a@test-pricing.example.com', password: 'TestPricing2024!A', role: 'advogado', tenantId: tenantA.rows[0].id, name: 'Lawyer A' },
    { email: 'assistant-a@test-pricing.example.com', password: 'TestPricing2024!A', role: 'assistente', tenantId: tenantA.rows[0].id, name: 'Assistant A' },
    { email: 'owner-b@test-pricing.example.com', password: 'TestPricing2024!B', role: 'proprietario', tenantId: tenantB.rows[0].id, name: 'Owner B' },
    { email: 'none@test-pricing.example.com', password: 'TestPricing2024!N', role: null, tenantId: null, name: 'No Membership' },
  ];

  const users = [];
  for (const u of testUsers) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name }
    });
    if (error) {
      console.error('Error creating user:', u.email, error.message);
      continue;
    }
    console.log('Created user:', u.email, data.user.id);

    if (u.tenantId) {
      await pg.query(
        "INSERT INTO public.law_firm_members (user_id, law_firm_id, name, email, role, status) VALUES ($1, $2, $3, $4, $5, 'ativo') ON CONFLICT (user_id, law_firm_id) DO NOTHING",
        [data.user.id, u.tenantId, u.name, u.email, u.role]
      );
    }
    users.push({ email: u.email, password: u.password, userId: data.user.id, tenantId: u.tenantId, role: u.role });
  }

  // Get JWTs using anon client
  console.log('\n--- JWTs ---');
  for (const u of users) {
    const { data: sessionData, error } = await anonClient.auth.signInWithPassword({
      email: u.email,
      password: u.password
    });
    if (error) {
      console.error('Login failed:', u.email, error.message);
      continue;
    }
    const token = sessionData.session?.access_token;
    console.log(`${u.email} | role=${u.role || 'none'} | tenant=${u.tenantId || 'none'} | token=${token ? token.substring(0, 20) + '...' : 'cannot get'}`);
  }

  console.log('\n--- Test Users Summary ---');
  for (const u of users) {
    console.log(`${u.email} | role=${u.role || 'none'} | tenant=${u.tenantId || 'none'}`);
  }

  await pg.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });