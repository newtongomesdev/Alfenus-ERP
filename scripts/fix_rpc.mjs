import { Client } from 'pg';
import { readFileSync } from 'fs';

// Read .env.local
const envText = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// Use DATABASE_URL or construct from env vars
let connectionStr = process.env.DATABASE_URL;
if (!connectionStr) {
  const host = env.SUPABASE_HOST || 'aws-1-us-west-2.pooler.supabase.com';
  const port = env.SUPABASE_PORT || '5432';
  const database = env.SUPABASE_DATABASE || 'postgres';
  const user = env.SUPABASE_USER || 'postgres.lmfjntuofpdjojcuybkl';
  const password = env.SUPABASE_PASSWORD || '041052.11setembB';
  connectionStr = `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const c = new Client({
  connectionString: connectionStr,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  // Check current state first
  const before = await c.query(`SELECT p.oid, p.proname FROM pg_proc p WHERE p.proname = 'create_pricing_scenario_version_idempotent'`);
  console.log('Before:', before.rows.length, 'versions');
  for (const row of before.rows) {
    console.log('  OID:', row.oid);
  }

  // Drop ALL overloads of this function
  for (const row of before.rows) {
    await c.query(`DROP FUNCTION IF EXISTS public.create_pricing_scenario_version_idempotent(uuid, jsonb, jsonb, jsonb, text, text, pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean, timestamptz, jsonb) CASCADE`);
    await c.query(`DROP FUNCTION IF EXISTS public.create_pricing_scenario_version_idempotent(uuid, jsonb, jsonb, jsonb, text, text, pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean, timestamptz) CASCADE`);
    await c.query(`DROP FUNCTION IF EXISTS public.create_pricing_scenario_version_idempotent(uuid, jsonb, jsonb, jsonb, text, text, pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean) CASCADE`);
  }

  // Check after drop
  const after = await c.query(`SELECT p.oid FROM pg_proc p WHERE p.proname = 'create_pricing_scenario_version_idempotent'`);
  console.log('After drop:', after.rows.length, 'versions');

  if (after.rows.length > 0) {
    console.log('Still have old versions, using obliterative approach...');
    // Just force-drop all
    for (const row of after.rows) {
      const dropSQL = `DROP FUNCTION create_pricing_scenario_version_idempotent(${await c.query(`SELECT pg_get_function_identity_arguments(${row.oid})`).then(r => r.rows[0].pg_get_function_identity_arguments)})`;
      console.log('Dropping:', dropSQL);
      await c.query(dropSQL);
    }
  }

  // Verify empty
  const final = await c.query(`SELECT p.oid FROM pg_proc p WHERE p.proname = 'create_pricing_scenario_version_idempotent'`);
  console.log('After all drops:', final.rows.length, 'versions');

  if (final.rows.length === 0) {
    // Now create the correct version
    await c.query(`
      CREATE OR REPLACE FUNCTION public.create_pricing_scenario_version_idempotent(
        p_scenario_id UUID,
        p_parameters JSONB,
        p_calculation_result JSONB,
        p_calculation_memory JSONB,
        p_idempotency_key TEXT,
        p_input_hash TEXT,
        p_scenario_type public.pricing_scenario_type DEFAULT 'main',
        p_currency TEXT DEFAULT 'BRL',
        p_total_amount_cents BIGINT DEFAULT 0,
        p_entry_amount_cents BIGINT DEFAULT 0,
        p_financed_amount_cents BIGINT DEFAULT 0,
        p_installment_count INTEGER DEFAULT 0,
        p_success_fee_percentage_bps INTEGER DEFAULT 0,
        p_success_fee_base_cents BIGINT DEFAULT NULL,
        p_estimated_success_fee_cents BIGINT DEFAULT NULL,
        p_monthly_fee_cents BIGINT DEFAULT NULL,
        p_monthly_fee_count INTEGER DEFAULT NULL,
        p_activate BOOLEAN DEFAULT false,
        p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
        p_items JSONB DEFAULT '[]'::jsonb
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_member_id UUID;
        v_law_firm_id UUID;
        v_member_role public.member_role;
        v_scenario RECORD;
        v_new_version_id UUID;
        v_next_version INTEGER;
        v_existing RECORD;
        v_item JSONB;
      BEGIN
        SELECT m.id, m.law_firm_id, m.role INTO v_member_id, v_law_firm_id, v_member_role
        FROM public.law_firm_members m WHERE m.user_id = auth.uid() AND m.status = 'ativo' LIMIT 1;
        IF v_member_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Membro nao encontrado'); END IF;
        IF v_member_role NOT IN ('proprietario', 'administrador', 'advogado') THEN RETURN jsonb_build_object('ok', false, 'error', 'Sem permissao'); END IF;
        SELECT * INTO v_scenario FROM public.pricing_scenarios WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id FOR UPDATE;
        IF v_scenario IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Cenario nao encontrado'); END IF;
        IF v_scenario.status = 'archived' THEN RETURN jsonb_build_object('ok', false, 'error', 'Cenario arquivado'); END IF;
        IF p_expected_updated_at IS NOT NULL AND v_scenario.updated_at != p_expected_updated_at THEN RETURN jsonb_build_object('ok', false, 'error', 'Conflito de concorrencia'); END IF;

        SELECT * INTO v_existing FROM public.pricing_idempotency_operations
        WHERE law_firm_id = v_law_firm_id AND actor_id = v_member_id AND pricing_scenario_id = p_scenario_id AND operation_type = 'create_version' AND idempotency_key = p_idempotency_key;

        IF v_existing IS NOT NULL THEN
          IF v_existing.status = 'completed' THEN
            IF v_existing.input_hash = p_input_hash THEN
              RETURN jsonb_build_object('ok', true, 'version_id', v_existing.result_version_id, 'idempotent', true, 'message', 'Operacao ja processada');
            ELSE
              RETURN jsonb_build_object('ok', false, 'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT');
            END IF;
          ELSIF v_existing.status = 'processing' THEN
            RETURN jsonb_build_object('ok', false, 'error', 'Operacao em processamento');
          ELSIF v_existing.status = 'failed' THEN
            IF v_existing.input_hash = p_input_hash THEN
              UPDATE public.pricing_idempotency_operations SET status = 'processing', safe_error_code = NULL, completed_at = NULL, expires_at = now() + INTERVAL '24 hours' WHERE id = v_existing.id;
            ELSE
              RETURN jsonb_build_object('ok', false, 'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT');
            END IF;
          END IF;
        ELSE
          INSERT INTO public.pricing_idempotency_operations (law_firm_id, actor_id, pricing_scenario_id, operation_type, idempotency_key, input_hash, status)
          VALUES (v_law_firm_id, v_member_id, p_scenario_id, 'create_version', p_idempotency_key, p_input_hash, 'processing');
        END IF;

        SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version FROM public.pricing_scenario_versions WHERE pricing_scenario_id = p_scenario_id;

        INSERT INTO public.pricing_scenario_versions (
          law_firm_id, pricing_scenario_id, created_by, version_number, scenario_type,
          parameters, calculation_result, calculation_memory,
          currency, total_amount_cents, entry_amount_cents, financed_amount_cents, installment_count,
          success_fee_percentage_bps, success_fee_base_cents, estimated_success_fee_cents,
          monthly_fee_cents, monthly_fee_count
        ) VALUES (
          v_law_firm_id, p_scenario_id, v_member_id, v_next_version, p_scenario_type,
          p_parameters, p_calculation_result, p_calculation_memory,
          p_currency, p_total_amount_cents, p_entry_amount_cents, p_financed_amount_cents, p_installment_count,
          p_success_fee_percentage_bps, p_success_fee_base_cents, p_estimated_success_fee_cents,
          p_monthly_fee_cents, p_monthly_fee_count
        ) RETURNING id INTO v_new_version_id;

        IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
          FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            INSERT INTO public.pricing_scenario_items (
              law_firm_id, scenario_version_id, item_type, description,
              quantity, unit_amount_cents, total_amount_cents, order_index, metadata
            ) VALUES (
              v_law_firm_id, v_new_version_id,
              COALESCE(v_item->>'item_type', 'service'),
              COALESCE(v_item->>'description', 'Item'),
              COALESCE((v_item->>'quantity')::numeric, 1),
              COALESCE((v_item->>'unit_amount_cents')::bigint, 0),
              COALESCE((v_item->>'total_amount_cents')::bigint, 0),
              COALESCE((v_item->>'order_index')::int, 0),
              v_item->'metadata'
            );
          END LOOP;
        END IF;

        INSERT INTO public.pricing_scenario_events (law_firm_id, pricing_scenario_id, version_id, event_type, actor_id, safe_metadata)
        VALUES (v_law_firm_id, p_scenario_id, v_new_version_id, 'version_created', v_member_id, jsonb_build_object('version_number', v_next_version, 'idempotency_key', p_idempotency_key, 'item_count', jsonb_array_length(p_items)));

        IF p_activate THEN
          UPDATE public.pricing_scenarios SET active_version_id = v_new_version_id WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;
          INSERT INTO public.pricing_scenario_events (law_firm_id, pricing_scenario_id, version_id, event_type, actor_id, safe_metadata)
          VALUES (v_law_firm_id, p_scenario_id, v_new_version_id, 'version_activated', v_member_id, jsonb_build_object('version_number', v_next_version));
        END IF;

        UPDATE public.pricing_scenarios SET status = 'saved' WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id AND status = 'draft';

        UPDATE public.pricing_idempotency_operations SET status = 'completed', result_version_id = v_new_version_id, completed_at = now()
        WHERE law_firm_id = v_law_firm_id AND actor_id = v_member_id AND pricing_scenario_id = p_scenario_id AND operation_type = 'create_version' AND idempotency_key = p_idempotency_key AND status = 'processing';

        RETURN jsonb_build_object('ok', true, 'version_id', v_new_version_id, 'version_number', v_next_version, 'activated', p_activate, 'idempotent', false, 'item_count', jsonb_array_length(p_items));

      EXCEPTION WHEN OTHERS THEN
        UPDATE public.pricing_idempotency_operations SET status = 'failed', safe_error_code = SQLSTATE, completed_at = now()
        WHERE law_firm_id = v_law_firm_id AND actor_id = v_member_id AND pricing_scenario_id = p_scenario_id AND operation_type = 'create_version' AND idempotency_key = p_idempotency_key AND status = 'processing';
        RETURN jsonb_build_object('ok', false, 'error', 'Erro interno ao criar versao', 'safe_error_code', SQLSTATE);
      END;
      $$
    `);
    console.log('Created new RPC with p_items support');
  }

  // Final verification
  const finalVerify = await c.query(`SELECT p.oid FROM pg_proc p WHERE p.proname = 'create_pricing_scenario_version_idempotent'`);
  console.log('Final count:', finalVerify.rows.length, 'versions');

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });