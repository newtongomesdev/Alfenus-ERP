import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

export function readProjectEnv() {
  const values = {};
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return { ...values, ...process.env };
}

export function assertAllowedProposalsTestEnvironment(env = readProjectEnv()) {
  if (env.PROPOSALS_INTEGRATION_TESTS !== 'true') throw new Error('PROPOSALS_INTEGRATION_TESTS=true is required');
  if (env.PROPOSALS_TEST_ENV !== 'development') throw new Error('PROPOSALS_TEST_ENV=development is required');
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase URL, anon key and service role are required');
  const ref = new URL(url).hostname.split('.')[0];
  const allowed = new Set(['lmfjntuofpdjojcuybkl']);
  if (!allowed.has(ref)) throw new Error(`Supabase project is not allowed: ${ref.slice(0, 8)}`);
  return { ...env, ref };
}
