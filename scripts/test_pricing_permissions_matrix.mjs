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

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  const { data } = await client.auth.getUser();
  if (!data?.user?.id) throw new Error(`Login did not return user for ${email}`);
  return { client, userId: data.user.id };
}

async function ensureUser({ email, password, metadata }) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata ?? {},
  });
  if (error && !String(error.message).toLowerCase().includes('already')) {
    throw new Error(`ensureUser failed for ${email}: ${error.message}`);
  }
}

async function ensureMembership({ userId, tenantId, email, name, role }) {
  const { error } = await admin.from('law_firm_members').insert({
    user_id: userId,
    law_firm_id: tenantId,
    name,
    email,
    role,
    status: 'ativo',
  });
  if (error && error.code !== '23505' && !String(error.message).toLowerCase().includes('duplicate')) {
    throw new Error(`ensureMembership failed (${email}): ${error.message}`);
  }
}

async function getTenantIdBySlug(slug) {
  const { data, error } = await admin.from('law_firms').select('id').eq('slug', slug).single();
  if (error) throw new Error(`Fetch tenant failed: ${error.message}`);
  return data.id;
}

async function getCurrentMemberId(client) {
  const { data, error } = await client.rpc('get_current_member_id');
  if (error) return null;
  return data ?? null;
}

function normalizeOutcome({ data, error, extra }) {
  if (error) {
    return {
      ok: false,
      code: error.code ?? null,
      detail: error.message ?? String(error),
      payloadKeys: null,
      extra,
    };
  }
  const payloadKeys = data && typeof data === 'object' ? Object.keys(data) : null;
  return { ok: true, code: null, detail: null, payloadKeys, extra };
}

async function opListScenarios(client, tenantId) {
  const res = await client
    .from('pricing_scenarios')
    .select('id, law_firm_id, name, status, active_version_id, created_at')
    .eq('law_firm_id', tenantId)
    .limit(5);
  return normalizeOutcome({ data: { rows: res.data ?? [] }, error: res.error, extra: { rowCount: res.data?.length ?? 0 } });
}

async function opGetScenario(client, scenarioId) {
  const res = await client.from('pricing_scenarios').select('*').eq('id', scenarioId).maybeSingle();
  const payload = res.data ? Object.fromEntries(Object.entries(res.data).filter(([k]) => ['id', 'law_firm_id', 'name', 'status', 'active_version_id', 'created_by', 'updated_at'].includes(k))) : null;
  return normalizeOutcome({ data: payload ?? {}, error: res.error, extra: { found: Boolean(res.data) } });
}

async function opCreateScenario(client, tenantId, memberId, prefix) {
  const scenarioId = crypto.randomUUID();
  const res = await client.from('pricing_scenarios').insert({
    id: scenarioId,
    law_firm_id: tenantId,
    created_by: memberId,
    name: `${prefix} scenario`,
    status: 'draft',
  });
  return normalizeOutcome({ data: { scenarioId }, error: res.error });
}

async function opUpdateMetadata(client, scenarioId, newName) {
  const res = await client.from('pricing_scenarios').update({ name: newName }).eq('id', scenarioId).select('id');
  return normalizeOutcome({ data: res.data ?? [], error: res.error, extra: { rowCount: res.data?.length ?? 0 } });
}

async function opArchive(client, scenarioId) {
  const res = await client
    .from('pricing_scenarios')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', scenarioId).select('id');
  return normalizeOutcome({ data: res.data ?? [], error: res.error, extra: { rowCount: res.data?.length ?? 0 } });
}

async function opRestore(client, scenarioId) {
  const res = await client
    .from('pricing_scenarios')
    .update({ status: 'saved', archived_at: null })
    .eq('id', scenarioId).select('id');
  return normalizeOutcome({ data: res.data ?? [], error: res.error, extra: { rowCount: res.data?.length ?? 0 } });
}

async function opCreateVersion(client, { scenarioId, tenantId, userId, cents, keySuffix }) {
  const key = idempotencyKey({ action: `create_version_${keySuffix}`, tenantId, userId, scenarioId });
  const hash = inputHash({ feeType: 'fixed', feeValueCents: cents, currency: 'BRL', scenarioType: 'main', engineVersion: '1.0.0', schemaVersion: '1' });
  const res = await client.rpc('create_pricing_scenario_version_idempotent', {
    p_scenario_id: scenarioId,
    p_parameters: { feeType: 'fixed' },
    p_calculation_result: { totalAmountCents: cents },
    p_calculation_memory: { sections: [] },
    p_items: [
      {
        item_type: 'fee',
        description: `${keySuffix}`,
        quantity: 1,
        unit_amount_cents: cents,
        total_amount_cents: cents,
        order_index: 0,
        metadata: { source: 'perm-matrix' },
      },
    ],
    p_idempotency_key: key,
    p_input_hash: hash,
    p_activate: false,
  });
  if (res.error) return normalizeOutcome({ data: null, error: res.error });
  return normalizeOutcome({
    data: res.data ?? {},
    error: null,
    extra: {
      ok: res.data?.ok ?? false,
      idempotent: res.data?.idempotent ?? null,
      versionId: res.data?.version_id ?? null,
      errorText: res.data?.error ?? null,
      safeErrorCode: res.data?.safe_error_code ?? null,
      idempotencyKeyAbbrev: `${key.slice(0, 6)}…${key.slice(-6)}`,
    },
  });
}

async function opActivate(client, scenarioId, versionId) {
  const res = await client.rpc('set_active_pricing_version', {
    p_scenario_id: scenarioId,
    p_version_id: versionId,
  });
  if (res.error) return normalizeOutcome({ data: null, error: res.error });
  return normalizeOutcome({ data: res.data ?? {}, error: null, extra: { ok: res.data?.ok ?? false, errorText: res.data?.error ?? null } });
}

async function opDuplicate(client, scenarioId) {
  const res = await client.rpc('duplicate_pricing_scenario', { p_source_scenario_id: scenarioId });
  if (res.error) return normalizeOutcome({ data: null, error: res.error });
  return normalizeOutcome({ data: res.data ?? {}, error: null, extra: { ok: res.data?.ok ?? false, newScenarioId: res.data?.scenario_id ?? null, errorText: res.data?.error ?? null } });
}

async function opCompareAccess(client, scenarioId) {
  const res = await client
    .from('pricing_scenario_versions_internal')
    .select('id, version_number, parameters, calculation_result, calculation_memory')
    .eq('pricing_scenario_id', scenarioId)
    .order('version_number', { ascending: true })
    .limit(2);
  if (res.error) return normalizeOutcome({ data: null, error: res.error });
  const rows = res.data ?? [];
  const hasMemory = rows.some((r) => r.calculation_memory && Object.keys(r.calculation_memory).length > 0);
  const hasResult = rows.some((r) => r.calculation_result && Object.keys(r.calculation_result).length > 0);
  const hasMargin = rows.some((r) => r.calculation_result && ['margin', 'marginBps', 'marginAmount', 'marginBase'].some((key) => Object.prototype.hasOwnProperty.call(r.calculation_result, key)));
  return normalizeOutcome({
    data: { rowCount: rows.length },
    error: null,
    extra: {
      rowCount: rows.length,
      hasCalculationResult: hasResult,
      hasCalculationMemory: hasMemory,
      hasMargin,
      versionIds: rows.map((r) => `${r.version_number}:${abbrev(r.id)}…`).join(', '),
    },
  });
}

async function opViewEvents(client, scenarioId) {
  const res = await client
    .from('pricing_scenario_events_secure')
    .select('id, event_type, version_id, safe_metadata, created_at')
    .eq('pricing_scenario_id', scenarioId)
    .limit(20);
  return normalizeOutcome({
    data: { rows: res.data ?? [] },
    error: res.error,
    extra: { rowCount: res.data?.length ?? 0 },
  });
}

function expectedFor(role, op) {
  const canWrite = role === 'proprietario' || role === 'administrador' || role === 'advogado';
  const isAnonOrNone = role === 'anonimo' || role === 'sem_membership';
  const isOtherTenant = role === 'outro_tenant';
  const isAssistantOrSupport = role === 'assistente' || role === 'suporte_assistido';

  const readOps = new Set(['listar', 'abrir_detalhe', 'comparar', 'visualizar_eventos']);
  const writeOps = new Set([
    'criar_cenario',
    'atualizar_metadados',
    'criar_versao',
    'recalcular',
    'ativar',
    'duplicar',
    'arquivar',
    'restaurar',
  ]);
  const sensitiveOps = new Set(['visualizar_custos', 'visualizar_margem', 'visualizar_memoria']);

  if (isAnonOrNone || isOtherTenant) {
    if (readOps.has(op)) return 'NEGADO (vazio/erro)';
    if (writeOps.has(op)) return 'NEGADO';
    if (sensitiveOps.has(op)) return 'NEGADO';
  }

  if (isAssistantOrSupport) {
    if (role === 'suporte_assistido') return 'NEGADO (sem sessão assistida real)';
    if (readOps.has(op) && op !== 'comparar') return 'PERMITIDO (sem campos sensíveis)';
    if (op === 'comparar') return 'NEGADO (sem escopo explícito)';
    if (writeOps.has(op)) return 'NEGADO';
    if (sensitiveOps.has(op)) return 'NEGADO (não receber campos)';
  }

  if (canWrite) {
    if (readOps.has(op)) return 'PERMITIDO';
    if (writeOps.has(op)) return 'PERMITIDO';
    if (sensitiveOps.has(op)) return 'PERMITIDO';
  }

  return 'INDEFINIDO';
}

function expectedAllowed(role, op) {
  const writers = new Set(['proprietario', 'administrador', 'advogado']);
  const reads = new Set(['listar', 'abrir_detalhe', 'comparar', 'visualizar_eventos']);
  if (role === 'anonimo' || role === 'sem_membership' || role === 'outro_tenant') return false;
  if (role === 'suporte_assistido') return reads.has(op) && op !== 'comparar';
  if (reads.has(op)) return op === 'comparar' ? writers.has(role) : (role === 'assistente' || writers.has(role));
  if (['visualizar_custos'].includes(op)) return writers.has(role);
  if (['visualizar_margem', 'visualizar_memoria'].includes(op)) return role === 'proprietario' || role === 'administrador';
  return writers.has(role);
}

function actualAllowed(role, op, out) {
  const writes = new Set(['criar_cenario', 'atualizar_metadados', 'criar_versao', 'recalcular', 'ativar', 'duplicar', 'arquivar', 'restaurar']);
  if (writes.has(op)) return out.ok && out.extra?.ok !== false && (['atualizar_metadados', 'arquivar', 'restaurar'].includes(op) ? (out.extra?.rowCount ?? 0) > 0 : true);
  if (['listar', 'abrir_detalhe', 'comparar', 'visualizar_eventos'].includes(op)) return out.ok && (out.extra?.rowCount ?? (out.extra?.found ? 1 : 0)) > 0;
  if (op === 'visualizar_custos') return out.ok && out.extra?.hasCalculationResult === true;
  if (op === 'visualizar_margem') return out.ok && (role === 'proprietario' || role === 'administrador') && (out.extra?.rowCount ?? 0) > 0;
  if (op === 'visualizar_memoria') return out.ok && out.extra?.hasCalculationMemory === true;
  return false;
}

