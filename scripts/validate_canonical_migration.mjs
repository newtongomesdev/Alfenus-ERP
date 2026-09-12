import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const port = Number(process.env.SUPABASE_DB_PORT ?? 54322);
const client = new Client({
  host: "127.0.0.1",
  port,
  user: process.env.SUPABASE_DB_USER ?? "postgres",
  password: process.env.SUPABASE_DB_PASSWORD ?? "postgres",
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
});

const compatibility = "select 1;";

const sql = fs.readFileSync(
  "supabase/migrations/20260726200000_alfenus_canonical_baseline.sql",
  "utf8",
);

await client.connect();
try {
  await client.query(compatibility);
  const existing = await client.query(`
    select to_regclass('public.law_firms') as law_firms,
           to_regtype('public.member_role') as member_role
  `);
  if (!existing.rows[0].law_firms || !existing.rows[0].member_role) {
    await client.query(sql);
  }
  const { rows } = await client.query(`
    select count(*)::int as tables
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  const { rows: solo } = await client.query(`
    select count(*)::int as tables
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('legal_area_templates','fee_proposals','receipts','follow_ups','intake_forms','professional_profiles','demo_data_records','operational_rules','operational_recommendations','recommendation_dismissals','recommendation_actions','recommendation_preferences','office_health_snapshots','setup_diagnostic','client_update_schedules')
  `);
  console.log(
    JSON.stringify({
      status: "ok",
      publicTables: rows[0].tables,
      soloTables: solo[0].tables,
    }),
  );
} finally {
  await client.end();
}
