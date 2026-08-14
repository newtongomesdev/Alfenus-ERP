import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const client = new Client({
  host: "127.0.0.1",
  port: 55432,
  user: "supabase_admin",
  password: "test",
  database: "postgres",
});

const compatibility = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
grant usage, create on schema auth, storage to postgres;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id uuid);
alter table storage.buckets add column if not exists public boolean;
`;

const sql = fs.readFileSync("supabase/migrations/20260726200000_alfenus_canonical_baseline.sql", "utf8");

await client.connect();
try {
  await client.query(compatibility);
  await client.query(sql);
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
  console.log(JSON.stringify({ status: "ok", publicTables: rows[0].tables, soloTables: solo[0].tables }));
} finally {
  await client.end();
}