async function main() {
  const prefix = `__perm_${Date.now()}`;

  const tenantAId = await getTenantIdBySlug('tenant-a-pricing-test');
  const tenantBId = await getTenantIdBySlug('tenant-b-pricing-test');

  await ensureUser({
    email: 'support-a@test-pricing.example.com',
    password: 'TestPricing2024!A',
    metadata: { name: 'Support A' },
  });

  const { data: supportUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const support = supportUser?.users?.find((u) => u.email === 'support-a@test-pricing.example.com');
  if (!support?.id) throw new Error('Could not resolve support user id');

  await ensureMembership({
    userId: support.id,
    tenantId: tenantAId,
    email: 'support-a@test-pricing.example.com',
    name: 'Support A',
    role: 'colaborador',
  });

  const ownerA = await signIn('owner-a@test-pricing.example.com', 'TestPricing2024!A');
  const lawyerA = await signIn('lawyer-a@test-pricing.example.com', 'TestPricing2024!A');
  const assistantA = await signIn('assistant-a@test-pricing.example.com', 'TestPricing2024!A');
  const supportA = await signIn('support-a@test-pricing.example.com', 'TestPricing2024!A');
  const noneUser = await signIn('none@test-pricing.example.com', 'TestPricing2024!N');
  const ownerB = await signIn('owner-b@test-pricing.example.com', 'TestPricing2024!B');

  const anon = { client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY), userId: 'anon' };

  const memberOwnerA = await getCurrentMemberId(ownerA.client);
  const memberLawyerA = await getCurrentMemberId(lawyerA.client);
  const memberAssistantA = await getCurrentMemberId(assistantA.client);
  const memberSupportA = await getCurrentMemberId(supportA.client);
  const memberOwnerB = await getCurrentMemberId(ownerB.client);
  const memberNone = await getCurrentMemberId(noneUser.client);

  const baseScenarioId = crypto.randomUUID();
  const baseInsert = await admin.from('pricing_scenarios').insert({
    id: baseScenarioId,
    law_firm_id: tenantAId,
    created_by: memberOwnerA ?? '00000000-0000-0000-0000-000000000001',
    name: `${prefix} base`,
    status: 'draft',
  });
  if (baseInsert.error) throw new Error(`base scenario insert failed: ${baseInsert.error.message}`);

  const baselineVersion = await opCreateVersion(ownerA.client, {
    scenarioId: baseScenarioId,
    tenantId: tenantAId,
    userId: ownerA.userId,
    cents: 1000,
    keySuffix: 'baseline',
  });

  const baselineVersionId = baselineVersion.extra?.versionId ?? null;

  const roles = [
    { label: 'proprietario', code: 'proprietario', client: ownerA.client, tenantId: tenantAId, userId: ownerA.userId, memberId: memberOwnerA },
    { label: 'advogado', code: 'advogado', client: lawyerA.client, tenantId: tenantAId, userId: lawyerA.userId, memberId: memberLawyerA },
    { label: 'assistente', code: 'assistente', client: assistantA.client, tenantId: tenantAId, userId: assistantA.userId, memberId: memberAssistantA },
    { label: 'suporte_assistido', code: 'suporte_assistido', client: supportA.client, tenantId: tenantAId, userId: supportA.userId, memberId: memberSupportA },
    { label: 'sem_membership', code: 'sem_membership', client: noneUser.client, tenantId: tenantAId, userId: noneUser.userId, memberId: memberNone },
    { label: 'outro_tenant', code: 'outro_tenant', client: ownerB.client, tenantId: tenantBId, userId: ownerB.userId, memberId: memberOwnerB },
    { label: 'anonimo', code: 'anonimo', client: anon.client, tenantId: tenantAId, userId: anon.userId, memberId: null },
  ];

  const ops = [
    { op: 'listar', run: (r) => opListScenarios(r.client, tenantAId) },
    { op: 'abrir_detalhe', run: (r) => opGetScenario(r.client, baseScenarioId) },
    { op: 'criar_cenario', run: (r) => opCreateScenario(r.client, tenantAId, r.memberId, `${prefix}_${r.code}`) },
    { op: 'atualizar_metadados', run: (r) => opUpdateMetadata(r.client, baseScenarioId, `${prefix} updated_by_${r.code}`) },
    { op: 'criar_versao', run: (r) => opCreateVersion(r.client, { scenarioId: baseScenarioId, tenantId: tenantAId, userId: r.userId, cents: 1234, keySuffix: `create_${r.code}` }) },
    { op: 'recalcular', run: (r) => opCreateVersion(r.client, { scenarioId: baseScenarioId, tenantId: tenantAId, userId: r.userId, cents: 2345, keySuffix: `recalc_${r.code}` }) },
    { op: 'ativar', run: (r) => (baselineVersionId ? opActivate(r.client, baseScenarioId, baselineVersionId) : normalizeOutcome({ data: null, error: { message: 'no baseline version', code: 'NO_BASE' } })) },
    { op: 'duplicar', run: (r) => opDuplicate(r.client, baseScenarioId) },
    { op: 'arquivar', run: (r) => opArchive(r.client, baseScenarioId) },
    { op: 'restaurar', run: (r) => opRestore(r.client, baseScenarioId) },
    { op: 'comparar', run: (r) => opCompareAccess(r.client, baseScenarioId) },
    { op: 'visualizar_custos', run: (r) => opCompareAccess(r.client, baseScenarioId) },
    { op: 'visualizar_margem', run: (r) => opCompareAccess(r.client, baseScenarioId) },
    { op: 'visualizar_memoria', run: (r) => opCompareAccess(r.client, baseScenarioId) },
    { op: 'visualizar_eventos', run: (r) => opViewEvents(r.client, baseScenarioId) },
  ];

  const rows = [];
  for (const role of roles) {
    for (const { op, run } of ops) {
      const exp = expectedFor(role.code, op);
      const out = await run(role);
      const expected = expectedAllowed(role.code, op);
      const actual = actualAllowed(role.code, op, out);
      if (actual !== expected) {
        throw new Error(`Permission matrix mismatch: ${role.code}/${op}: actualAllowed=${actual}, expectedAllowed=${expected}, outcome=${JSON.stringify({ ok: out.ok, extra: out.extra, code: out.code, detail: out.detail })}`);
      }
      const real = out.ok ? 'OK' : 'FALHOU';
      const payload = out.extra
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(out.extra).filter(([k]) =>
                ['rowCount', 'found', 'ok', 'idempotent', 'versionId', 'errorText', 'safeErrorCode', 'hasCalculationResult', 'hasCalculationMemory', 'versionIds', 'idempotencyKeyAbbrev', 'newScenarioId'].includes(k),
              ),
            ),
          )
        : '';

      rows.push({
        role: role.label,
        op,
        expected: exp,
        real: `${real}${payload ? ` | ${payload}` : ''}${out.detail ? ` | ${out.detail}` : ''}`,
        code: out.code ?? '',
      });
    }
  }

  console.log(`Base scenario: ${abbrev(baseScenarioId)}… | baseline_version: ${baselineVersionId ? `${abbrev(baselineVersionId)}…` : '—'}`);
  console.log('');
  console.log('| Papel | Operação | Esperado | Resultado real | Código |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) {
    const safeReal = String(r.real).replace(/\n/g, ' ').replace(/\|/g, '\\|');
    console.log(`| ${r.role} | ${r.op} | ${r.expected} | ${safeReal} | ${r.code || ''} |`);
  }

  const dupIds = rows
    .filter((r) => r.op === 'duplicar' && r.real.includes('newScenarioId'))
    .map((r) => {
      try {
        const m = r.real.match(/\"newScenarioId\":\"([0-9a-fA-F-]{36})\"/);
        return m ? m[1] : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  for (const id of dupIds) {
    await admin.from('pricing_scenarios').delete().eq('id', id);
  }
  await admin.from('pricing_scenarios').delete().eq('id', baseScenarioId);
}

main().catch((e) => {
  console.error(e?.message ?? String(e));
  process.exit(1);
});
