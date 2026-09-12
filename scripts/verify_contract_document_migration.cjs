const { Client } = require("pg");
const client = new Client({ connectionString: process.env.SUPABASE_DB_URL || "postgresql://postgres.lmfjntuofpdjojcuybkl:041052.11setembB@aws-1-us-west-2.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  for (const sql of [
    "select version,name from supabase_migrations.schema_migrations where version='20260731220000'",
    "select table_name from information_schema.tables where table_schema='public' and table_name in ('contract_documents','contract_document_operations') order by table_name",
    "select id,name,public from storage.buckets where id='documents'",
  ]) console.log(JSON.stringify((await client.query(sql)).rows));
  await client.end();
})().catch(async (error) => { console.error(error); await client.end(); process.exit(1); });
